import type { FastifyPluginAsync } from "fastify";

/**
 * Rotas de colaborador. Exigem autenticação.
 * Actualmente o sistema só tem admin; colaborador retorna 403 até existir auth collab.
 */
const collabRoutes: FastifyPluginAsync = async (app) => {
  app.get("/vitrines", async (_req, reply) => {
    return reply.status(403).send({
      code: "collab_not_available",
      message: "Modo colaborador não disponível para esta conta."
    });
  });
};

export default collabRoutes;
