import type { FastifyPluginAsync } from "fastify";
import type { ServerDeps } from "../../routes/deps.js";
import { BadRequestError } from "../../shared/errors/AppError.js";
import * as vitrinesService from "./vitrines.service.js";

const vitrinesRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

  app.get("/vitrines", async (_req, reply) => {
    const vitrines = await vitrinesService.getVitrinesList();
    return reply.send({ vitrines });
  });

  app.post("/vitrines", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const body = (req.body || {}) as { title?: string; slug?: string; status?: string; description?: string };
    if (!body?.title) {
      throw new BadRequestError("title is required");
    }
    const result = await vitrinesService.createVitrineForAccount(accountId, {
      title: body.title,
      slug: body.slug,
      status: body.status,
      description: body.description,
    });
    return reply.send({ vitrine: result.vitrine });
  });

  app.get("/vitrines/:id", async (req, reply) => {
    const id = String((req.params as { id?: string }).id || "").trim();
    const vitrine = await vitrinesService.getVitrineById(id);
    return reply.send(vitrine);
  });

  app.put("/vitrines/:id", async (req, reply) => {
    const id = String((req.params as { id?: string }).id || "").trim();
    const body = (req.body || {}) as { title?: string; slug?: string; status?: string };
    const result = await vitrinesService.updateVitrineById(id, {
      title: body.title,
      slug: body.slug,
      status: body.status,
    });
    return reply.send({ vitrine: result.vitrine });
  });

  app.post("/vitrines/:id/duplicate", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const id = String((req.params as { id?: string }).id || "").trim();
    const result = await vitrinesService.duplicateVitrine(accountId, id);
    return reply.send({ vitrine: result.vitrine });
  });

  app.post("/vitrines/:id/videos", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const vitrineId = String((req.params as { id?: string }).id || "").trim();
    const body = (req.body || {}) as {
      vimeoVideoId?: string;
      url?: string;
      title?: string;
      embedHash?: string;
      thumbnailUrl?: string;
      thumbUrl?: string;
      durationSec?: number;
    };
    const conn = await deps.getPrimaryVimeoConnection();
    await vitrinesService.addVideoToVitrine(accountId, vitrineId, body, conn);
    return reply.send({ ok: true });
  });

  app.delete("/vitrines/:id/videos/:videoId", async (req, reply) => {
    const vitrineId = String((req.params as { id?: string }).id || "").trim();
    const videoId = String((req.params as { videoId?: string }).videoId || "").trim();
    await vitrinesService.removeVideoFromVitrine(vitrineId, videoId);
    return reply.send({ ok: true });
  });

  app.post("/vitrines/:id/videos/:videoId/move", async (req, reply) => {
    const vitrineId = String((req.params as { id?: string }).id || "").trim();
    const videoId = String((req.params as { videoId?: string }).videoId || "").trim();
    const body = (req.body || {}) as { direction?: string };
    const direction = (body.direction ?? "").toString();
    await vitrinesService.moveVideoInVitrine(vitrineId, videoId, direction);
    return reply.send({ ok: true });
  });

  app.post("/vitrines/:id/import/csv", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const vitrineId = String((req.params as { id?: string }).id || "").trim();
    const csvText = typeof req.body === "string" ? req.body : "";
    const result = await vitrinesService.importCsvIntoVitrine(accountId, vitrineId, csvText);
    return reply.send({ ok: true, imported: result.imported });
  });
};

export default vitrinesRoutes;
