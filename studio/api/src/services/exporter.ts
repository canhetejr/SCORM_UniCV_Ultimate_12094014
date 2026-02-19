import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";
import { getRepoRoot } from "../lib/repoRoot.js";
import { escapeXml } from "../lib/xml.js";

export type ScormExportInput = {
  title: string;
  apiBase: string;
  vitrineId: string;
  outputDir: string;
  selfContained: boolean;
  /** URL direta da playlist (evita N8N/CORS no Moodle). Preferir sobre N8N_BASE. */
  playlistUrl?: string;
};

type Templates = {
  indexHtml: string;
  manifestXml: string;
};

async function loadRepoTemplates(): Promise<Templates> {
  const repoRoot = getRepoRoot();
  const indexHtml = await fsp.readFile(path.join(repoRoot, "index.html"), "utf8");
  const manifestXml = await fsp.readFile(path.join(repoRoot, "imsmanifest.xml"), "utf8");
  return { indexHtml, manifestXml };
}

function appendPlayerAssets(
  archive: ReturnType<typeof archiver>,
  repoRoot: string
): void {
  archive.file(path.join(repoRoot, "style.css"), { name: "style.css" });
  archive.file(path.join(repoRoot, "scorm.js"), { name: "scorm.js" });
  archive.directory(path.join(repoRoot, "css"), "css");
  archive.directory(path.join(repoRoot, "js"), "js");
}

function buildIndexHtml(template: string, config: Record<string, unknown>): string {
  const configInline = `window.UniCV_CONFIG=${JSON.stringify(config)};`;
  return template.replace("/* __UNICV_CONFIG__ */", configInline);
}

function buildManifest(template: string, title: string): string {
  return template.replace(
    /<title>UniCV Ultimate Player<\/title>/,
    `<title>${escapeXml(title)}</title>`
  );
}

export async function exportScorm12Zip(input: ScormExportInput): Promise<{ zipPath: string }> {
  await fsp.mkdir(input.outputDir, { recursive: true });
  const templates = await loadRepoTemplates();

  let apiBase = input.apiBase.replace(/\/+$/, "");
  if (/^http:\/\//i.test(apiBase)) apiBase = apiBase.replace(/^http:\/\//i, "https://");
  const config: Record<string, unknown> = {
    SHOWCASE_ID: "",
    VITRINE_ID: input.vitrineId,
    N8N_BASE: `${apiBase}/n8n/webhook/scorm`,
    N8N_API_TOKEN: "",
    XAPI_URL: `${apiBase}/v1/xapi/statements`
  };
  if (input.playlistUrl) config.PLAYLIST_URL = input.playlistUrl;

  const indexHtml = buildIndexHtml(templates.indexHtml, config);
  const manifestXml = buildManifest(templates.manifestXml, input.title);

  const safeName = input.title.replace(/[/\\:*?"<>|]/g, "_").replace(/\s+/g, "_");
  const zipName = `SCORM_${safeName}_${input.vitrineId}.zip`;
  const zipPath = path.join(input.outputDir, zipName);

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", (err: Error) => {
      archive.destroy();
      reject(err);
    });
    archive.on("error", (err: Error) => reject(err));

    archive.pipe(output);
    archive.append(indexHtml, { name: "index.html" });
    archive.append(manifestXml, { name: "imsmanifest.xml" });

    if (input.selfContained) {
      appendPlayerAssets(archive, getRepoRoot());
    } else {
      // Modo CDN: consumidor deve hospedar assets (GitHub Pages/jsDelivr etc.)
      // Neste MVP, deixamos a opção; o CDN base pode ser ajustado depois no template.
    }

    archive.finalize().catch(reject);
  });

  return { zipPath };
}

export function buildIframeSnippet(input: { apiBase: string; vitrineId: string; width?: number; height?: number }): string {
  const apiBase = input.apiBase.replace(/\/+$/, "");
  const w = input.width || 1280;
  const h = input.height || 720;
  const src = `${apiBase}/player/index.html?vitrine_id=${encodeURIComponent(input.vitrineId)}`;
  return `<iframe src="${src}" width="${w}" height="${h}" style="border:0" allow="fullscreen; autoplay" allowfullscreen></iframe>`;
}

export async function exportHtmlZip(input: ScormExportInput): Promise<{ zipPath: string }> {
  await fsp.mkdir(input.outputDir, { recursive: true });
  const templates = await loadRepoTemplates();

  let apiBase = input.apiBase.replace(/\/+$/, "");
  if (/^http:\/\//i.test(apiBase)) apiBase = apiBase.replace(/^http:\/\//i, "https://");
  const config: Record<string, unknown> = {
    SHOWCASE_ID: "",
    VITRINE_ID: input.vitrineId,
    N8N_BASE: `${apiBase}/n8n/webhook/scorm`,
    N8N_API_TOKEN: "",
    XAPI_URL: `${apiBase}/v1/xapi/statements`
  };
  if (input.playlistUrl) config.PLAYLIST_URL = input.playlistUrl;

  const indexHtml = buildIndexHtml(templates.indexHtml, config);

  const safeName = input.title.replace(/[/\\:*?"<>|]/g, "_").replace(/\s+/g, "_");
  const zipName = `HTML_${safeName}_${input.vitrineId}.zip`;
  const zipPath = path.join(input.outputDir, zipName);

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", (err: Error) => {
      archive.destroy();
      reject(err);
    });
    archive.on("error", (err: Error) => reject(err));

    archive.pipe(output);
    archive.append(indexHtml, { name: "index.html" });

    if (input.selfContained) {
      appendPlayerAssets(archive, getRepoRoot());
    }

    archive.finalize().catch(reject);
  });

  return { zipPath };
}

