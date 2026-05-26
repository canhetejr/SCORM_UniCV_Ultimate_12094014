import path from "path";
import fs from "fs";
import archiver from "archiver";
import { createWriteStream } from "fs";
import { prisma } from "./prisma";
import { getOrCreateAccount } from "./account";

const EXPORTS_DIR = process.env.EXPORTS_DIR ?? "/tmp/exports";
const PLAYER_DIR = path.join(process.cwd(), "public", "player");

function ensureExportsDir() {
  if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

export function buildIframeSnippet(vitrineId: string): string {
  const base = process.env.PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `<iframe src="${base}/player?vitrine_id=${vitrineId}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
}

function buildPlayerConfig(vitrineId: string, videos: {
  id: string; vimeoVideoId: string; title: string;
  thumbnailUrl?: string | null; durationSec?: number | null; embedHash?: string | null;
}[]): string {
  const base = process.env.PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `window.__UNICV_CONFIG = ${JSON.stringify({
    vitrine_id: vitrineId,
    api_base: base,
    xapi_url: `${base}/api/xapi/statements`,
    videos: videos.map((v, i) => ({
      id: v.vimeoVideoId,
      title: v.title,
      thumb: v.thumbnailUrl,
      duration: v.durationSec,
      hash: v.embedHash,
      position: i,
    })),
  })};`;
}

export async function exportScorm12Zip(vitrineId: string): Promise<string> {
  ensureExportsDir();
  const accountId = await getOrCreateAccount();
  const vitrine = await prisma.vitrine.findFirst({
    where: { id: vitrineId, accountId },
    include: { videos: { orderBy: { position: "asc" }, include: { video: true } } },
  });
  if (!vitrine) throw new Error("Vitrine não encontrada");

  const fileName = `scorm12-${vitrineId}-${Date.now()}.zip`;
  const outPath = path.join(EXPORTS_DIR, fileName);

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 6 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    const videos = vitrine.videos.map((vv) => vv.video);
    const configJs = buildPlayerConfig(vitrineId, videos);

    // imsmanifest.xml
    archive.append(buildImsManifest(vitrine.title, vitrineId), { name: "imsmanifest.xml" });

    // config.js (injected)
    archive.append(configJs, { name: "config.js" });

    // Copy player assets if available
    if (fs.existsSync(PLAYER_DIR)) {
      archive.directory(PLAYER_DIR, false);
    } else {
      archive.append(buildFallbackHtml(vitrine.title), { name: "index.html" });
    }

    archive.finalize();
  });

  return outPath;
}

export async function exportHtmlZip(vitrineId: string): Promise<string> {
  ensureExportsDir();
  const accountId = await getOrCreateAccount();
  const vitrine = await prisma.vitrine.findFirst({
    where: { id: vitrineId, accountId },
    include: { videos: { orderBy: { position: "asc" }, include: { video: true } } },
  });
  if (!vitrine) throw new Error("Vitrine não encontrada");

  const fileName = `html-${vitrineId}-${Date.now()}.zip`;
  const outPath = path.join(EXPORTS_DIR, fileName);

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 6 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    const videos = vitrine.videos.map((vv) => vv.video);
    const configJs = buildPlayerConfig(vitrineId, videos);
    archive.append(configJs, { name: "config.js" });

    if (fs.existsSync(PLAYER_DIR)) {
      archive.directory(PLAYER_DIR, false);
    } else {
      archive.append(buildFallbackHtml(vitrine.title), { name: "index.html" });
    }

    archive.finalize();
  });

  return outPath;
}

function buildFallbackHtml(title: string): string {
  return `<!DOCTYPE html><html><head><title>${escHtml(title)}</title></head>
<body><script src="config.js"></script><p>Player não encontrado.</p></body></html>`;
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildImsManifest(title: string, id: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="unicv-${id}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${escHtml(title)}</title>
      <item identifier="ITEM-1" identifierref="RES-1" isvisible="true">
        <title>${escHtml(title)}</title>
        <adlcp:masteryscore>80</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
}
