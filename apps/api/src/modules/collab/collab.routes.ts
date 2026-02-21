import type { FastifyPluginAsync } from "fastify";
import * as collabService from "./collab.service.js";

/**
 * Rotas de colaborador. Exigem autenticação.
 * Actualmente o sistema só tem admin; colaborador retorna 403 até existir auth collab.
 */
const collabRoutes: FastifyPluginAsync = async (app) => {
  app.get("/vitrines", async (_req, reply) => {
    const result = await collabService.getVitrinesForCollab();
    return reply.send(result);
  });
};

export default collabRoutes;
