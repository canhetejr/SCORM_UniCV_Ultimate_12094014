import type { FastifyPluginAsync } from "fastify";
import * as healthService from "./health.service.js";

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async (_req, reply) => {
    const result = await healthService.getHealth();
    return reply.send(result);
  });
};

export default healthRoutes;
