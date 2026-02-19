import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { VitrineStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { getMe, parseUserIdFromUri, isVimeoClientError } from "../services/vimeoClient.js";
import { encryptToken, getEncryptionKey, CryptoTokenError } from "../services/cryptoTokens.js";
import { syncProfileFull, syncProfileIncremental } from "../services/vimeoCloneSync.js";
import type { ServerDeps } from "./deps.js";

const ACCESS_TOKEN_MAX = 2000;
const LABEL_MAX = 200;
const CUID_LEN = 30;
const QUERY_Q_MAX = 200;
const PER_PAGE_MAX = 100;
const PER_PAGE_DEFAULT = 20;

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: { code: string; message: string } };

function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

function err(code: string, message: string): ApiErr {
  return { ok: false, error: { code, message } };
}

function getEncryptionKeySafe(envKey: string | undefined): string | undefined {
  try {
    getEncryptionKey(envKey);
    return envKey;
  } catch {
    return undefined;
  }
}

async function sendError(
  e: unknown,
  reply: FastifyReply,
  log: FastifyReply["log"]
): Promise<FastifyReply> {
  if (isVimeoClientError(e)) {
    const code = e.code === "vimeo_auth_failed" ? "vimeo_auth_failed" : e.code;
    log.info({ code, status: e.status }, "Vimeo Clone error (no token leaked)");
    const status = e.status === 429 ? 429 : e.status === 401 || e.status === 403 ? 401 : 502;
    return reply.status(status).send(err(code, e.message));
  }
  if (e instanceof CryptoTokenError) {
    log.info({ err: e.message }, "Vimeo Clone crypto error");
    return reply.status(400).send(err("invalid_input", e.message));
  }
  const msg = e instanceof Error ? e.message : String(e);
  log.info({ err: msg }, "Vimeo Clone error");
  return reply.status(500).send(err("sync_failed", "Falha na operação. Tente novamente."));
}

const adminVimeoCloneRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;
  const envKey = () => deps.env.VIMEO_TOKEN_ENCRYPTION_KEY;

  app.post("/profiles", async (req, reply) => {
    const key = getEncryptionKeySafe(envKey());
    if (!key) {
      return reply.status(400).send(err("invalid_input", "VIMEO_TOKEN_ENCRYPTION_KEY não configurada no servidor."));
    }
    const body = (req.body || {}) as { accessToken?: string; label?: string };
    const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim().slice(0, ACCESS_TOKEN_MAX) : "";
    if (!accessToken || accessToken.length < 20) {
      return reply.status(400).send(err("invalid_input", "accessToken é obrigatório e deve ter pelo menos 20 caracteres."));
    }
    const label = typeof body.label === "string" ? body.label.trim().slice(0, LABEL_MAX) || null : null;

    try {
      const me = await getMe(accessToken);
      const vimeoUserId = parseUserIdFromUri(me.uri);
      if (!vimeoUserId) {
        return reply.status(400).send(err("vimeo_auth_failed", "Não foi possível obter o ID do utilizador Vimeo."));
      }
      const vimeoUri = me.uri ?? null;
      const name = typeof me.name === "string" ? me.name.trim().slice(0, 500) || null : null;
      const accessTokenEnc = encryptToken(accessToken, envKey());

      const profile = await prisma.vimeoProfile.upsert({
        where: { vimeoUserId },
        update: { label: label ?? undefined, vimeoUri, name, accessTokenEnc },
        create: {
          vimeoUserId,
          label,
          vimeoUri,
          name,
          accessTokenEnc
        }
      });

      const publicProfile = {
        id: profile.id,
        label: profile.label,
        vimeoUserId: profile.vimeoUserId,
        vimeoUri: profile.vimeoUri,
        name: profile.name,
        lastSyncAt: profile.lastSyncAt?.toISOString() ?? null,
        lastSyncStatus: profile.lastSyncStatus,
        lastSyncMessage: profile.lastSyncMessage,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString()
      };
      return reply.send(ok({ profile: publicProfile }));
    } catch (e: unknown) {
      return sendError(e, reply, reply.log);
    }
  });

  app.get("/profiles", async (_req, reply) => {
    const list = await prisma.vimeoProfile.findMany({
      orderBy: { createdAt: "desc" }
    });
    const profiles = list.map((p: { id: string; label: string | null; vimeoUserId: string; vimeoUri: string | null; name: string | null; lastSyncAt: Date | null; lastSyncStatus: string | null; lastSyncMessage: string | null; createdAt: Date; updatedAt: Date }) => ({
      id: p.id,
      label: p.label,
      vimeoUserId: p.vimeoUserId,
      vimeoUri: p.vimeoUri,
      name: p.name,
      lastSyncAt: p.lastSyncAt?.toISOString() ?? null,
      lastSyncStatus: p.lastSyncStatus,
      lastSyncMessage: p.lastSyncMessage,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    }));
    return reply.send(ok({ profiles }));
  });

  app.delete("/profiles/:id", async (req, reply) => {
    const id = String((req.params as { id?: string }).id ?? "").trim().slice(0, CUID_LEN);
    if (!id) return reply.status(400).send(err("invalid_input", "ID do perfil é obrigatório."));
    const deleted = await prisma.vimeoProfile.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      return reply.status(404).send(err("vimeo_not_found", "Perfil não encontrado."));
    }
    return reply.send(ok({ message: "Perfil removido." }));
  });

  app.post("/profiles/:id/sync", async (req, reply) => {
    const id = String((req.params as { id?: string }).id ?? "").trim().slice(0, CUID_LEN);
    if (!id) return reply.status(400).send(err("invalid_input", "ID do perfil é obrigatório."));
    const mode = String((req.query as { mode?: string }).mode ?? "full").toLowerCase();
    const key = envKey();
    if (!key) {
      return reply.status(400).send(err("invalid_input", "VIMEO_TOKEN_ENCRYPTION_KEY não configurada."));
    }
    try {
      const result =
        mode === "incremental"
          ? await syncProfileIncremental(id, key)
          : await syncProfileFull(id, key);
      return reply.send(ok(result));
    } catch (e: unknown) {
      return sendError(e, reply, reply.log);
    }
  });

  app.get("/profiles/:id/showcases", async (req, reply) => {
    const id = String((req.params as { id?: string }).id ?? "").trim().slice(0, CUID_LEN);
    if (!id) return reply.status(400).send(err("invalid_input", "ID do perfil é obrigatório."));
    const profile = await prisma.vimeoProfile.findUnique({ where: { id } });
    if (!profile) return reply.status(404).send(err("vimeo_not_found", "Perfil não encontrado."));

    const q = String((req.query as { q?: string }).q ?? "").trim().slice(0, QUERY_Q_MAX);
    const page = Math.max(1, parseInt(String((req.query as { page?: string }).page ?? "1"), 10) || 1);
    const perPage = Math.min(PER_PAGE_MAX, Math.max(1, parseInt(String((req.query as { perPage?: string }).perPage ?? PER_PAGE_DEFAULT), 10) || PER_PAGE_DEFAULT));

    const where: { profileId: string; OR?: Array<object> } = { profileId: id };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
        { vimeoId: { contains: q, mode: "insensitive" as const } }
      ];
    }
    const [showcases, total] = await Promise.all([
      prisma.vimeoShowcase.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { modifiedTime: "desc" }
      }),
      prisma.vimeoShowcase.count({ where })
    ]);

    const items = showcases.map((s: { id: string; vimeoId: string; uri: string | null; name: string | null; description: string | null; privacy: string | null; createdTime: Date | null; modifiedTime: Date | null; totalVideos: number | null; pictures: unknown }) => ({
      id: s.id,
      vimeoId: s.vimeoId,
      uri: s.uri,
      name: s.name,
      description: s.description,
      privacy: s.privacy,
      createdTime: s.createdTime?.toISOString() ?? null,
      modifiedTime: s.modifiedTime?.toISOString() ?? null,
      totalVideos: s.totalVideos,
      pictures: s.pictures
    }));

    return reply.send(
      ok({
        items,
        total,
        page,
        perPage
      })
    );
  });

  app.get("/profiles/:profileId/showcases/:showcaseId/videos", async (req, reply) => {
    const profileId = String((req.params as { profileId?: string }).profileId ?? "").trim().slice(0, CUID_LEN);
    const showcaseId = String((req.params as { showcaseId?: string }).showcaseId ?? "").trim().slice(0, CUID_LEN);
    if (!profileId || !showcaseId) {
      return reply.status(400).send(err("invalid_input", "profileId e showcaseId são obrigatórios."));
    }
    const showcase = await prisma.vimeoShowcase.findFirst({
      where: { id: showcaseId, profileId }
    });
    if (!showcase) return reply.status(404).send(err("vimeo_not_found", "Vitrine não encontrada."));

    const page = Math.max(1, parseInt(String((req.query as { page?: string }).page ?? "1"), 10) || 1);
    const perPage = Math.min(PER_PAGE_MAX, Math.max(1, parseInt(String((req.query as { perPage?: string }).perPage ?? PER_PAGE_DEFAULT), 10) || PER_PAGE_DEFAULT));

    const [links, total] = await Promise.all([
      prisma.vimeoShowcaseVideo.findMany({
        where: { showcaseId, removedAt: null },
        orderBy: { position: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { video: true }
      }),
      prisma.vimeoShowcaseVideo.count({ where: { showcaseId, removedAt: null } })
    ]);

    const items = links.map((l: { video: { id: string; vimeoId: string; uri: string | null; name: string | null; description: string | null; duration: number | null; link: string | null; embedHtml: string | null; privacy: string | null; createdTime: Date | null; modifiedTime: Date | null; pictures: unknown }; position: number | null }) => ({
      id: l.video.id,
      vimeoId: l.video.vimeoId,
      uri: l.video.uri,
      name: l.video.name,
      description: l.video.description,
      duration: l.video.duration,
      link: l.video.link,
      embedHtml: l.video.embedHtml,
      privacy: l.video.privacy,
      createdTime: l.video.createdTime?.toISOString() ?? null,
      modifiedTime: l.video.modifiedTime?.toISOString() ?? null,
      pictures: l.video.pictures,
      position: l.position
    }));

    return reply.send(
      ok({
        items,
        total,
        page,
        perPage
      })
    );
  });

  app.post("/showcases/:showcaseId/import-to-studio", async (req, reply) => {
    const showcaseId = String((req.params as { showcaseId?: string }).showcaseId ?? "").trim().slice(0, CUID_LEN);
    if (!showcaseId) return reply.status(400).send(err("invalid_input", "showcaseId é obrigatório."));
    const showcase = await prisma.vimeoShowcase.findUnique({
      where: { id: showcaseId },
      include: {
        videos: {
          where: { removedAt: null },
          orderBy: { position: "asc" },
          include: { video: true }
        }
      }
    });
    if (!showcase) return reply.status(404).send(err("vimeo_not_found", "Vitrine clonada não encontrada."));

    const accountId = await deps.getDefaultAccountId();
    const title = (showcase.name ?? `Vitrine ${showcase.vimeoId}`).trim().slice(0, 500) || "Importado";
    const description = showcase.description?.slice(0, 2000) ?? null;

    const existing = await prisma.vitrine.findFirst({
      where: { accountId, vimeoShowcaseId: showcase.vimeoId }
    });
    const vitrine = existing
      ? await prisma.vitrine.update({
          where: { id: existing.id },
          data: {
            title,
            description,
            vimeoSource: "VIMEO_SHOWCASE"
          }
        })
      : await prisma.vitrine.create({
          data: {
            accountId,
            title,
            description,
            vimeoShowcaseId: showcase.vimeoId,
            status: VitrineStatus.ACTIVE,
            vimeoSource: "VIMEO_SHOWCASE"
          }
        });

    await prisma.vitrineVideo.deleteMany({ where: { vitrineId: vitrine.id } });
    for (let i = 0; i < showcase.videos.length; i++) {
      const v = showcase.videos[i].video;
      const thumb =
        v.pictures && typeof v.pictures === "object" && Array.isArray((v.pictures as { sizes?: Array<{ link?: string }> }).sizes)
          ? ((v.pictures as { sizes: Array<{ link?: string }> }).sizes.find((s) => s.link)?.link ?? null)
          : null;
      const video = await prisma.video.upsert({
        where: { accountId_vimeoVideoId: { accountId, vimeoVideoId: v.vimeoId } },
        update: {
          title: (v.name ?? `Vídeo ${v.vimeoId}`).slice(0, 500),
          thumbnailUrl: thumb,
          durationSec: v.duration ?? undefined,
          playerUrl: v.link ?? `https://player.vimeo.com/video/${v.vimeoId}`
        },
        create: {
          accountId,
          vimeoVideoId: v.vimeoId,
          title: (v.name ?? `Vídeo ${v.vimeoId}`).slice(0, 500),
          thumbnailUrl: thumb,
          durationSec: v.duration ?? undefined,
          playerUrl: v.link ?? `https://player.vimeo.com/video/${v.vimeoId}`
        }
      });
      await prisma.vitrineVideo.create({
        data: { vitrineId: vitrine.id, videoId: video.id, position: i }
      });
    }

    return reply.send(ok({ vitrineId: vitrine.id, message: "Vitrine importada para o Studio." }));
  });
};

export default adminVimeoCloneRoutes;
