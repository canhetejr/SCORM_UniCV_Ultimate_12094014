import type { FastifyPluginAsync } from "fastify";
import type { ServerDeps } from "../../routes/deps.js";
import * as configService from "./config.service.js";

const configRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;
  const { env, getConfig, vimeoClientId, vimeoClientSecret } = deps;

  app.get("/status", async (_req, reply) => {
    const result = configService.getStatus({
      getConfig,
      env,
      vimeoClientId,
      vimeoClientSecret,
    });
    return reply.send(result);
  });

  app.get("/env", async (_req, reply) => {
    const result = configService.getEnvItems(getConfig);
    return reply.send(result);
  });

  app.put("/env", async (req, reply) => {
    const body = (req.body || {}) as { updates?: Record<string, string | null> };
    const updates = body.updates ?? {};
    const result = await configService.updateEnv(updates, deps.dbConfigMap, getConfig);
    return reply.send(result);
  });
};

export default configRoutes;
