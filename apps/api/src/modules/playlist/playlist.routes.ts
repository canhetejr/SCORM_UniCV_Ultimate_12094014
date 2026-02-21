import type { FastifyPluginAsync } from "fastify";
import type { ServerDeps } from "../../routes/deps.js";
import * as playlistService from "./playlist.service.js";

const playlistRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  app.get("/playlist", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const vitrineId = (q.vitrine_id || "").trim();
    const showcaseId = (q.showcase_id || q.id || "").trim();

    const result = await playlistService.getPlaylist({ vitrineId, showcaseId });
    return reply.send(result);
  });
};

export default playlistRoutes;
