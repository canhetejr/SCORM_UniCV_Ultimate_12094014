import type { FastifyPluginAsync } from "fastify";
import {
  extractEmbedHash,
  parseVimeoUserIdFromUri,
  vimeoGet
} from "../services/vimeo.js";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

const VIMEO_PROFILES_KEY = "vimeo_profiles";

const vimeoRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;
  const { getConfig, vimeoClientId, vimeoClientSecret } = deps;

  app.post("/connect-token", async (req, reply) => {
    const body = (req.body || {}) as { accessToken?: string };
    const accessToken = String(body.accessToken || "").trim();
    if (!accessToken) return reply.badRequest("accessToken é obrigatório.");

    try {
      const me = await vimeoGet<{ uri?: string }>({
        accessToken,
        path: "/me"
      });
      const vimeoUserId = parseVimeoUserIdFromUri(me?.uri || null);
      const accountId = await deps.getDefaultAccountId();

      await prisma.vimeoConnection.create({
        data: {
          accountId,
          vimeoUserId: vimeoUserId || undefined,
          accessToken,
          refreshToken: null,
          tokenType: "bearer",
          scope: null,
          expiresAt: null
        }
      });

      return { ok: true, vimeoUserId };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Token inválido. Verifique em developer.vimeo.com/apps > Generate access token.";
      return reply.badRequest(message);
    }
  });

  app.get("/showcases", async (req, reply) => {
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) return reply.unauthorized("Conecte o Vimeo primeiro em /auth/vimeo/start.");

    const q = req.query as { userId?: string };
    const vimeoUserId = typeof q.userId === "string" ? q.userId.trim() || null : null;
    const apiPath = vimeoUserId ? `/users/${encodeURIComponent(vimeoUserId)}/albums` : "/me/albums";

    const data = await vimeoGet<{
      data: Array<{ uri: string; name: string; description?: string | null }>;
    }>({
      accessToken: conn.accessToken,
      path: apiPath,
      query: { per_page: "50", sort: "date", direction: "desc" }
    });

    const showcases = data.data.map((a) => {
      const id = (a.uri.match(/\/albums\/(\d+)/) || [])[1] || a.uri;
      return { id, title: a.name, description: a.description || "" };
    });

    return { showcases };
  });

  app.post("/showcases/:id/import", async (req, reply) => {
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) return reply.unauthorized("Conecte o Vimeo primeiro em /auth/vimeo/start.");
    const showcaseId = String((req.params as { id?: string }).id || "").trim();
    if (!showcaseId) return reply.badRequest("ID inválido.");

    const body = (req.body || {}) as { vimeoUserId?: string };
    const vimeoUserId = typeof body.vimeoUserId === "string" ? body.vimeoUserId.trim() || null : null;

    const basePath = vimeoUserId
      ? `/users/${encodeURIComponent(vimeoUserId)}/albums`
      : "/me/albums";

    const accountId = conn.accountId;

    const showcase = await vimeoGet<{ uri: string; name: string; description?: string | null }>({
      accessToken: conn.accessToken,
      path: `${basePath}/${encodeURIComponent(showcaseId)}`
    });

    const videosResp = await vimeoGet<{
      data: Array<{
        uri: string;
        name: string;
        duration?: number;
        pictures?: { sizes?: Array<{ link: string }> };
        player_embed_url?: string;
        embed?: { html?: string };
      }>;
    }>({
      accessToken: conn.accessToken,
      path: `${basePath}/${encodeURIComponent(showcaseId)}/videos`,
      query: { per_page: "100" }
    });

    const vitrine = await prisma.vitrine.upsert({
      where: { id: `vimeo_showcase_${showcaseId}` },
      update: {
        accountId,
        title: showcase.name,
        description: showcase.description || null,
        vimeoShowcaseId: showcaseId,
        vimeoSource: "VIMEO_SHOWCASE"
      },
      create: {
        id: `vimeo_showcase_${showcaseId}`,
        accountId,
        title: showcase.name,
        description: showcase.description || null,
        vimeoShowcaseId: showcaseId,
        vimeoSource: "VIMEO_SHOWCASE"
      }
    });

    await prisma.vitrineVideo.deleteMany({ where: { vitrineId: vitrine.id } });

    for (let i = 0; i < videosResp.data.length; i++) {
      const v = videosResp.data[i];
      const vimeoVideoId = (v.uri.match(/\/videos\/(\d+)/) || [])[1] || v.uri.replace(/[^0-9]/g, "");
      const thumb = v.pictures?.sizes?.[0]?.link || null;
      const hash = extractEmbedHash({
        player_embed_url: (v as { player_embed_url?: string }).player_embed_url || null,
        embedHtml: v.embed?.html || null
      });

      const video = await prisma.video.upsert({
        where: { accountId_vimeoVideoId: { accountId, vimeoVideoId } },
        update: {
          title: v.name,
          durationSec: typeof v.duration === "number" ? v.duration : null,
          thumbnailUrl: thumb,
          embedHash: hash || null,
          playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
        },
        create: {
          accountId,
          vimeoVideoId,
          title: v.name,
          durationSec: typeof v.duration === "number" ? v.duration : null,
          thumbnailUrl: thumb,
          embedHash: hash || null,
          playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
        }
      });

      await prisma.vitrineVideo.create({
        data: {
          vitrineId: vitrine.id,
          videoId: video.id,
          position: i
        }
      });
    }

    await prisma.vimeoConnection.update({
      where: { id: conn.id },
      data: { lastSyncAt: new Date() }
    });

    return { ok: true, vitrineId: vitrine.id, videos: videosResp.data.length };
  });

  app.post("/disconnect", async () => {
    const deleted = await prisma.vimeoConnection.deleteMany({});
    return { ok: true, disconnected: deleted.count };
  });

  app.get("/profiles", async () => {
    const row = await prisma.appConfig.findUnique({ where: { key: VIMEO_PROFILES_KEY } });
    const list = row?.value ? (JSON.parse(row.value) as Array<{ id: string; name: string }>) : [];
    return { profiles: Array.isArray(list) ? list : [] };
  });

  app.put("/profiles", async (req) => {
    const body = (req.body || {}) as { profiles?: Array<{ id: string; name: string }> };
    const list = Array.isArray(body.profiles)
      ? body.profiles.filter((x) => x && typeof x.id === "string").map((x) => ({ id: x.id, name: String(x.name || x.id) }))
      : [];
    await prisma.appConfig.upsert({
      where: { key: VIMEO_PROFILES_KEY },
      create: { key: VIMEO_PROFILES_KEY, value: JSON.stringify(list) },
      update: { value: JSON.stringify(list) }
    });
    return { profiles: list };
  });

  app.post("/showcases/import-batch", async (req, reply) => {
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) return reply.unauthorized("Conecte o Vimeo primeiro.");
    const body = (req.body || {}) as { ids?: string[]; vimeoUserId?: string };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string" && id.trim()) : [];
    if (ids.length === 0) return reply.badRequest("ids é obrigatório (array de IDs de showcases).");
    const vimeoUserId = typeof body.vimeoUserId === "string" ? body.vimeoUserId.trim() || null : null;
    const results: Array<{ id: string; ok: boolean; vitrineId?: string; error?: string }> = [];
    for (const showcaseId of ids.slice(0, 20)) {
      try {
        const basePath = vimeoUserId
          ? `/users/${encodeURIComponent(vimeoUserId)}/albums`
          : "/me/albums";
        const accountId = conn.accountId;
        const showcase = await vimeoGet<{ name: string; description?: string | null }>({
          accessToken: conn.accessToken,
          path: `${basePath}/${encodeURIComponent(showcaseId)}`
        });
        const videosResp = await vimeoGet<{ data: Array<{ uri: string; name: string; duration?: number; pictures?: { sizes?: Array<{ link: string }> }; player_embed_url?: string; embed?: { html?: string } }> }>({
          accessToken: conn.accessToken,
          path: `${basePath}/${encodeURIComponent(showcaseId)}/videos`,
          query: { per_page: "100" }
        });
        const vitrine = await prisma.vitrine.upsert({
          where: { id: `vimeo_showcase_${showcaseId}` },
          update: { accountId, title: showcase.name, description: showcase.description || null, vimeoShowcaseId: showcaseId, vimeoSource: "VIMEO_SHOWCASE" },
          create: { id: `vimeo_showcase_${showcaseId}`, accountId, title: showcase.name, description: showcase.description || null, vimeoShowcaseId: showcaseId, vimeoSource: "VIMEO_SHOWCASE" }
        });
        await prisma.vitrineVideo.deleteMany({ where: { vitrineId: vitrine.id } });
        for (let i = 0; i < videosResp.data.length; i++) {
          const v = videosResp.data[i];
          const vimeoVideoId = (v.uri.match(/\/videos\/(\d+)/) || [])[1] || v.uri.replace(/[^0-9]/g, "");
          const thumb = v.pictures?.sizes?.[0]?.link || null;
          const hash = extractEmbedHash({ player_embed_url: (v as { player_embed_url?: string }).player_embed_url || null, embedHtml: v.embed?.html || null });
          const video = await prisma.video.upsert({
            where: { accountId_vimeoVideoId: { accountId, vimeoVideoId } },
            update: { title: v.name, durationSec: typeof v.duration === "number" ? v.duration : null, thumbnailUrl: thumb, embedHash: hash || null, playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}` },
            create: { accountId, vimeoVideoId, title: v.name, durationSec: typeof v.duration === "number" ? v.duration : null, thumbnailUrl: thumb, embedHash: hash || null, playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}` }
          });
          await prisma.vitrineVideo.create({ data: { vitrineId: vitrine.id, videoId: video.id, position: i } });
        }
        await prisma.vimeoConnection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date() } });
        results.push({ id: showcaseId, ok: true, vitrineId: vitrine.id });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erro";
        results.push({ id: showcaseId, ok: false, error: message });
      }
    }
    return { results, imported: results.filter((r) => r.ok).length };
  });

  app.get("/status", async () => {
    const configured = Boolean(vimeoClientId() && vimeoClientSecret());
    const conn = await deps.getPrimaryVimeoConnection();
    if (!conn) return { connected: false, configured };
    return {
      connected: true,
      configured,
      vimeoUserId: conn.vimeoUserId,
      lastSyncAt: conn.lastSyncAt
    };
  });
};

export default vimeoRoutes;
