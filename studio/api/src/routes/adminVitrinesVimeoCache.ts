/**
 * Admin: vídeos do cache Vimeo para uma vitrine interna (por vimeoShowcaseId).
 * GET /admin/vitrines/:id/vimeo-cache/videos — listagem paginada (só banco).
 * POST /admin/vitrines/:id/vimeo-cache/apply — aplica cache na playlist interna.
 */

import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}
function err(code: string, message: string): { ok: false; error: { code: string; message: string } } {
  return { ok: false, error: { code, message } };
}

function thumbFromPictures(pictures: unknown): string | null {
  if (!pictures || typeof pictures !== "object") return null;
  const p = pictures as { sizes?: Array<{ link?: string; width?: number }> };
  const sizes = p.sizes;
  if (!Array.isArray(sizes) || sizes.length === 0) return null;
  const withLink = sizes.filter((s: { link?: string }) => s?.link);
  const sorted = [...withLink].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return sorted[0]?.link ?? null;
}

const adminVitrinesVimeoCacheRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

  app.get<{
    Params: { id: string };
    Querystring: { page?: string; perPage?: string; q?: string };
  }>("/:id/vimeo-cache/videos", async (req, reply) => {
    const id = String((req.params as { id?: string }).id ?? "").trim();
    if (!id) return reply.status(400).send(err("invalid_input", "id é obrigatório."));
    const page = Math.max(1, (parseInt(String((req.query as { page?: string }).page ?? "1"), 10) || 1));
    const perPage = Math.min(100, Math.max(1, (parseInt(String((req.query as { perPage?: string }).perPage ?? "24"), 10) || 24)));
    const q = String((req.query as { q?: string }).q ?? "").trim().toLowerCase();

    const vitrine = await prisma.vitrine.findFirst({ where: { id } });
    if (!vitrine) return reply.status(404).send(err("not_found", "Vitrine não encontrada."));
    if (!vitrine.vimeoShowcaseId) {
      return reply.send(ok({ items: [], page, perPage, total: 0 }));
    }

    const cached = await prisma.vimeoCollaboratorShowcase.findFirst({
      where: { vimeoShowcaseId: vitrine.vimeoShowcaseId }
    });
    if (!cached) return reply.send(ok({ items: [], page, perPage, total: 0 }));

    const whereJoin = {
      showcaseId: cached.id,
      removedAt: null as Date | null,
      video: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { vimeoVideoId: { contains: q, mode: "insensitive" as const } }
            ]
          }
        : undefined
    };
    const [links, total] = await Promise.all([
      prisma.vimeoCollaboratorShowcaseVideo.findMany({
        where: whereJoin,
        include: {
          video: {
            select: {
              id: true,
              vimeoVideoId: true,
              name: true,
              duration: true,
              link: true,
              pictures: true
            }
          }
        },
        orderBy: { position: "asc" },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      prisma.vimeoCollaboratorShowcaseVideo.count({ where: whereJoin })
    ]);

    const items = links.map((l) => ({
      id: l.video.id,
      vimeoVideoId: l.video.vimeoVideoId,
      name: l.video.name,
      duration: l.video.duration,
      link: l.video.link,
      thumbnailUrl: thumbFromPictures(l.video.pictures),
      position: l.position
    }));

    return reply.send(ok({ items, page, perPage, total }));
  });

  app.post<{ Params: { id: string } }>("/:id/vimeo-cache/apply", async (req, reply) => {
    const id = String((req.params as { id?: string }).id ?? "").trim();
    if (!id) return reply.status(400).send(err("invalid_input", "id é obrigatório."));

    const vitrine = await prisma.vitrine.findFirst({ where: { id } });
    if (!vitrine) return reply.status(404).send(err("not_found", "Vitrine não encontrada."));
    if (!vitrine.vimeoShowcaseId) {
      return reply.send(ok({ applied: 0, message: "Vitrine não está ligada a um showcase Vimeo." }));
    }

    const cached = await prisma.vimeoCollaboratorShowcase.findFirst({
      where: { vimeoShowcaseId: vitrine.vimeoShowcaseId }
    });
    if (!cached) {
      return reply.send(ok({ applied: 0, message: "Nenhum cache encontrado para este showcase. Execute o sync do colaborador." }));
    }

    const links = await prisma.vimeoCollaboratorShowcaseVideo.findMany({
      where: { showcaseId: cached.id, removedAt: null },
      orderBy: { position: "asc" },
      include: { video: true }
    });

    const accountId = vitrine.accountId;
    await prisma.vitrineVideo.deleteMany({ where: { vitrineId: vitrine.id } });

    for (let position = 0; position < links.length; position++) {
      const link = links[position];
      const cv = link.video;
      const title = (cv.name ?? `Vídeo ${cv.vimeoVideoId}`).trim().slice(0, 500) || `Vídeo ${cv.vimeoVideoId}`;
      const thumb = thumbFromPictures(cv.pictures);
      const durationSec = cv.duration ?? null;

      const video = await prisma.video.upsert({
        where: { accountId_vimeoVideoId: { accountId, vimeoVideoId: cv.vimeoVideoId } },
        update: { title, thumbnailUrl: thumb, durationSec },
        create: {
          accountId,
          vimeoVideoId: cv.vimeoVideoId,
          title,
          thumbnailUrl: thumb,
          durationSec
        }
      });
      await prisma.vitrineVideo.create({
        data: { vitrineId: vitrine.id, videoId: video.id, position }
      });
    }

    return reply.send(ok({ applied: links.length }));
  });
};

export default adminVitrinesVimeoCacheRoutes;
