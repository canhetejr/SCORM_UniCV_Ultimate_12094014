import type { FastifyPluginAsync } from "fastify";
import type { ServerDeps } from "../../routes/deps.js";
import { BadRequestError } from "../../shared/errors/AppError.js";
import * as dashboardService from "./dashboard.service.js";

const dashboardRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

  app.post("/events", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const body = (req.body || {}) as {
      type?: string;
      source?: string;
      payload?: Record<string, unknown>;
    };
    if (!body?.type) {
      throw new BadRequestError("type is required");
    }

    const result = await dashboardService.createEvent({
      accountId,
      type: body.type,
      source: body.source,
      payload: body.payload,
    });
    return reply.send(result);
  });

  app.get("/summary", async (req, reply) => {
    const q = req.query as { days?: string; type?: string; source?: string };
    const days = q.days ? Number(q.days) : undefined;

    const result = await dashboardService.getSummary({
      days,
      typeFilter: q.type,
      sourceFilter: q.source,
    });
    return reply.send(result);
  });
};

export default dashboardRoutes;
