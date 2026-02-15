import fs from "node:fs";
import path from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

const UNAVAILABLE_HTML = `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vitrine indisponível</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f3f4f6; color: #374151; }
    .box { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; }
    h1 { margin: 0 0 0.5rem; font-size: 1.25rem; }
    p { margin: 0; color: #6b7280; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Vitrine indisponível</h1>
    <p>Esta vitrine não está publicada no momento.</p>
  </div>
</body>
</html>`;

const publishedRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;
  const { repoRoot } = deps;

  app.get("/:slug/config", async (req, reply) => {
    const slug = String((req.params as { slug?: string }).slug || "").trim();
    if (!slug) return reply.status(404).send({ code: "not_found", message: "Slug é obrigatório." });

    const vitrine = await prisma.vitrine.findFirst({
      where: { slug },
      include: {
        videos: {
          orderBy: { position: "asc" },
          include: { video: true }
        }
      }
    });

    if (!vitrine) {
      return reply.status(404).send({ code: "not_found", message: "Vitrine não encontrada." });
    }

    if (vitrine.status !== "ACTIVE") {
      return reply.status(404).send({ code: "unavailable", message: "Vitrine indisponível." });
    }

    const videos = vitrine.videos.map((vv) => ({
      id: vv.video.vimeoVideoId,
      name: vv.video.title,
      thumb: vv.video.thumbnailUrl || "",
      duration: vv.video.durationSec ?? 0,
      hash: vv.video.embedHash || undefined
    }));

    return { videos };
  });

  app.get("/:slug", async (req, reply) => {
    const slug = String((req.params as { slug?: string }).slug || "").trim();
    if (!slug) return reply.status(404).send("Not found");

    const vitrine = await prisma.vitrine.findFirst({
      where: { slug }
    });

    if (!vitrine) {
      return reply.status(404).type("text/html").send(UNAVAILABLE_HTML);
    }

    if (vitrine.status !== "ACTIVE") {
      return reply.status(404).type("text/html").send(UNAVAILABLE_HTML);
    }

    const template = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
    const config = {
      VITRINE_ID: vitrine.id,
      N8N_BASE: "/v1/playlist",
      N8N_API_TOKEN: ""
    };
    let html = template.replace("/* __UNICV_CONFIG__ */", `window.UniCV_CONFIG=${JSON.stringify(config)};`);
    html = html.replace("<head>", "<head><base href=\"/player/\">");

    reply.header("Content-Type", "text/html; charset=utf-8");
    return reply.send(html);
  });
};

export default publishedRoutes;
