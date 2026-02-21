import fs from "node:fs";
import path from "node:path";
import { NotFoundError } from "../../shared/errors/AppError.js";
import { findVitrineBySlug, findVitrineBySlugWithVideos } from "./published.repository.js";

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

/**
 * Retorna a lista de vídeos da vitrine publicada (slug + status ACTIVE).
 * Lança NotFoundError se slug vazio, vitrine não existir ou não estiver ACTIVE.
 */
export async function getConfig(slug: string): Promise<{ videos: Array<{ id: string; name: string; thumb: string; duration: number; hash?: string }> }> {
  const s = String(slug ?? "").trim();
  if (!s) throw new NotFoundError("Slug é obrigatório.");

  const vitrine = await findVitrineBySlugWithVideos(s);
  if (!vitrine) throw new NotFoundError("Vitrine não encontrada.");
  if (vitrine.status !== "ACTIVE") throw new NotFoundError("Vitrine indisponível.");

  const videos = vitrine.videos.map((vv) => ({
    id: vv.video.vimeoVideoId,
    name: vv.video.title,
    thumb: vv.video.thumbnailUrl || "",
    duration: vv.video.durationSec ?? 0,
    hash: vv.video.embedHash || undefined,
  }));

  return { videos };
}

export type GetPageResult =
  | { isNotFound: true; html: string }
  | { isNotFound: false; html: string };

/**
 * Retorna HTML da página do player (vitrine publicada) ou HTML de "indisponível".
 * repoRoot: diretório onde está index.html (ex.: deps.repoRoot).
 */
export async function getPage(slug: string, repoRoot: string): Promise<GetPageResult> {
  const s = String(slug ?? "").trim();
  if (!s) return { isNotFound: true, html: UNAVAILABLE_HTML };

  const vitrine = await findVitrineBySlug(s);
  if (!vitrine || vitrine.status !== "ACTIVE") {
    return { isNotFound: true, html: UNAVAILABLE_HTML };
  }

  const template = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
  const config = {
    VITRINE_ID: vitrine.id,
    N8N_BASE: "/v1/playlist",
    N8N_API_TOKEN: "",
  };
  let html = template.replace("/* __UNICV_CONFIG__ */", `window.UniCV_CONFIG=${JSON.stringify(config)};`);
  html = html.replace("<head>", "<head><base href=\"/player/\">");

  return { isNotFound: false, html };
}
