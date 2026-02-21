import type { FastifyPluginAsync } from "fastify";
import type { ServerDeps } from "../../routes/deps.js";
import * as publishedService from "./published.service.js";

const publishedRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;
  const { repoRoot } = deps;

  app.get("/:slug/config", async (req, reply) => {
    const slug = String((req.params as { slug?: string }).slug ?? "").trim();
    const result = await publishedService.getConfig(slug);
    return reply.send(result);
  });

  app.get("/:slug", async (req, reply) => {
    const slug = String((req.params as { slug?: string }).slug ?? "").trim();
    const result = await publishedService.getPage(slug, repoRoot);
    if (result.isNotFound) {
      reply.header("Content-Type", "text/html; charset=utf-8");
      return reply.status(404).type("text/html").send(result.html);
    }
    reply.header("Content-Type", "text/html; charset=utf-8");
    return reply.send(result.html);
  });
};

export default publishedRoutes;
