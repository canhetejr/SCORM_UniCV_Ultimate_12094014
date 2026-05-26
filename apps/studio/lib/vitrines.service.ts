import { prisma } from "./prisma";
import { getOrCreateAccount } from "./account";
import type { VitrineStatus, VitrineSource } from "@prisma/client";

function toKebab(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(accountId: string, base: string, excludeId?: string): Promise<string> {
  let slug = toKebab(base);
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.vitrine.findFirst({
      where: { accountId, slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (!existing) return candidate;
    suffix++;
  }
}

export async function getVitrinesList(q?: string) {
  const accountId = await getOrCreateAccount();
  const where = q
    ? { accountId, title: { contains: q, mode: "insensitive" as const } }
    : { accountId };
  return prisma.vitrine.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { videos: true } } },
  });
}

export async function createVitrine(data: { title: string; description?: string; slug?: string }) {
  const accountId = await getOrCreateAccount();
  const slug = await ensureUniqueSlug(accountId, data.slug || data.title);
  return prisma.vitrine.create({
    data: { ...data, slug, accountId },
  });
}

export async function getVitrineById(id: string) {
  const accountId = await getOrCreateAccount();
  return prisma.vitrine.findFirst({
    where: { id, accountId },
    include: {
      videos: {
        orderBy: { position: "asc" },
        include: { video: true },
      },
    },
  });
}

export async function updateVitrine(
  id: string,
  data: { title?: string; description?: string; slug?: string; status?: VitrineStatus }
) {
  const accountId = await getOrCreateAccount();
  const vitrine = await prisma.vitrine.findFirst({ where: { id, accountId } });
  if (!vitrine) return null;

  let slug = vitrine.slug;
  if (data.slug !== undefined) {
    slug = data.slug ? await ensureUniqueSlug(accountId, data.slug, id) : null;
  }

  return prisma.vitrine.update({ where: { id }, data: { ...data, slug } });
}

export async function duplicateVitrine(id: string) {
  const accountId = await getOrCreateAccount();
  const source = await getVitrineById(id);
  if (!source) return null;

  const newSlug = await ensureUniqueSlug(accountId, `${source.slug || source.title}-copia`);
  const copy = await prisma.vitrine.create({
    data: {
      accountId,
      title: `${source.title} (cópia)`,
      description: source.description,
      slug: newSlug,
      status: "EDITING" as VitrineStatus,
      vimeoSource: source.vimeoSource as VitrineSource,
    },
  });

  for (const vv of source.videos) {
    await prisma.vitrineVideo.create({
      data: { vitrineId: copy.id, videoId: vv.videoId, position: vv.position },
    });
  }
  return copy;
}

export async function addVideoToVitrine(vitrineId: string, vimeoVideoId: string, meta?: {
  title?: string; thumbnailUrl?: string; durationSec?: number; embedHash?: string; playerUrl?: string;
}) {
  const accountId = await getOrCreateAccount();
  const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId, accountId } });
  if (!vitrine) return null;

  let video = await prisma.video.findFirst({ where: { accountId, vimeoVideoId } });
  if (!video) {
    video = await prisma.video.create({
      data: { accountId, vimeoVideoId, title: meta?.title || vimeoVideoId, ...meta },
    });
  } else if (meta && Object.keys(meta).length > 0) {
    video = await prisma.video.update({ where: { id: video.id }, data: meta });
  }

  const maxPos = await prisma.vitrineVideo.aggregate({
    where: { vitrineId },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  const existing = await prisma.vitrineVideo.findFirst({ where: { vitrineId, videoId: video.id } });
  if (existing) return existing;

  return prisma.vitrineVideo.create({ data: { vitrineId, videoId: video.id, position } });
}

export async function removeVideoFromVitrine(vitrineId: string, videoId: string) {
  const accountId = await getOrCreateAccount();
  const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId, accountId } });
  if (!vitrine) return null;

  await prisma.vitrineVideo.deleteMany({ where: { vitrineId, videoId } });

  // Re-index positions
  const remaining = await prisma.vitrineVideo.findMany({
    where: { vitrineId },
    orderBy: { position: "asc" },
  });
  for (let i = 0; i < remaining.length; i++) {
    await prisma.vitrineVideo.update({ where: { id: remaining[i].id }, data: { position: i } });
  }
  return true;
}

export async function moveVideoInVitrine(vitrineId: string, videoId: string, direction: "up" | "down") {
  const accountId = await getOrCreateAccount();
  const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId, accountId } });
  if (!vitrine) return null;

  const all = await prisma.vitrineVideo.findMany({
    where: { vitrineId },
    orderBy: { position: "asc" },
  });
  const idx = all.findIndex((v) => v.videoId === videoId);
  if (idx === -1) return null;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return null;

  const a = all[idx];
  const b = all[swapIdx];
  await prisma.$transaction([
    prisma.vitrineVideo.update({ where: { id: a.id }, data: { position: b.position } }),
    prisma.vitrineVideo.update({ where: { id: b.id }, data: { position: a.position } }),
  ]);
  return true;
}
