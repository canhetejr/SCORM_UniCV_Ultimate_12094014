import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { VitrineStatus } from "@prisma/client";
import { vimeoGet, vimeoPut, vimeoDelete, isVimeoApiError } from "./vimeo.service.js";
import { prisma } from "../../db.js";
import type { ServerDeps } from "../../routes/deps.js";

const SHOWCASE_ID_MAX = 50;
const VIDEO_ID_OR_URI_MAX = 500;
const VITRINE_ID_MAX = 200;

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: { code: string; message: string } };

function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

function err(code: string, message: string): ApiErr {
  return { ok: false, error: { code, message } };
}

function validateShowcaseId(raw: string): { valid: true; id: string } | { valid: false; error: ApiErr } {
  const s = String(raw ?? "").trim().slice(0, SHOWCASE_ID_MAX);
  if (!s) return { valid: false, error: err("invalid_input", "showcaseId é obrigatório.") };
  if (!/^\d+$/.test(s)) return { valid: false, error: err("invalid_input", "showcaseId deve conter apenas dígitos.") };
  return { valid: true, id: s };
}

function validateVitrineId(raw: string): { valid: true; id: string } | { valid: false; error: ApiErr } {
  const s = String(raw ?? "").trim().slice(0, VITRINE_ID_MAX);
  if (!s) return { valid: false, error: err("invalid_input", "ID da vitrine é obrigatório.") };
  return { valid: true, id: s };
}

function validateVideoIdOrUri(raw: string): { valid: true; id: string } | { valid: false; error: ApiErr } {
  const s = String(raw ?? "").trim().slice(0, VIDEO_ID_OR_URI_MAX);
  if (!s) return { valid: false, error: err("invalid_input", "videoIdOrUri é obrigatório (ID ou URL Vimeo).") };
  const numeric = /^\d+$/.test(s) ? s : (s.match(/vimeo\.com\/(?:video\/)?(\d+)/i) || [])[1] || s.replace(/\D/g, "");
  if (!numeric) return { valid: false, error: err("invalid_input", "videoIdOrUri inválido (ID ou URL Vimeo).") };
  return { valid: true, id: numeric };
}

function toNormalizedCode(e: { status?: number; code?: string }): string {
  if (isVimeoApiError(e)) {
    const c = e.code;
    if (c === "vimeo_auth_failed" || c === "vimeo_not_found" || c === "vimeo_rate_limited" || c === "vimeo_invalid_input" || c === "vimeo_unknown") return c;
    if (e.status === 401 || e.status === 403) return "vimeo_auth_failed";
    if (e.status === 404) return "vimeo_not_found";
    if (e.status === 429) return "vimeo_rate_limited";
    if (e.status >= 400 && e.status < 500) return "vimeo_invalid_input";
    return "vimeo_unknown";
  }
  return "vimeo_unknown";
}

function toClientMessage(code: string): string {
  const map: Record<string, string> = {
    vimeo_auth_failed: "Vimeo desconectado. Refazer conexão.",
    vimeo_not_found: "Recurso não encontrado no Vimeo.",
    vimeo_rate_limited: "Limite do Vimeo atingido. Tente novamente em alguns minutos.",
    vimeo_invalid_input: "Pedido inválido para o Vimeo.",
    vimeo_unknown: "Erro ao contactar o Vimeo. Tente novamente."
  };
  return map[code] ?? map.vimeo_unknown;
}

async function sendApiError(
  e: unknown,
  reply: FastifyReply,
  log: FastifyReply["log"]
): Promise<FastifyReply> {
  const code = toNormalizedCode(e as { status?: number; code?: string });
  const message = toClientMessage(code);
  if (isVimeoApiError(e)) {
    log.info({ err: e, code, status: e.status }, "Vimeo API error (details not sent to client)");
  } else {
    const msg = e instanceof Error ? e.message : String(e);
    log.info({ err: msg, code }, "Vimeo request error (details not sent to client)");
  }
  const status = code === "vimeo_rate_limited" ? 429 : code === "vimeo_auth_failed" ? 401 : 502;
  return reply.status(status).send(err(code, message));
}

const adminVimeoRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

  app.get("/ping", async (_req, reply) => {
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) {
      return reply.status(200).send(ok({ ok: false, message: "Vimeo não conectado." }));
    }
    try {
      await vimeoGet<{ uri?: string }>({ accessToken: conn.accessToken, path: "/me" });
      return reply.send(ok({ ok: true, message: "Conexão Vimeo OK." }));
    } catch (e: unknown) {
      return sendApiError(e, reply, reply.log);
    }
  });

  /** GET /admin/vimeo/users/:userId/showcases — lista vitrines/albums de um usuário Vimeo (paginação interna). */
  app.get("/users/:userId/showcases", async (req, reply) => {
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) {
      return reply.status(401).send(err("vimeo_auth_failed", "Conecte o Vimeo primeiro."));
    }
    const raw = String((req.params as { userId?: string }).userId ?? "").trim();
    const userId = raw.replace(/^\/users\//i, "").replace(/\D/g, "") || raw;
    if (!userId) {
      return reply.status(400).send(err("invalid_input", "userId é obrigatório (ex: 123 ou /users/123)."));
    }
    try {
      type AlbumItem = {
        uri: string;
        name: string;
        description?: string | null;
        created_time?: string | null;
        modified_time?: string | null;
        pictures?: { sizes?: Array<{ width?: number; link?: string }> };
        metadata?: { connections?: { videos?: { total?: number } } };
      };
      type Res = { data: AlbumItem[]; paging?: { next?: string | null } };
      const all: AlbumItem[] = [];
      let page = 1;
      const perPage = 100;
      for (;;) {
        const data = await vimeoGet<Res>({
          accessToken: conn.accessToken,
          path: `/users/${userId}/albums`,
          query: { per_page: String(perPage), page: String(page), sort: "date", direction: "desc" }
        });
        if (data.data?.length) all.push(...data.data);
        if (!data.data?.length || data.data.length < perPage || !data.paging?.next) break;
        page++;
      }
      const showcases = all.map((a) => {
        const id = (a.uri.match(/\/albums\/(\d+)/) || [])[1] || a.uri;
        const totalVideos = a.metadata?.connections?.videos?.total ?? null;
        return {
          id,
          name: a.name ?? null,
          uri: a.uri ?? null,
          totalVideos,
          pictures: a.pictures ?? null,
          modifiedTime: a.modified_time ?? null
        };
      });
      return reply.send(ok({ showcases }));
    } catch (e: unknown) {
      return sendApiError(e, reply, reply.log);
    }
  });

  app.get("/showcases", async (_req, reply) => {
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) {
      return reply.status(401).send(err("vimeo_auth_failed", "Conecte o Vimeo primeiro."));
    }
    try {
      const data = await vimeoGet<{
        data: Array<{ uri: string; name: string; description?: string | null; created_time?: string }>;
      }>({
        accessToken: conn.accessToken,
        path: "/me/albums",
        query: { per_page: "50", sort: "date", direction: "desc" }
      });
      const showcases = data.data.map((a) => {
        const id = (a.uri.match(/\/albums\/(\d+)/) || [])[1] || a.uri;
        return { id, name: a.name, description: a.description || "", createdAt: a.created_time || null };
      });
      return reply.send(ok({ showcases }));
    } catch (e: unknown) {
      return sendApiError(e, reply, reply.log);
    }
  });

  app.get("/showcases/:id/videos", async (req, reply) => {
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) {
      return reply.status(401).send(err("vimeo_auth_failed", "Conecte o Vimeo primeiro."));
    }
    const parsed = validateShowcaseId((req.params as { id?: string }).id || "");
    if (!parsed.valid) return reply.status(400).send(parsed.error);
    try {
      const data = await vimeoGet<{
        data: Array<{ uri: string; name: string }>;
      }>({
        accessToken: conn.accessToken,
        path: `/me/albums/${encodeURIComponent(parsed.id)}/videos`,
        query: { per_page: "100" }
      });
      const videos = data.data.map((v) => {
        const videoId = (v.uri.match(/\/videos\/(\d+)/) || [])[1] || v.uri;
        return { id: videoId, title: v.name };
      });
      return reply.send(ok({ videos }));
    } catch (e: unknown) {
      return sendApiError(e, reply, reply.log);
    }
  });

  app.post("/showcases/:id/videos", async (req, reply) => {
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) {
      return reply.status(401).send(err("vimeo_auth_failed", "Conecte o Vimeo primeiro."));
    }
    const parsed = validateShowcaseId((req.params as { id?: string }).id || "");
    if (!parsed.valid) return reply.status(400).send(parsed.error);
    const body = (req.body || {}) as { videoIdOrUri?: string };
    const videoParsed = validateVideoIdOrUri(body.videoIdOrUri ?? "");
    if (!videoParsed.valid) return reply.status(400).send(videoParsed.error);
    try {
      await vimeoPut({
        accessToken: conn.accessToken,
        path: `/me/albums/${encodeURIComponent(parsed.id)}/videos/${encodeURIComponent(videoParsed.id)}`
      });
      return reply.send(ok({ message: "Vídeo adicionado." }));
    } catch (e: unknown) {
      return sendApiError(e, reply, reply.log);
    }
  });

  app.delete("/showcases/:id/videos/:videoId", async (req, reply) => {
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) {
      return reply.status(401).send(err("vimeo_auth_failed", "Conecte o Vimeo primeiro."));
    }
    const idParsed = validateShowcaseId((req.params as { id?: string }).id || "");
    const videoParsed = validateShowcaseId((req.params as { videoId?: string }).videoId || "");
    if (!idParsed.valid) return reply.status(400).send(idParsed.error);
    if (!videoParsed.valid) return reply.status(400).send(videoParsed.error);
    try {
      await vimeoDelete({
        accessToken: conn.accessToken,
        path: `/me/albums/${encodeURIComponent(idParsed.id)}/videos/${encodeURIComponent(videoParsed.id)}`
      });
      return reply.send(ok({ message: "Vídeo removido." }));
    } catch (e: unknown) {
      return sendApiError(e, reply, reply.log);
    }
  });

  app.get("/vitrines/:id/export", async (req, reply) => {
    const parsed = validateVitrineId((req.params as { id?: string }).id || "");
    if (!parsed.valid) return reply.status(400).send(parsed.error);
    const vitrine = await prisma.vitrine.findFirst({
      where: { id: parsed.id },
      include: {
        videos: {
          orderBy: { position: "asc" },
          include: {
            video: {
              select: {
                id: true,
                vimeoVideoId: true,
                title: true,
                thumbnailUrl: true,
                durationSec: true,
                embedHash: true,
                playerUrl: true
              }
            }
          }
        }
      }
    });
    if (!vitrine) {
      return reply.status(404).send(err("vimeo_not_found", "Vitrine não encontrada."));
    }
    const payload = {
      id: vitrine.id,
      title: vitrine.title,
      description: vitrine.description,
      status: vitrine.status,
      vimeoShowcaseId: vitrine.vimeoShowcaseId,
      createdAt: vitrine.createdAt,
      updatedAt: vitrine.updatedAt,
      videos: vitrine.videos.map((vv) => ({ position: vv.position, ...vv.video }))
    };
    return reply.send(ok(payload));
  });

  app.get("/showcases/:id/export", async (req, reply) => {
    const parsed = validateShowcaseId((req.params as { id?: string }).id || "");
    if (!parsed.valid) return reply.status(400).send(parsed.error);
    const vitrine = await prisma.vitrine.findFirst({
      where: { vimeoShowcaseId: parsed.id },
      include: {
        videos: {
          orderBy: { position: "asc" },
          include: {
            video: {
              select: {
                id: true,
                vimeoVideoId: true,
                title: true,
                thumbnailUrl: true,
                durationSec: true,
                embedHash: true,
                playerUrl: true
              }
            }
          }
        }
      }
    });
    if (!vitrine) {
      return reply.status(404).send(err("vimeo_not_found", "Vitrine não encontrada para este showcase."));
    }
    const payload = {
      id: vitrine.id,
      title: vitrine.title,
      description: vitrine.description,
      status: vitrine.status,
      vimeoShowcaseId: vitrine.vimeoShowcaseId,
      createdAt: vitrine.createdAt,
      updatedAt: vitrine.updatedAt,
      videos: vitrine.videos.map((vv) => ({ position: vv.position, ...vv.video }))
    };
    return reply.send(ok(payload));
  });

  app.post("/showcases/import", async (req, reply) => {
    const body = (req.body || {}) as { json?: unknown };
    const json = body.json;
    if (json == null || typeof json !== "object") {
      return reply.status(400).send(err("invalid_input", "Campo json é obrigatório (objeto)."));
    }
    const accountId = await deps.getDefaultAccountId();
    const obj = json as { id?: string; title?: string; description?: string; status?: string; vimeoShowcaseId?: string; videos?: Array<{ vimeoVideoId: string; title?: string; position?: number }> };
    const title = String(obj.title ?? "Importado").trim().slice(0, 500) || "Importado";
    const vitrineId = typeof obj.id === "string" ? obj.id.trim().slice(0, 200) : undefined;
    const vimeoShowcaseId = typeof obj.vimeoShowcaseId === "string" ? obj.vimeoShowcaseId.trim().slice(0, 100) : null;
    const status: VitrineStatus =
      obj.status === "INACTIVE" ? VitrineStatus.INACTIVE : obj.status === "EDITING" ? VitrineStatus.EDITING : VitrineStatus.ACTIVE;
    const description = typeof obj.description === "string" ? obj.description.slice(0, 2000) : null;
    const videos = Array.isArray(obj.videos) ? obj.videos : [];
    const id = vitrineId && vitrineId.length > 0 ? vitrineId : `import_${Date.now()}`;

    const vitrine = await prisma.vitrine.upsert({
      where: { id },
      update: { title, description, status, vimeoShowcaseId: vimeoShowcaseId || undefined },
      create: {
        id,
        accountId,
        title,
        description,
        status,
        vimeoShowcaseId,
        vimeoSource: "MANUAL"
      }
    });

    if (videos.length > 0) {
      await prisma.vitrineVideo.deleteMany({ where: { vitrineId: vitrine.id } });
      for (let i = 0; i < Math.min(videos.length, 500); i++) {
        const v = videos[i];
        const vimeoVideoId = String(v?.vimeoVideoId ?? "").trim().slice(0, 50);
        if (!vimeoVideoId) continue;
        const video = await prisma.video.upsert({
          where: { accountId_vimeoVideoId: { accountId, vimeoVideoId } },
          update: { title: typeof v?.title === "string" ? v.title.slice(0, 500) : "Video" },
          create: {
            accountId,
            vimeoVideoId,
            title: typeof v?.title === "string" ? v.title.slice(0, 500) : "Video"
          }
        });
        await prisma.vitrineVideo.create({
          data: { vitrineId: vitrine.id, videoId: video.id, position: typeof v?.position === "number" ? v.position : i }
        });
      }
    }

    return reply.send(ok({ vitrineId: vitrine.id, message: "Vitrine importada." }));
  });
};

export default adminVimeoRoutes;
