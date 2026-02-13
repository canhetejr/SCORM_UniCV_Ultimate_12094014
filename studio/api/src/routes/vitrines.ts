import type { FastifyPluginAsync } from "fastify";
import { extractEmbedHash, vimeoGet } from "../services/vimeo.js";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

async function resolveVimeoVideoId(input: string): Promise<string> {
  const s = String(input || "").trim();
  if (!s) return "";
  if (/^\d+$/.test(s)) return s;
  const m = s.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m ? m[1] : "";
}

const vitrinesRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

  app.get("/vitrines", async () => {
    const vitrines = await prisma.vitrine.findMany({
      include: {
        account: { select: { id: true, name: true } },
        _count: { select: { videos: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    const normalized = vitrines.map((v) => {
      const { _count, ...rest } = v;
      return { ...rest, videoCount: _count.videos };
    });
    return { vitrines: normalized };
  });

  app.post("/vitrines", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const body = (req.body || {}) as { title?: string; description?: string };
    const title = String(body.title || "").trim();
    const description = body.description ? String(body.description) : null;
    if (!title) return reply.badRequest("title é obrigatório.");
    const vitrine = await prisma.vitrine.create({
      data: {
        accountId,
        title,
        description,
        vimeoSource: "MANUAL"
      }
    });
    return { vitrine };
  });

  app.get("/vitrines/:id", async (req, reply) => {
    const id = String((req.params as { id?: string }).id || "").trim();
    const vitrine = await prisma.vitrine.findFirst({
      where: { id },
      include: {
        account: { select: { id: true, name: true } },
        videos: {
          orderBy: { position: "asc" },
          include: { video: true }
        }
      }
    });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");
    return vitrine;
  });

  app.post("/vitrines/:id/videos", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const vitrineId = String((req.params as { id?: string }).id || "").trim();
    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");

    const body = (req.body || {}) as { vimeoVideoId?: string; url?: string; title?: string; embedHash?: string };
    const rawId = body.vimeoVideoId || body.url || "";
    const vimeoVideoId = await resolveVimeoVideoId(rawId);
    if (!vimeoVideoId) return reply.badRequest("Informe vimeoVideoId (ou url).");

    const manualTitle = body.title ? String(body.title).trim() : "";
    const manualHash = body.embedHash ? String(body.embedHash).trim() : "";

    const conn = await deps.getPrimaryVimeoConnection();
    let title = manualTitle || `Vídeo ${vimeoVideoId}`;
    let durationSec: number | null = null;
    let thumbnailUrl: string | null = null;
    let embedHash: string | null = manualHash || null;

    if (conn) {
      try {
        const v = await vimeoGet<{ name?: string; duration?: number; pictures?: { sizes?: Array<{ link: string }> }; player_embed_url?: string; embed?: { html?: string } }>({
          accessToken: conn.accessToken,
          path: `/videos/${encodeURIComponent(vimeoVideoId)}`
        });
        if (typeof v?.name === "string" && v.name.trim()) title = v.name.trim();
        if (typeof v?.duration === "number") durationSec = v.duration;
        const thumb = v?.pictures?.sizes?.[0]?.link;
        if (typeof thumb === "string") thumbnailUrl = thumb;
        const hash = extractEmbedHash({
          player_embed_url: v?.player_embed_url || null,
          embedHtml: v?.embed?.html || null
        });
        if (hash) embedHash = hash;
      } catch {
        // continua com dados manuais
      }
    }

    const video = await prisma.video.upsert({
      where: { accountId_vimeoVideoId: { accountId, vimeoVideoId } },
      update: {
        title,
        durationSec,
        thumbnailUrl,
        embedHash,
        playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
      },
      create: {
        accountId,
        vimeoVideoId,
        title,
        durationSec,
        thumbnailUrl,
        embedHash,
        playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
      }
    });

    const last = await prisma.vitrineVideo.findFirst({
      where: { vitrineId },
      orderBy: { position: "desc" }
    });
    const position = last ? last.position + 1 : 0;

    await prisma.vitrineVideo.create({
      data: { vitrineId, videoId: video.id, position }
    });

    return { ok: true };
  });

  app.post("/vitrines/:id/import/csv", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const vitrineId = String((req.params as { id?: string }).id || "").trim();
    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");

    const csvText = typeof req.body === "string" ? req.body : "";
    if (!csvText.trim()) return reply.badRequest("Envie o CSV como body (text/plain).");

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return reply.badRequest("CSV sem linhas suficientes.");
    const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const idxId = header.indexOf("vimeo_video_id");
    const idxUrl = header.indexOf("url");
    const idxTitle = header.indexOf("title");
    const idxHash = header.indexOf("embed_hash");
    if (idxId < 0 && idxUrl < 0) {
      return reply.badRequest("CSV deve ter coluna vimeo_video_id (ou url).");
    }

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const parts = parseCSVLine(lines[i]);
      const raw = idxId >= 0 ? parts[idxId] : parts[idxUrl];
      const vimeoVideoId = await resolveVimeoVideoId(raw || "");
      if (!vimeoVideoId) continue;

      const title = idxTitle >= 0 ? String(parts[idxTitle] || "").trim() : "";
      const embedHash = idxHash >= 0 ? String(parts[idxHash] || "").trim() : "";

      await prisma.$transaction(async (tx) => {
        const video = await tx.video.upsert({
          where: { accountId_vimeoVideoId: { accountId, vimeoVideoId } },
          update: {
            title: title || `Vídeo ${vimeoVideoId}`,
            embedHash: embedHash || null,
            playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
          },
          create: {
            accountId,
            vimeoVideoId,
            title: title || `Vídeo ${vimeoVideoId}`,
            embedHash: embedHash || null,
            playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
          }
        });

        const last = await tx.vitrineVideo.findFirst({
          where: { vitrineId },
          orderBy: { position: "desc" }
        });
        const position = last ? last.position + 1 : 0;
        await tx.vitrineVideo.create({
          data: { vitrineId, videoId: video.id, position }
        });
      });

      imported++;
    }

    return { ok: true, imported };
  });
};

export default vitrinesRoutes;
