import type { Prisma } from "@prisma/client";
import { prisma } from "../../infra/prisma/client.js";

export async function findAllVitrines() {
  return prisma.vitrine.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function findVitrineById(id: string) {
  return prisma.vitrine.findUnique({
    where: { id },
  });
}

export async function createVitrine(data: any) {
  return prisma.vitrine.create({
    data,
  });
}

export async function updateVitrine(id: string, data: any) {
  return prisma.vitrine.update({
    where: { id },
    data,
  });
}

export async function deleteVitrine(id: string) {
  return prisma.vitrine.delete({
    where: { id },
  });
}

// --- Funções extras para cobrir usos com include (sem alterar JSON das rotas) ---

export async function findVitrineBySlugAndAccount(slug: string, accountId: string, excludeId?: string) {
  return prisma.vitrine.findFirst({
    where: {
      slug,
      accountId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function findAllVitrinesWithAccountAndCount() {
  return prisma.vitrine.findMany({
    include: {
      account: { select: { id: true, name: true } },
      _count: { select: { videos: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findVitrineByIdWithAccountAndVideos(id: string) {
  return prisma.vitrine.findFirst({
    where: { id },
    include: {
      account: { select: { id: true, name: true } },
      videos: {
        orderBy: { position: "asc" },
        include: { video: true },
      },
    },
  });
}

export async function findVitrineByIdWithVideos(id: string) {
  return prisma.vitrine.findFirst({
    where: { id },
    include: { videos: { orderBy: { position: "asc" } } },
  });
}

export async function updateVitrineWithAccountAndVideos(id: string, data: any) {
  return prisma.vitrine.update({
    where: { id },
    data,
    include: {
      account: { select: { id: true, name: true } },
      videos: {
        orderBy: { position: "asc" },
        include: { video: true },
      },
    },
  });
}

// --- Encapsulamento de prisma.vitrineVideo.*, prisma.video.*, prisma.$transaction ---

export type UpsertVideoData = {
  accountId: string;
  vimeoVideoId: string;
  title: string;
  durationSec?: number | null;
  thumbnailUrl?: string | null;
  embedHash?: string | null;
  playerUrl?: string;
};

export async function upsertVideo(data: UpsertVideoData) {
  return prisma.video.upsert({
    where: { accountId_vimeoVideoId: { accountId: data.accountId, vimeoVideoId: data.vimeoVideoId } },
    update: {
      title: data.title,
      durationSec: data.durationSec ?? undefined,
      thumbnailUrl: data.thumbnailUrl ?? undefined,
      embedHash: data.embedHash ?? undefined,
      playerUrl: data.playerUrl ?? `https://player.vimeo.com/video/${data.vimeoVideoId}`,
    },
    create: {
      accountId: data.accountId,
      vimeoVideoId: data.vimeoVideoId,
      title: data.title,
      durationSec: data.durationSec ?? undefined,
      thumbnailUrl: data.thumbnailUrl ?? undefined,
      embedHash: data.embedHash ?? undefined,
      playerUrl: data.playerUrl ?? `https://player.vimeo.com/video/${data.vimeoVideoId}`,
    },
  });
}

export type AddVideoToVitrineItem = { videoId: string };

export async function addVideosToVitrine(vitrineId: string, videosData: AddVideoToVitrineItem[]) {
  if (videosData.length === 0) return;
  const last = await prisma.vitrineVideo.findFirst({
    where: { vitrineId },
    orderBy: { position: "desc" },
  });
  let position = last ? last.position + 1 : 0;
  for (const item of videosData) {
    await prisma.vitrineVideo.create({
      data: { vitrineId, videoId: item.videoId, position },
    });
    position++;
  }
}

export async function findVitrineVideo(vitrineId: string, videoId: string) {
  return prisma.vitrineVideo.findFirst({
    where: { vitrineId, videoId },
  });
}

export async function deleteVitrineVideo(id: string) {
  return prisma.vitrineVideo.delete({ where: { id } });
}

export async function removeVideosFromVitrine(vitrineId: string, videoIds: string[]) {
  for (const videoId of videoIds) {
    const vv = await prisma.vitrineVideo.findFirst({ where: { vitrineId, videoId } });
    if (vv) await prisma.vitrineVideo.delete({ where: { id: vv.id } });
  }
}

export type ImportVideosFromCsvRow = {
  accountId: string;
  vimeoVideoId: string;
  title?: string;
  embedHash?: string;
};

export async function importVideosFromCsv(vitrineId: string, parsedRows: ImportVideosFromCsvRow[]) {
  for (const row of parsedRows) {
    await prisma.$transaction(async (tx) => {
      const video = await tx.video.upsert({
        where: { accountId_vimeoVideoId: { accountId: row.accountId, vimeoVideoId: row.vimeoVideoId } },
        update: {
          title: row.title || `Vídeo ${row.vimeoVideoId}`,
          embedHash: row.embedHash || null,
          playerUrl: `https://player.vimeo.com/video/${row.vimeoVideoId}`,
        },
        create: {
          accountId: row.accountId,
          vimeoVideoId: row.vimeoVideoId,
          title: row.title || `Vídeo ${row.vimeoVideoId}`,
          embedHash: row.embedHash || null,
          playerUrl: `https://player.vimeo.com/video/${row.vimeoVideoId}`,
        },
      });
      const last = await tx.vitrineVideo.findFirst({
        where: { vitrineId },
        orderBy: { position: "desc" },
      });
      const position = last ? last.position + 1 : 0;
      await tx.vitrineVideo.create({
        data: { vitrineId, videoId: video.id, position },
      });
    });
  }
}

export type SourceVitrineVideo = { videoId: string };

export async function duplicateVitrineWithVideos(newVitrineId: string, sourceVideos: SourceVitrineVideo[]) {
  for (let i = 0; i < sourceVideos.length; i++) {
    await prisma.vitrineVideo.create({
      data: {
        vitrineId: newVitrineId,
        videoId: sourceVideos[i].videoId,
        position: i,
      },
    });
  }
}

export async function runVitrineTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(callback);
}

function findVitrineVideoByPosition(vitrineId: string, position: number) {
  return prisma.vitrineVideo.findFirst({
    where: { vitrineId, position },
  });
}

export async function moveVitrineVideo(vitrineId: string, videoId: string, direction: "up" | "down") {
  const current = await prisma.vitrineVideo.findFirst({
    where: { vitrineId, videoId },
  });
  if (!current) return false;
  const delta = direction === "up" ? -1 : 1;
  const swapPosition = current.position + delta;
  const swap = await findVitrineVideoByPosition(vitrineId, swapPosition);
  if (!swap) return false;
  const tempPos = 999999;
  await prisma.$transaction([
    prisma.vitrineVideo.update({ where: { id: current.id }, data: { position: tempPos } }),
    prisma.vitrineVideo.update({ where: { id: swap.id }, data: { position: current.position } }),
    prisma.vitrineVideo.update({ where: { id: current.id }, data: { position: swapPosition } }),
  ]);
  return true;
}
