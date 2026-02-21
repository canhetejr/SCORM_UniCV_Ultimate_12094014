import type { FastifyPluginAsync } from "fastify";
import type { ServerDeps } from "../../routes/deps.js";
import * as xapiService from "./xapi.service.js";

const xapiRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  app.post("/statements", async (req, reply) => {
    const env = opts.deps.loadEnv();
    const statement = req.body;

    const result = await xapiService.postStatement({ statement, env });
    return reply.send(result);
  });
};

export default xapiRoutes;
