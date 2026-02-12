import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type ScormExportInput = {
  title: string;
  apiBase: string;
  vitrineId: string;
  outputDir: string;
  selfContained: boolean;
};

type Templates = {
  indexHtml: string;
  manifestXml: string;
};

async function loadRepoTemplates(): Promise<Templates> {
  // Assume que este arquivo está em studio/api/dist ou studio/api/src
  const here = path.dirname(new URL(import.meta.url).pathname);
  // Windows: URL pathname pode começar com /C:/...
  const normalizedHere = process.platform === "win32" && here.startsWith("/") ? here.slice(1) : here;

  // repoRoot = .../SCORM_UniCV_Ultimate_12094014
  const repoRoot = path.resolve(normalizedHere, "..", "..", "..", "..");

  const indexHtml = await fsp.readFile(path.join(repoRoot, "index.html"), "utf8");
  const manifestXml = await fsp.readFile(path.join(repoRoot, "imsmanifest.xml"), "utf8");
  return { indexHtml, manifestXml };
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

  const apiBase = input.apiBase.replace(/\/+$/, "");
  const config = {
    // Para compatibilidade: ainda existe SHOWCASE_ID, mas usamos VITRINE_ID no modo VPS
    SHOWCASE_ID: "",
    VITRINE_ID: input.vitrineId,
    N8N_BASE: `${apiBase}/v1/playlist`,
    N8N_API_TOKEN: "",
    XAPI_URL: `${apiBase}/v1/xapi/statements`
  };

  const indexHtml = buildIndexHtml(templates.indexHtml, config);
  const manifestXml = buildManifest(templates.manifestXml, input.title);

  const safeName = input.title.replace(/[/\\:*?"<>|]/g, "_").replace(/\s+/g, "_");
  const zipName = `SCORM_${safeName}_${input.vitrineId}.zip`;
  const zipPath = path.join(input.outputDir, zipName);

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", (err) => {
      archive.destroy();
      reject(err);
    });
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.append(indexHtml, { name: "index.html" });
    archive.append(manifestXml, { name: "imsmanifest.xml" });

    if (input.selfContained) {
      const here = path.dirname(new URL(import.meta.url).pathname);
      const normalizedHere = process.platform === "win32" && here.startsWith("/") ? here.slice(1) : here;
      const repoRoot = path.resolve(normalizedHere, "..", "..", "..", "..");

      archive.file(path.join(repoRoot, "style.css"), { name: "style.css" });
      archive.file(path.join(repoRoot, "scorm.js"), { name: "scorm.js" });
      archive.directory(path.join(repoRoot, "css"), "css");
      archive.directory(path.join(repoRoot, "js"), "js");
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

  const apiBase = input.apiBase.replace(/\/+$/, "");
  const config = {
    SHOWCASE_ID: "",
    VITRINE_ID: input.vitrineId,
    N8N_BASE: `${apiBase}/v1/playlist`,
    N8N_API_TOKEN: "",
    XAPI_URL: `${apiBase}/v1/xapi/statements`
  };

  const indexHtml = buildIndexHtml(templates.indexHtml, config);

  const safeName = input.title.replace(/[/\\:*?"<>|]/g, "_").replace(/\s+/g, "_");
  const zipName = `HTML_${safeName}_${input.vitrineId}.zip`;
  const zipPath = path.join(input.outputDir, zipName);

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", (err) => {
      archive.destroy();
      reject(err);
    });
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.append(indexHtml, { name: "index.html" });

    if (input.selfContained) {
      const here = path.dirname(new URL(import.meta.url).pathname);
      const normalizedHere = process.platform === "win32" && here.startsWith("/") ? here.slice(1) : here;
      const repoRoot = path.resolve(normalizedHere, "..", "..", "..", "..");

      archive.file(path.join(repoRoot, "style.css"), { name: "style.css" });
      archive.file(path.join(repoRoot, "scorm.js"), { name: "scorm.js" });
      archive.directory(path.join(repoRoot, "css"), "css");
      archive.directory(path.join(repoRoot, "js"), "js");
    }

    archive.finalize().catch(reject);
  });

  return { zipPath };
}

