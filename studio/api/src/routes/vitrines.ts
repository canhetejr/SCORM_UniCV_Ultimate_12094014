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

function toKebab(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "vitrine";
}

async function ensureUniqueSlug(accountId: string, baseSlug: string, excludeId?: string): Promise<string> {
  let candidate = baseSlug;
  let n = 1;
  while (true) {
    const existing = await prisma.vitrine.findFirst({
      where: {
        slug: candidate,
        accountId,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    });
    if (!existing) return candidate;
    candidate = `${baseSlug}-${n++}`;
  }
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
    const body = (req.body || {}) as { title?: string; slug?: string; status?: string; description?: string };
    const title = String(body.title || "").trim();
    if (!title) return reply.badRequest("title é obrigatório.");

    const validStatuses = ["ACTIVE", "EDITING", "INACTIVE"];
    const statusStr = typeof body.status === "string" ? body.status.trim().toUpperCase() : "EDITING";
    const status = validStatuses.includes(statusStr) ? statusStr : "EDITING";

    let slug: string | null = typeof body.slug === "string" ? body.slug.trim() || null : null;
    if (!slug) {
      const baseSlug = toKebab(title);
      slug = await ensureUniqueSlug(accountId, baseSlug);
    } else {
      slug = await ensureUniqueSlug(accountId, toKebab(slug));
    }

    const description = body.description ? String(body.description) : null;

    const vitrine = await prisma.vitrine.create({
      data: {
        accountId,
        title,
        description,
        slug,
        status,
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

  app.put("/vitrines/:id", async (req, reply) => {
    const id = String((req.params as { id?: string }).id || "").trim();
    const vitrine = await prisma.vitrine.findFirst({ where: { id } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");

    const body = (req.body || {}) as { title?: string; slug?: string; status?: string };
    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const slug = typeof body.slug === "string" ? body.slug.trim() || null : undefined;
    const statusStr = typeof body.status === "string" ? body.status.trim().toUpperCase() : undefined;
    const validStatuses = ["ACTIVE", "EDITING", "INACTIVE"];
    const status = statusStr && validStatuses.includes(statusStr) ? statusStr : undefined;

    const data: { title?: string; slug?: string | null; status?: string } = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (status !== undefined) data.status = status;

    if (Object.keys(data).length === 0) return { vitrine };

    const updated = await prisma.vitrine.update({
      where: { id },
      data,
      include: {
        account: { select: { id: true, name: true } },
        videos: {
          orderBy: { position: "asc" },
          include: { video: true }
        }
      }
    });
    return { vitrine: updated };
  });

  app.post("/vitrines/:id/duplicate", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const id = String((req.params as { id?: string }).id || "").trim();
    const source = await prisma.vitrine.findFirst({
      where: { id },
      include: { videos: { orderBy: { position: "asc" } } }
    });
    if (!source) return reply.notFound("Vitrine não encontrada.");

    const newTitle = `${source.title} (cópia)`;
    const baseSlug = toKebab(source.title) + "-copia";
    const slug = await ensureUniqueSlug(accountId, baseSlug);

    const newVitrine = await prisma.vitrine.create({
      data: {
        accountId,
        title: newTitle,
        description: source.description,
        slug,
        status: "EDITING",
        vimeoSource: "MANUAL"
      }
    });

    for (let i = 0; i < source.videos.length; i++) {
      await prisma.vitrineVideo.create({
        data: {
          vitrineId: newVitrine.id,
          videoId: source.videos[i].videoId,
          position: i
        }
      });
    }

    const vitrine = await prisma.vitrine.findFirst({
      where: { id: newVitrine.id },
      include: {
        account: { select: { id: true, name: true } },
        videos: {
          orderBy: { position: "asc" },
          include: { video: true }
        }
      }
    });
    return { vitrine };
  });

  app.post("/vitrines/:id/videos", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const vitrineId = String((req.params as { id?: string }).id || "").trim();
    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");

    const body = (req.body || {}) as { vimeoVideoId?: string; url?: string; title?: string; embedHash?: string; thumbnailUrl?: string; thumbUrl?: string; durationSec?: number };
    const rawId = body.vimeoVideoId || body.url || "";
    const vimeoVideoId = await resolveVimeoVideoId(rawId);
    if (!vimeoVideoId) return reply.badRequest("Informe url (Vimeo).");

    const manualTitle = body.title ? String(body.title).trim() : "";
    if (!manualTitle) return reply.badRequest("title é obrigatório.");
    const manualThumb = typeof (body.thumbUrl ?? body.thumbnailUrl) === "string"
      ? String(body.thumbUrl ?? body.thumbnailUrl).trim() || null
      : null;
    const manualDuration = typeof body.durationSec === "number" && body.durationSec >= 0 ? body.durationSec : null;
    const manualHash = body.embedHash ? String(body.embedHash).trim() : "";

    const conn = await deps.getPrimaryVimeoConnection();
    let title = manualTitle || `Vídeo ${vimeoVideoId}`;
    let durationSec: number | null = manualDuration;
    let thumbnailUrl: string | null = manualThumb;

    let embedHash: string | null = manualHash || null;

    if (conn && (!manualThumb || manualDuration == null)) {
      try {
        const v = await vimeoGet<{ name?: string; duration?: number; pictures?: { sizes?: Array<{ link: string }> }; player_embed_url?: string; embed?: { html?: string } }>({
          accessToken: conn.accessToken,
          path: `/videos/${encodeURIComponent(vimeoVideoId)}`
        });
        if (typeof v?.name === "string" && v.name.trim()) title = v.name.trim();
        if (manualDuration == null && typeof v?.duration === "number") durationSec = v.duration;
        const thumb = v?.pictures?.sizes?.[0]?.link;
        if (!manualThumb && typeof thumb === "string") thumbnailUrl = thumb;
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

  app.delete("/vitrines/:id/videos/:videoId", async (req, reply) => {
    const vitrineId = String((req.params as { id?: string }).id || "").trim();
    const videoId = String((req.params as { videoId?: string }).videoId || "").trim();
    const vv = await prisma.vitrineVideo.findFirst({
      where: { vitrineId, videoId }
    });
    if (!vv) return reply.notFound("Vídeo não encontrado na playlist.");
    await prisma.vitrineVideo.delete({ where: { id: vv.id } });
    return { ok: true };
  });

  app.post("/vitrines/:id/videos/:videoId/move", async (req, reply) => {
    const vitrineId = String((req.params as { id?: string }).id || "").trim();
    const videoId = String((req.params as { videoId?: string }).videoId || "").trim();
    const body = (req.body || {}) as { direction?: string };
    const direction = (body.direction || "").toLowerCase();
    if (direction !== "up" && direction !== "down") {
      return reply.badRequest("direction deve ser 'up' ou 'down'.");
    }

    const current = await prisma.vitrineVideo.findFirst({
      where: { vitrineId, videoId }
    });
    if (!current) return reply.notFound("Vídeo não encontrado na playlist.");

    const delta = direction === "up" ? -1 : 1;
    const swapPosition = current.position + delta;
    const swap = await prisma.vitrineVideo.findFirst({
      where: { vitrineId, position: swapPosition }
    });
    if (!swap) return reply.badRequest("Não é possível mover nessa direção.");

    const tempPos = 999999;
    await prisma.$transaction([
      prisma.vitrineVideo.update({ where: { id: current.id }, data: { position: tempPos } }),
      prisma.vitrineVideo.update({ where: { id: swap.id }, data: { position: current.position } }),
      prisma.vitrineVideo.update({ where: { id: current.id }, data: { position: swapPosition } })
    ]);
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
