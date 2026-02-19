/**
 * Webhook público para SCORM/Moodle. Não exige auth.
 * GET /n8n/webhook/scorm?vitrine_id=... ou ?id=SHOWCASE_ID
 * Retorna { ok: true, data: { videos }, videos } para compatibilidade com o player.
 */

import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";

type VideoItem = { id: string; name: string; thumb: string; duration: number };

/** Escolhe melhor thumb: maior size com width <= 300, senão base_link ou primeiro link. */
function bestThumbFromPictures(pictures: unknown): string {
  if (!pictures || typeof pictures !== "object") return "";
  const p = pictures as {
    base_link?: string;
    sizes?: Array<{ link?: string; width?: number }>;
  };
  const sizes = p.sizes;
  if (Array.isArray(sizes) && sizes.length > 0) {
    const withLink = sizes.filter((s) => s?.link);
    const under300 = withLink.filter((s) => (s.width ?? 0) <= 300).sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    const best = under300[0] ?? withLink.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
    if (best?.link) return best.link;
  }
  if (typeof p.base_link === "string" && p.base_link) return p.base_link;
  return "";
}

const n8nWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.options("/scorm", async (_req, reply) => {
    return reply
      .header("Access-Control-Allow-Origin", "*")
      .header("Access-Control-Allow-Methods", "GET, OPTIONS")
      .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
      .send();
  });

  app.get("/scorm", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const vitrineId = (q.vitrine_id ?? "").trim();
    const showcaseId = (q.id ?? q.showcase_id ?? "").trim().replace(/\D/g, "");
    if (!vitrineId && !showcaseId) {
      return reply.status(400).send({
        ok: false,
        error: { code: "invalid_input", message: "Informe vitrine_id ou id (showcase_id)." }
      });
    }

    let videos: VideoItem[] = [];

    if (vitrineId) {
      const vitrine = await prisma.vitrine.findFirst({
        where: { id: vitrineId },
        include: {
          videos: { orderBy: { position: "asc" }, include: { video: true } }
        }
      });
      if (vitrine && vitrine.videos.length > 0) {
        videos = vitrine.videos.map((vv) => ({
          id: vv.video.vimeoVideoId,
          name: vv.video.title ?? "",
          thumb: vv.video.thumbnailUrl ?? "",
          duration: vv.video.durationSec ?? 0
        }));
      }
      if (videos.length === 0 && vitrine?.vimeoShowcaseId) {
        const cached = await prisma.vimeoCollaboratorShowcase.findFirst({
          where: { vimeoShowcaseId: vitrine.vimeoShowcaseId },
          include: {
            showcaseVideos: {
              where: { removedAt: null },
              orderBy: { position: "asc" },
              include: { video: true }
            }
          }
        });
        if (cached) {
          videos = cached.showcaseVideos.map((sv) => ({
            id: sv.video.vimeoVideoId,
            name: sv.video.name ?? "",
            thumb: bestThumbFromPictures(sv.video.pictures),
            duration: sv.video.duration ?? 0
          }));
        }
      }
    } else if (showcaseId) {
      const cached = await prisma.vimeoCollaboratorShowcase.findFirst({
        where: { vimeoShowcaseId: showcaseId },
        include: {
          showcaseVideos: {
            where: { removedAt: null },
            orderBy: { position: "asc" },
            include: { video: true }
          }
        }
      });
      if (cached) {
        videos = cached.showcaseVideos.map((sv) => ({
          id: sv.video.vimeoVideoId,
          name: sv.video.name ?? "",
          thumb: bestThumbFromPictures(sv.video.pictures),
          duration: sv.video.duration ?? 0
        }));
      }
    }

    const payload = { ok: true as const, data: { videos }, videos };
    return reply
      .header("Access-Control-Allow-Origin", "*")
      .header("Access-Control-Allow-Methods", "GET, OPTIONS")
      .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
      .send(payload);
  });

};

export default n8nWebhookRoutes;
