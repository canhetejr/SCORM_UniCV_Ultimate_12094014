import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { VitrineSource } from "@prisma/client";
import { vimeoGet, isVimeoApiError } from "../services/vimeo.js";
import type { VimeoApiError } from "../services/vimeo.js";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

const VIMEO_SYNC_TIMEOUT_MS = 15000;

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: { code: string; message: string } };

function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

function err(code: string, message: string): ApiErr {
  return { ok: false, error: { code, message } };
}

/** Normaliza vimeoUserId: "123", "user123", "/users/123" -> id numérico (string). */
function normalizeVimeoUserId(raw: string): string {
  const s = String(raw ?? "").trim();
  const fromPath = s.replace(/^\/users\//i, "").trim();
  const digits = fromPath.replace(/\D/g, "");
  return digits.length > 0 ? digits : s || "";
}

function toClientMessage(code: string): string {
  const map: Record<string, string> = {
    vimeo_auth_failed: "Vimeo desconectado. Refazer conexão.",
    vimeo_not_found: "Recurso não encontrado no Vimeo.",
    vimeo_rate_limited: "Limite do Vimeo atingido. Tente novamente em alguns minutos.",
    vimeo_invalid_input: "Pedido inválido para o Vimeo.",
    invalid_input: "Dados inválidos.",
    not_found: "Não encontrado."
  };
  return map[code] ?? "Erro interno. Tente novamente.";
}

async function sendApiError(
  e: unknown,
  reply: FastifyReply,
  code = "invalid_input"
): Promise<FastifyReply> {
  const message = isVimeoApiError(e)
    ? (e as VimeoApiError).message
    : e instanceof Error
      ? e.message
      : toClientMessage(code);
  const finalCode = isVimeoApiError(e) ? (e as VimeoApiError).code : code;
  reply.log.info({ err: e, code: finalCode }, "Admin Vimeo Collaborators error");
  const status =
    finalCode === "vimeo_rate_limited" ? 429 : finalCode === "vimeo_auth_failed" ? 401 : finalCode === "not_found" ? 404 : 502;
  return reply.status(status).send(err(finalCode, message));
}

const adminVimeoCollaboratorsRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

  /** A) POST /admin/vimeo-collaborators — upsert colaborador por vimeoUserId */
  app.post<{ Body: { vimeoUserId: string; label?: string } }>("/", async (req, reply) => {
    const body = req.body || {};
    const raw = body.vimeoUserId ?? "";
    const vimeoUserId = normalizeVimeoUserId(raw);
    if (!vimeoUserId) {
      return reply.status(400).send(err("invalid_input", "vimeoUserId é obrigatório (ex: 123, user123, /users/123)."));
    }
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 200) : null;
    try {
      const collaborator = await prisma.vimeoCollaborator.upsert({
        where: { vimeoUserId },
        update: { label: label ?? undefined, updatedAt: new Date() },
        create: { vimeoUserId, label }
      });
      return reply.send(ok({ collaborator }));
    } catch (e) {
      return sendApiError(e, reply);
    }
  });

  /** B) GET /admin/vimeo-collaborators — lista colaboradores (sem segredos) */
  app.get("/", async (_req, reply) => {
    try {
      const collaborators = await prisma.vimeoCollaborator.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          vimeoUserId: true,
          label: true,
          createdAt: true,
          updatedAt: true,
          lastSyncAt: true,
          lastSyncMsg: true,
          _count: { select: { showcases: true } }
        }
      });
      const data = collaborators.map((c) => {
        const { _count, ...rest } = c;
        return { ...rest, showcaseCount: _count.showcases };
      });
      return reply.send(ok({ collaborators: data }));
    } catch (e) {
      return sendApiError(e, reply);
    }
  });

  /** C) DELETE /admin/vimeo-collaborators/:id */
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = String((req.params as { id?: string }).id ?? "").trim();
    if (!id) return reply.status(400).send(err("invalid_input", "id é obrigatório."));
    try {
      await prisma.vimeoCollaborator.delete({ where: { id } });
      return reply.send(ok({ deleted: true }));
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2025") {
        return reply.status(404).send(err("not_found", "Colaborador não encontrado."));
      }
      return sendApiError(e, reply);
    }
  });

  /** D) POST /admin/vimeo-collaborators/:id/sync — sync FULL vitrines do Vimeo para o cache */
  app.post<{ Params: { id: string } }>("/:id/sync", async (req, reply) => {
    const id = String((req.params as { id?: string }).id ?? "").trim();
    if (!id) return reply.status(400).send(err("invalid_input", "id é obrigatório."));
    const collaborator = await prisma.vimeoCollaborator.findUnique({ where: { id } });
    if (!collaborator) {
      return reply.status(404).send(err("not_found", "Colaborador não encontrado."));
    }
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) {
      return reply.status(401).send(err("vimeo_auth_failed", "Conecte o Vimeo primeiro."));
    }
    type AlbumItem = {
      uri: string;
      name?: string | null;
      description?: string | null;
      created_time?: string | null;
      modified_time?: string | null;
      pictures?: { sizes?: Array<{ width?: number; link?: string }> } | null;
      metadata?: { connections?: { videos?: { total?: number } } };
    };
    type Res = { data: AlbumItem[]; paging?: { next?: string | null } };
    const all: AlbumItem[] = [];
    let page = 1;
    const perPage = 100;
    const maxPages = 500;
    let lastError: unknown = null;
    let totalFetched = 0;

    while (page <= maxPages) {
      try {
        const data = await vimeoGet<Res>({
          accessToken: conn.accessToken,
          path: `/users/${collaborator.vimeoUserId}/albums`,
          query: { per_page: String(perPage), page: String(page), sort: "date", direction: "desc" },
          timeoutMs: VIMEO_SYNC_TIMEOUT_MS
        });
        if (data.data?.length) {
          all.push(...data.data);
          totalFetched += data.data.length;
        }
        if (!data.data?.length || data.data.length < perPage || !data.paging?.next) break;
        page++;
      } catch (e: unknown) {
        lastError = e;
        if (isVimeoApiError(e) && (e as VimeoApiError).status === 429 && (e as VimeoApiError).retryAfter) {
          const sec = (e as VimeoApiError).retryAfter!;
          reply.log.info({ retryAfter: sec }, "Vimeo 429, waiting before retry");
          await new Promise((r) => setTimeout(r, Math.min(sec, 120) * 1000));
          continue;
        }
        break;
      }
    }

    if (lastError && all.length === 0) {
      return sendApiError(lastError, reply, "vimeo_unknown");
    }

    let upserted = 0;
    const now = new Date();
    for (const a of all) {
      const vimeoShowcaseId = (a.uri.match(/\/albums\/(\d+)/) || [])[1] || a.uri;
      const modifiedTime = a.modified_time ? new Date(a.modified_time) : null;
      const totalVideos = a.metadata?.connections?.videos?.total ?? null;
      await prisma.vimeoCollaboratorShowcase.upsert({
        where: {
          collaboratorId_vimeoShowcaseId: { collaboratorId: id, vimeoShowcaseId }
        },
        update: {
          name: a.name ?? undefined,
          description: a.description ?? undefined,
          totalVideos,
          modifiedTime,
          pictures: a.pictures ?? undefined,
          raw: a as unknown as object,
          lastFetchedAt: now,
          updatedAt: now
        },
        create: {
          collaboratorId: id,
          vimeoShowcaseId,
          name: a.name ?? undefined,
          description: a.description ?? undefined,
          totalVideos,
          modifiedTime,
          pictures: a.pictures ?? undefined,
          raw: a as unknown as object,
          lastFetchedAt: now
        }
      });
      upserted++;
    }

    await prisma.vimeoCollaborator.update({
      where: { id },
      data: {
        lastSyncAt: now,
        lastSyncMsg: lastError ? "Sync parcial (erro ao listar todas as páginas)." : null
      }
    });

    return reply.send(
      ok({
        totalFetched: all.length,
        upserted,
        message: lastError && all.length === 0 ? undefined : "Sincronização concluída."
      })
    );
  });

  /** E) GET /admin/vimeo-collaborators/:id/showcases?page=1&perPage=12&q= — listagem paginada do banco */
  app.get<{
    Params: { id: string };
    Querystring: { page?: string; perPage?: string; q?: string };
  }>("/:id/showcases", async (req, reply) => {
    const id = String((req.params as { id?: string }).id ?? "").trim();
    if (!id) return reply.status(400).send(err("invalid_input", "id é obrigatório."));
    const page = Math.max(1, parseInt(String((req.query as { page?: string }).page ?? "1"), 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(String((req.query as { perPage?: string }).perPage ?? "12"), 10) || 12));
    const q = String((req.query as { q?: string }).q ?? "").trim().toLowerCase();

    const collaborator = await prisma.vimeoCollaborator.findUnique({ where: { id } });
    if (!collaborator) {
      return reply.status(404).send(err("not_found", "Colaborador não encontrado."));
    }

    const where: { collaboratorId: string; OR?: Array<{ name?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" }; vimeoShowcaseId?: { contains: string; mode: "insensitive" } }> } = {
      collaboratorId: id
    };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { vimeoShowcaseId: { contains: q, mode: "insensitive" } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.vimeoCollaboratorShowcase.findMany({
        where,
        orderBy: [{ modifiedTime: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage
      }),
      prisma.vimeoCollaboratorShowcase.count({ where })
    ]);

    return reply.send(
      ok({
        items,
        page,
        perPage,
        total
      })
    );
  });

  /** F) POST /admin/vimeo-collaborators/:id/showcases/:vimeoShowcaseId/link — cria ou localiza Vitrine do Studio, retorna vitrineId */
  app.post<{ Params: { id: string; vimeoShowcaseId: string } }>(
    "/:id/showcases/:vimeoShowcaseId/link",
    async (req, reply) => {
      const collabId = String((req.params as { id?: string }).id ?? "").trim();
      const vimeoShowcaseId = String((req.params as { vimeoShowcaseId?: string }).vimeoShowcaseId ?? "")
        .trim()
        .replace(/\D/g, "");
      if (!collabId) return reply.status(400).send(err("invalid_input", "id do colaborador é obrigatório."));
      if (!vimeoShowcaseId) return reply.status(400).send(err("invalid_input", "vimeoShowcaseId é obrigatório."));

      const collaborator = await prisma.vimeoCollaborator.findUnique({ where: { id: collabId } });
      if (!collaborator) {
        return reply.status(404).send(err("not_found", "Colaborador não encontrado."));
      }

      const cached = await prisma.vimeoCollaboratorShowcase.findUnique({
        where: {
          collaboratorId_vimeoShowcaseId: { collaboratorId: collabId, vimeoShowcaseId }
        }
      });
      const accountId = await deps.getDefaultAccountId();
      let vitrine = await prisma.vitrine.findFirst({
        where: { accountId, vimeoShowcaseId }
      });
      if (!vitrine) {
        const title = (cached?.name ?? `Showcase ${vimeoShowcaseId}`).slice(0, 500);
        const description = cached?.description?.slice(0, 2000) ?? null;
        vitrine = await prisma.vitrine.create({
          data: {
            accountId,
            title,
            description,
            vimeoShowcaseId,
            vimeoSource: VitrineSource.VIMEO_SHOWCASE
          }
        });
      }
      return reply.send(ok({ vitrineId: vitrine.id }));
    }
  );
};

export default adminVimeoCollaboratorsRoutes;
