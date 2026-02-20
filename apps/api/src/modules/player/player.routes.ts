import fs from "node:fs";
import path from "node:path";
import type { FastifyPluginAsync } from "fastify";
import type { ServerDeps } from "../../routes/deps.js";

const playerCssFiles = new Set(["base.css", "components.css", "layout.css", "responsive.css", "variables.css"]);
const playerJsFiles = new Set([
  "config.js",
  "state.js",
  "api.js",
  "scorm-service.js",
  "ui.js",
  "player.js",
  "theme.js",
  "main.js"
]);

const playerRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { repoRoot } = opts.deps;

  app.get("/", async (req, reply) => reply.redirect("/player/index.html"));

  app.get("/index.html", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const vitrineId = String(q.vitrine_id || "").trim();
    const showcaseId = String(q.showcase_id || q.id || "").trim();
    const template = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");

    const config = vitrineId
      ? { VITRINE_ID: vitrineId, N8N_BASE: "/v1/playlist", N8N_API_TOKEN: "" }
      : { SHOWCASE_ID: showcaseId || "", N8N_BASE: "/v1/playlist", N8N_API_TOKEN: "" };

    const html = template.replace("/* __UNICV_CONFIG__ */", `window.UniCV_CONFIG=${JSON.stringify(config)};`);
    reply.header("Content-Type", "text/html; charset=utf-8");
    return reply.send(html);
  });

  app.get("/style.css", async (req, reply) => {
    reply.header("Content-Type", "text/css; charset=utf-8");
    return reply.send(fs.createReadStream(path.join(repoRoot, "style.css")));
  });
  app.get("/scorm.js", async (req, reply) => {
    reply.header("Content-Type", "application/javascript; charset=utf-8");
    return reply.send(fs.createReadStream(path.join(repoRoot, "scorm.js")));
  });
  app.get("/css/:file", async (req, reply) => {
    const file = String((req.params as { file?: string }).file || "").trim();
    if (!playerCssFiles.has(file)) return reply.notFound();
    reply.header("Content-Type", "text/css; charset=utf-8");
    return reply.send(fs.createReadStream(path.join(repoRoot, "css", file)));
  });
  app.get("/js/:file", async (req, reply) => {
    const file = String((req.params as { file?: string }).file || "").trim();
    if (!playerJsFiles.has(file)) return reply.notFound();
    reply.header("Content-Type", "application/javascript; charset=utf-8");
    return reply.send(fs.createReadStream(path.join(repoRoot, "js", file)));
  });
};

export default playerRoutes;
