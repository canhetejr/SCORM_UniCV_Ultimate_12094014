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

/** Extrai URL da thumbnail do campo pictures (Json) do cache. */
function thumbFromPictures(pictures: unknown): string | null {
  if (!pictures || typeof pictures !== "object") return null;
  const p = pictures as { sizes?: Array<{ link?: string; width?: number }> };
  const sizes = p.sizes;
  if (!Array.isArray(sizes) || sizes.length === 0) return null;
  const withLink = sizes.filter((s: { link?: string }) => s?.link);
  const sorted = [...withLink].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return sorted[0]?.link ?? null;
}

/**
 * Atualiza a playlist da Vitrine do Studio (VitrineVideo) a partir do cache do colaborador.
 * Usado após sync e no link para que o editor mostre os vídeos.
 */
async function syncStudioVitrinePlaylistFromCache(
  accountId: string,
  vimeoShowcaseId: string,
  cachedShowcaseId: string
): Promise<void> {
  const vitrine = await prisma.vitrine.findFirst({
    where: { accountId, vimeoShowcaseId }
  });
  if (!vitrine) return;

  const links = await prisma.vimeoCollaboratorShowcaseVideo.findMany({
    where: { showcaseId: cachedShowcaseId, removedAt: null },
    orderBy: { position: "asc" },
    include: { video: true }
  });

  await prisma.vitrineVideo.deleteMany({ where: { vitrineId: vitrine.id } });

  for (let position = 0; position < links.length; position++) {
    const link = links[position];
    const cv = link.video;
    const title = (cv.name ?? `Vídeo ${cv.vimeoVideoId}`).trim().slice(0, 500) || `Vídeo ${cv.vimeoVideoId}`;
    const thumbnailUrl = thumbFromPictures(cv.pictures);

    const video = await prisma.video.upsert({
      where: {
        accountId_vimeoVideoId: { accountId, vimeoVideoId: cv.vimeoVideoId }
      },
      update: {
        title,
        thumbnailUrl: thumbnailUrl ?? undefined,
        durationSec: cv.duration ?? undefined
      },
      create: {
        accountId,
        vimeoVideoId: cv.vimeoVideoId,
        title,
        thumbnailUrl,
        durationSec: cv.duration ?? null
      }
    });

    await prisma.vitrineVideo.create({
      data: { vitrineId: vitrine.id, videoId: video.id, position }
    });
  }
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
          _count: { select: { showcases: true, videos: true } }
        }
      });
      const data = collaborators.map((c) => {
        const { _count, ...rest } = c;
        return { ...rest, showcaseCount: _count.showcases, videoCount: _count.videos };
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

  /** D) POST /admin/vimeo-collaborators/:id/sync — sync FULL vitrines + vídeos do Vimeo para o cache */
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
    const accountId = await deps.getDefaultAccountId();

    type AlbumItem = {
      uri: string;
      name?: string | null;
      description?: string | null;
      created_time?: string | null;
      modified_time?: string | null;
      pictures?: { sizes?: Array<{ width?: number; link?: string }> } | null;
      metadata?: { connections?: { videos?: { total?: number } } };
    };
    type AlbumRes = { data: AlbumItem[]; paging?: { next?: string | null } };

    type VideoItem = {
      uri?: string | null;
      name?: string | null;
      description?: string | null;
      duration?: number | null;
      link?: string | null;
      embed?: { html?: string | null } | null;
      privacy?: { view?: string } | null;
      created_time?: string | null;
      modified_time?: string | null;
      pictures?: { sizes?: Array<{ width?: number; link?: string }> } | null;
    };
    type VideoRes = { data: VideoItem[]; paging?: { next?: string | null } };

    const vimeoGetWithRetry = async <T>(path: string, query: Record<string, string>): Promise<T> => {
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          return await vimeoGet<T>({
            accessToken: conn.accessToken,
            path,
            query: { per_page: "100", ...query },
            timeoutMs: VIMEO_SYNC_TIMEOUT_MS
          });
        } catch (e: unknown) {
          lastErr = e;
          if (isVimeoApiError(e) && (e as VimeoApiError).status === 429 && (e as VimeoApiError).retryAfter) {
            const sec = Math.min((e as VimeoApiError).retryAfter!, 120);
            reply.log.info({ retryAfter: sec }, "Vimeo 429, waiting before retry");
            await new Promise((r) => setTimeout(r, sec * 1000));
            continue;
          }
          throw e;
        }
      }
      throw lastErr;
    };

    // 1) Buscar TODAS as vitrines (paginação)
    const allAlbums: AlbumItem[] = [];
    let albumPage = 1;
    const maxPages = 500;
    let lastError: unknown = null;

    while (albumPage <= maxPages) {
      try {
        const data = await vimeoGetWithRetry<AlbumRes>(
          `/users/${collaborator.vimeoUserId}/albums`,
          { page: String(albumPage), sort: "date", direction: "desc" }
        );
        if (data.data?.length) allAlbums.push(...data.data);
        if (!data.data?.length || data.data.length < 100 || !data.paging?.next) break;
        albumPage++;
      } catch (e: unknown) {
        lastError = e;
        break;
      }
    }

    if (lastError && allAlbums.length === 0) {
      return sendApiError(lastError, reply, "vimeo_unknown");
    }

    const now = new Date();
    let showcasesUpserted = 0;
    let videosFetched = 0;
    let videosUpserted = 0;
    let linksUpserted = 0;
    let linksRemovedMarked = 0;

    // 2) Upsert cada vitrine e depois buscar vídeos (máx. 2 vitrines em paralelo)
    const processShowcase = async (a: AlbumItem): Promise<void> => {
      const vimeoShowcaseId = (a.uri.match(/\/albums\/(\d+)/) || [])[1] || a.uri;
      const modifiedTime = a.modified_time ? new Date(a.modified_time) : null;
      const totalVideos = a.metadata?.connections?.videos?.total ?? null;

      const showcase = await prisma.vimeoCollaboratorShowcase.upsert({
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
      showcasesUpserted++;

      const allVideos: VideoItem[] = [];
      let videoPage = 1;
      while (true) {
        try {
          const vdata = await vimeoGetWithRetry<VideoRes>(
            `/albums/${vimeoShowcaseId}/videos`,
            { page: String(videoPage) }
          );
          if (vdata.data?.length) {
            allVideos.push(...vdata.data);
            videosFetched += vdata.data.length;
          }
          if (!vdata.data?.length || vdata.data.length < 100 || !vdata.paging?.next) break;
          videoPage++;
        } catch (e: unknown) {
          reply.log.warn({ vimeoShowcaseId, err: e }, "Erro ao listar vídeos do album");
          break;
        }
      }

      const currentVideoIds: string[] = [];
      let position = 0;
      for (const v of allVideos) {
        const vimeoVideoId = ((v.uri?.match(/\/videos\/(\d+)/) || [])[1]) || ((v.uri ?? "").replace(/\D/g, "") || "");
        if (!vimeoVideoId) continue;
        currentVideoIds.push(vimeoVideoId);

        const createdTime = v.created_time ? new Date(v.created_time) : null;
        const modifiedTimeV = v.modified_time ? new Date(v.modified_time) : null;
        const embedHtml = v.embed?.html ?? null;
        const privacyView = v.privacy?.view ?? null;

        const videoRecord = await prisma.vimeoCollaboratorVideo.upsert({
          where: {
            collaboratorId_vimeoVideoId: { collaboratorId: id, vimeoVideoId }
          },
          update: {
            uri: v.uri ?? undefined,
            name: v.name ?? undefined,
            description: v.description ?? undefined,
            duration: v.duration ?? undefined,
            link: v.link ?? undefined,
            embedHtml: embedHtml ?? undefined,
            privacy: privacyView ?? undefined,
            createdTime,
            modifiedTime: modifiedTimeV,
            pictures: v.pictures ?? undefined,
            raw: v as unknown as object,
            lastFetchedAt: now,
            updatedAt: now
          },
          create: {
            collaboratorId: id,
            vimeoVideoId,
            uri: v.uri ?? undefined,
            name: v.name ?? undefined,
            description: v.description ?? undefined,
            duration: v.duration ?? undefined,
            link: v.link ?? undefined,
            embedHtml: embedHtml ?? undefined,
            privacy: privacyView ?? undefined,
            createdTime,
            modifiedTime: modifiedTimeV,
            pictures: v.pictures ?? undefined,
            raw: v as unknown as object,
            lastFetchedAt: now
          }
        });
        videosUpserted++;

        await prisma.vimeoCollaboratorShowcaseVideo.upsert({
          where: {
            showcaseId_videoId: { showcaseId: showcase.id, videoId: videoRecord.id }
          },
          update: {
            position,
            addedTime: createdTime ?? now,
            removedAt: null
          },
          create: {
            showcaseId: showcase.id,
            videoId: videoRecord.id,
            position,
            addedTime: createdTime ?? now
          }
        });
        linksUpserted++;
        position++;
      }

      // Marcar removedAt nos vínculos que não vieram na lista atual
      const existingLinks = await prisma.vimeoCollaboratorShowcaseVideo.findMany({
        where: { showcaseId: showcase.id, removedAt: null },
        select: { videoId: true, video: { select: { vimeoVideoId: true } } }
      });
      const currentSet = new Set(currentVideoIds);
      for (const link of existingLinks) {
        if (!currentSet.has(link.video.vimeoVideoId)) {
          await prisma.vimeoCollaboratorShowcaseVideo.updateMany({
            where: { showcaseId: showcase.id, videoId: link.videoId },
            data: { removedAt: now }
          });
          linksRemovedMarked++;
        }
      }

      await syncStudioVitrinePlaylistFromCache(accountId, vimeoShowcaseId, showcase.id);
    };

    const CONCURRENCY = 2;
    for (let i = 0; i < allAlbums.length; i += CONCURRENCY) {
      const chunk = allAlbums.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(processShowcase));
    }

    await prisma.vimeoCollaborator.update({
      where: { id },
      data: {
        lastSyncAt: now,
        lastSyncMsg: lastError ? "Sync parcial (erro ao listar todas as páginas de vitrines)." : null
      }
    });

    return reply.send(
      ok({
        showcasesFetched: allAlbums.length,
        showcasesUpserted,
        videosFetched,
        videosUpserted,
        linksUpserted,
        linksRemovedMarked
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
    const page = Math.max(1, (parseInt(String((req.query as { page?: string }).page ?? "1"), 10) || 1));
    const perPage = Math.min(100, Math.max(1, (parseInt(String((req.query as { perPage?: string }).perPage ?? "12"), 10) || 12)));
    const q = String((req.query as { q?: string }).q ?? "").trim().toLowerCase();

    const collaborator = await prisma.vimeoCollaborator.findUnique({ where: { id } });
    if (!collaborator) {
      return reply.status(404).send(err("not_found", "Colaborador não encontrado."));
    }

    const where: { collaboratorId: string; OR?: Array<{ name?: { contains: string; mode: "insensitive" }; vimeoShowcaseId?: { contains: string; mode: "insensitive" } }> } = {
      collaboratorId: id
    };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
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

  /** E3) POST /admin/vimeo-collaborators/:id/showcases/export — exporta vitrines + vídeos do cache (batch) */
  app.post<{
    Params: { id: string };
    Body: { showcaseIds?: string[] };
  }>("/:id/showcases/export", async (req, reply) => {
    const collabId = String((req.params as { id?: string }).id ?? "").trim();
    if (!collabId) {
      return reply.status(400).send(err("invalid_input", "id é obrigatório."));
    }
    const body = (req.body || {}) as { showcaseIds?: string[] };
    const showcaseIds = Array.isArray(body.showcaseIds) ? body.showcaseIds.map((s) => String(s).trim()).filter(Boolean) : [];
    if (!showcaseIds.length) {
      return reply
        .status(400)
        .send({ ok: false, error: { code: "invalid_request", message: "showcaseIds é obrigatório." } });
    }

    const collaborator = await prisma.vimeoCollaborator.findUnique({ where: { id: collabId } });
    if (!collaborator) {
      return reply.status(404).send(err("not_found", "Colaborador não encontrado."));
    }

    const showcases = await prisma.vimeoCollaboratorShowcase.findMany({
      where: {
        id: { in: showcaseIds },
        collaboratorId: collabId
      },
      orderBy: [{ modifiedTime: "desc" }, { createdAt: "desc" }]
    });

    if (!showcases.length) {
      return reply
        .status(404)
        .send(err("not_found", "Nenhuma vitrine encontrada para os IDs informados."));
    }

    const showcaseIdsSet = new Set(showcases.map((s) => s.id));

    const links = await prisma.vimeoCollaboratorShowcaseVideo.findMany({
      where: {
        showcaseId: { in: Array.from(showcaseIdsSet) },
        removedAt: null
      },
      orderBy: { position: "asc" },
      include: {
        video: {
          select: {
            id: true,
            vimeoVideoId: true,
            name: true,
            description: true,
            duration: true,
            link: true,
            pictures: true,
            createdTime: true,
            modifiedTime: true
          }
        }
      }
    });

    const byShowcase = new Map<string, typeof links>();
    for (const link of links) {
      const arr = byShowcase.get(link.showcaseId) ?? [];
      arr.push(link);
      byShowcase.set(link.showcaseId, arr);
    }

    const items = showcases.map((s) => {
      const showcaseVideos = byShowcase.get(s.id) ?? [];
      return {
        showcaseId: s.id,
        showcase: {
          id: s.id,
          collaboratorId: s.collaboratorId,
          vimeoShowcaseId: s.vimeoShowcaseId,
          name: s.name,
          description: s.description,
          totalVideos: s.totalVideos,
          modifiedTime: s.modifiedTime,
          pictures: s.pictures
        },
        videos: showcaseVideos.map((sv) => ({
          id: sv.video.id,
          vimeoVideoId: sv.video.vimeoVideoId,
          name: sv.video.name,
          description: sv.video.description,
          duration: sv.video.duration,
          link: sv.video.link,
          pictures: sv.video.pictures,
          position: sv.position,
          addedTime: sv.addedTime,
          removedAt: sv.removedAt
        }))
      };
    });

    const exportedAt = new Date().toISOString();
    return reply.send(
      ok({
        collaboratorId: collabId,
        exportedAt,
        items
      })
    );
  });

  /** E3b) POST /admin/vimeo-collaborators/:id/showcases/export-batch — exporta vitrines selecionadas (banco), retorna { fileName, json } */
  app.post<{
    Params: { id: string };
    Body: { showcaseIds?: string[] };
  }>("/:id/showcases/export-batch", async (req, reply) => {
    const collabId = String((req.params as { id?: string }).id ?? "").trim();
    if (!collabId) {
      return reply.status(400).send(err("invalid_input", "id é obrigatório."));
    }
    const body = (req.body || {}) as { showcaseIds?: string[] };
    const showcaseIds = Array.isArray(body.showcaseIds) ? body.showcaseIds.map((s) => String(s).trim()).filter(Boolean) : [];
    if (!showcaseIds.length) {
      return reply.status(400).send(err("invalid_input", "showcaseIds é obrigatório (array não vazio)."));
    }

    const collaborator = await prisma.vimeoCollaborator.findUnique({ where: { id: collabId } });
    if (!collaborator) {
      return reply.status(404).send(err("not_found", "Colaborador não encontrado."));
    }

    const showcases = await prisma.vimeoCollaboratorShowcase.findMany({
      where: {
        id: { in: showcaseIds },
        collaboratorId: collabId
      },
      orderBy: [{ modifiedTime: "desc" }, { createdAt: "desc" }]
    });

    if (!showcases.length) {
      return reply.status(404).send(err("not_found", "Nenhuma vitrine encontrada para os IDs informados."));
    }

    const showcaseIdsSet = new Set(showcases.map((s) => s.id));
    const links = await prisma.vimeoCollaboratorShowcaseVideo.findMany({
      where: {
        showcaseId: { in: Array.from(showcaseIdsSet) },
        removedAt: null
      },
      orderBy: { position: "asc" },
      include: {
        video: {
          select: {
            id: true,
            vimeoVideoId: true,
            name: true,
            description: true,
            duration: true,
            link: true,
            pictures: true,
            createdTime: true,
            modifiedTime: true
          }
        }
      }
    });

    const byShowcase = new Map<string, typeof links>();
    for (const link of links) {
      const arr = byShowcase.get(link.showcaseId) ?? [];
      arr.push(link);
      byShowcase.set(link.showcaseId, arr);
    }

    const json = showcases.map((s) => {
      const showcaseVideos = byShowcase.get(s.id) ?? [];
      return {
        showcaseId: s.id,
        showcase: {
          id: s.id,
          collaboratorId: s.collaboratorId,
          vimeoShowcaseId: s.vimeoShowcaseId,
          name: s.name,
          description: s.description,
          totalVideos: s.totalVideos,
          modifiedTime: s.modifiedTime,
          pictures: s.pictures
        },
        videos: showcaseVideos.map((sv) => ({
          id: sv.video.id,
          vimeoVideoId: sv.video.vimeoVideoId,
          name: sv.video.name,
          description: sv.video.description,
          duration: sv.video.duration,
          link: sv.video.link,
          pictures: sv.video.pictures,
          position: sv.position,
          addedTime: sv.addedTime,
          removedAt: sv.removedAt
        }))
      };
    });

    const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15).replace("T", "_");
    const fileName = `vitrines_export_${collabId}_${timestamp}.json`;
    return reply.send(ok({ fileName, json }));
  });

  /** E2) GET /admin/vimeo-collaborators/:id/showcases/:showcaseId/videos?page&perPage&q= — vídeos da vitrine (cache) */
  app.get<{
    Params: { id: string; showcaseId: string };
    Querystring: { page?: string; perPage?: string; q?: string };
  }>("/:id/showcases/:showcaseId/videos", async (req, reply) => {
    const collabId = String((req.params as { id?: string }).id ?? "").trim();
    const showcaseId = String((req.params as { showcaseId?: string }).showcaseId ?? "").trim();
    if (!collabId || !showcaseId) {
      return reply.status(400).send(err("invalid_input", "id e showcaseId são obrigatórios."));
    }
    const page = Math.max(1, (parseInt(String((req.query as { page?: string }).page ?? "1"), 10) || 1));
    const perPage = Math.min(100, Math.max(1, (parseInt(String((req.query as { perPage?: string }).perPage ?? "24"), 10) || 24)));
    const q = String((req.query as { q?: string }).q ?? "").trim().toLowerCase();

    const collaborator = await prisma.vimeoCollaborator.findUnique({ where: { id: collabId } });
    if (!collaborator) {
      return reply.status(404).send(err("not_found", "Colaborador não encontrado."));
    }
    const showcase = await prisma.vimeoCollaboratorShowcase.findFirst({
      where: { id: showcaseId, collaboratorId: collabId }
    });
    if (!showcase) {
      return reply.status(404).send(err("not_found", "Vitrine não encontrada."));
    }

    const whereJoin = {
      showcaseId,
      removedAt: null as Date | null,
      video: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { vimeoVideoId: { contains: q, mode: "insensitive" as const } }
            ]
          }
        : undefined
    };
    const [links, total] = await Promise.all([
      prisma.vimeoCollaboratorShowcaseVideo.findMany({
        where: whereJoin,
        include: {
          video: {
            select: {
              id: true,
              vimeoVideoId: true,
              name: true,
              duration: true,
              link: true,
              embedHtml: true,
              pictures: true
            }
          }
        },
        orderBy: { position: "asc" },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      prisma.vimeoCollaboratorShowcaseVideo.count({
        where: whereJoin
      })
    ]);

    const items = links.map((l) => ({
      id: l.video.id,
      vimeoVideoId: l.video.vimeoVideoId,
      name: l.video.name,
      duration: l.video.duration,
      link: l.video.link,
      embedHtml: l.video.embedHtml ?? undefined,
      pictures: l.video.pictures
    }));

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
      if (cached) {
        await syncStudioVitrinePlaylistFromCache(accountId, vimeoShowcaseId, cached.id);
      }
      return reply.send(ok({ vitrineId: vitrine.id }));
    }
  );
};

export default adminVimeoCollaboratorsRoutes;
