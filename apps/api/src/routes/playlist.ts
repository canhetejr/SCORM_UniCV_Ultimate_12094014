import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

const playlistRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  app.get("/playlist", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const vitrineId = (q.vitrine_id || "").trim();
    const showcaseId = (q.showcase_id || q.id || "").trim();
    if (!vitrineId && !showcaseId) return reply.badRequest("Informe vitrine_id ou showcase_id (ou id).");

    const vitrine = await prisma.vitrine.findFirst({
      where: vitrineId
        ? { id: vitrineId }
        : {
            OR: [
              { vimeoShowcaseId: showcaseId },
              { id: `vimeo_showcase_${showcaseId}` }
            ]
          },
      include: {
        videos: {
          orderBy: { position: "asc" },
          include: { video: true }
        }
      }
    });

    if (!vitrine) {
      return reply.notFound("Vitrine não encontrada no servidor.");
    }

    const videos = vitrine.videos.map((vv) => ({
      id: vv.video.vimeoVideoId,
      name: vv.video.title,
      thumb: vv.video.thumbnailUrl || "",
      duration: vv.video.durationSec ?? 0,
      hash: vv.video.embedHash || undefined
    }));

    return { videos };
  });
};

export default playlistRoutes;
