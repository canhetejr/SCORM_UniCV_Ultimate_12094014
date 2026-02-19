/**
 * Sincronização do clone Vimeo: coleta showcases e vídeos com paginação e concorrência limitada.
 */

import { prisma } from "../db.js";
import { decryptToken } from "./cryptoTokens.js";
import {
  listAllAlbums,
  listAllAlbumVideos,
  extractAlbumIdFromUri,
  extractVideoIdFromUri,
  type AlbumItem,
  type VideoInAlbum,
  isVimeoClientError
} from "./vimeoClient.js";

const CONCURRENCY = 3;
const RAW_JSON_MAX_BYTES = 50_000;

function truncateRaw(obj: unknown): unknown {
  if (obj == null) return obj;
  const str = JSON.stringify(obj);
  if (Buffer.byteLength(str, "utf8") <= RAW_JSON_MAX_BYTES) return obj;
  return { _truncated: true, _size: str.length };
}

function parseOptionalDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type SyncResult = {
  showcasesUpserted: number;
  videosUpserted: number;
  linksUpserted: number;
  linksRemovedMarked: number;
};

export async function syncProfileFull(
  profileId: string,
  encryptionKey: string | undefined
): Promise<SyncResult> {
  const profile = await prisma.vimeoProfile.findUnique({
    where: { id: profileId }
  });
  if (!profile) throw new Error("Perfil não encontrado.");
  let accessToken: string;
  try {
    accessToken = decryptToken(profile.accessTokenEnc, encryptionKey);
  } catch (e) {
    await prisma.vimeoProfile.update({
      where: { id: profileId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "error",
        lastSyncMessage: "Falha ao descriptografar token."
      }
    });
    throw e;
  }

  const userId = profile.vimeoUserId;
  let showcasesUpserted = 0;
  let videosUpserted = 0;
  let linksUpserted = 0;
  let linksRemovedMarked = 0;

  try {
    const albums = await listAllAlbums(accessToken, userId);
    const add = (s: number, v: number, l: number, r: number) => {
      showcasesUpserted += s;
      videosUpserted += v;
      linksUpserted += l;
      linksRemovedMarked += r;
    };

    for (let i = 0; i < albums.length; i += CONCURRENCY) {
      const chunk = albums.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map((album) => {
          const albumId = extractAlbumIdFromUri(album.uri) ?? album.uri.replace(/\D/g, "") || "0";
          return processShowcase(profileId, accessToken, album, albumId, add);
        })
      );
    }

    await prisma.vimeoProfile.update({
      where: { id: profileId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "ok",
        lastSyncMessage: null
      }
    });
  } catch (e: unknown) {
    const message = isVimeoClientError(e)
      ? e.message
      : e instanceof Error
        ? e.message
        : "Erro desconhecido na sincronização.";
    await prisma.vimeoProfile.update({
      where: { id: profileId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "error",
        lastSyncMessage: message
      }
    });
    throw e;
  }

  return { showcasesUpserted, videosUpserted, linksUpserted, linksRemovedMarked };
}

async function processShowcase(
  profileId: string,
  accessToken: string,
  album: AlbumItem,
  albumId: string,
  add: (s: number, v: number, l: number, r: number) => void
): Promise<void> {
  const totalVideos = album.metadata?.connections?.videos?.total ?? null;
  const createdTime = parseOptionalDate(album.created_time ?? undefined);
  const modifiedTime = parseOptionalDate(album.modified_time ?? undefined);
  const pictures = album.pictures ? truncateRaw(album.pictures) : undefined;
  const raw = truncateRaw(album) as object;

  await prisma.$transaction(async (tx) => {
    const showcase = await tx.vimeoShowcase.upsert({
      where: { profileId_vimeoId: { profileId, vimeoId: albumId } },
      update: {
        uri: album.uri ?? undefined,
        name: album.name ?? undefined,
        description: album.description ?? undefined,
        privacy: album.privacy ?? undefined,
        createdTime: createdTime ?? undefined,
        modifiedTime: modifiedTime ?? undefined,
        totalVideos: totalVideos ?? undefined,
        pictures: pictures as object | undefined,
        raw: raw as object | undefined
      },
      create: {
        profileId,
        vimeoId: albumId,
        uri: album.uri,
        name: album.name,
        description: album.description,
        privacy: album.privacy,
        createdTime: createdTime ?? undefined,
        modifiedTime: modifiedTime ?? undefined,
        totalVideos: totalVideos ?? undefined,
        pictures: pictures as object | undefined,
        raw: raw as object | undefined
      }
    });

    const videos = await listAllAlbumVideos(accessToken, albumId);
    const seenVideoIds = new Set<string>();
    let position = 0;
    let linksUpsertedInShowcase = 0;
    for (const v of videos) {
      const videoId = extractVideoIdFromUri(v.uri) ?? v.uri.replace(/\D/g, "") || "";
      if (!videoId) continue;
      seenVideoIds.add(videoId);
      const link = v.link ?? (videoId ? `https://vimeo.com/${videoId}` : null);
      const embedHtml = v.embed?.html ?? undefined;
      const pics = v.pictures ? truncateRaw(v.pictures) : undefined;
      const rawV = truncateRaw(v) as object;
      const createdTimeV = parseOptionalDate(v.created_time ?? undefined);
      const modifiedTimeV = parseOptionalDate(v.modified_time ?? undefined);

      const video = await tx.vimeoVideo.upsert({
        where: { profileId_vimeoId: { profileId, vimeoId: videoId } },
        update: {
          uri: v.uri ?? undefined,
          name: v.name ?? undefined,
          description: v.description ?? undefined,
          duration: v.duration ?? undefined,
          link: link ?? undefined,
          embedHtml: embedHtml ?? undefined,
          privacy: v.privacy ?? undefined,
          createdTime: createdTimeV ?? undefined,
          modifiedTime: modifiedTimeV ?? undefined,
          pictures: pics as object | undefined,
          raw: rawV as object | undefined
        },
        create: {
          profileId,
          vimeoId: videoId,
          uri: v.uri,
          name: v.name,
          description: v.description,
          duration: v.duration,
          link: link ?? undefined,
          embedHtml: embedHtml ?? undefined,
          privacy: v.privacy,
          createdTime: createdTimeV ?? undefined,
          modifiedTime: modifiedTimeV ?? undefined,
          pictures: pics as object | undefined,
          raw: rawV as object | undefined
        }
      });

      await tx.vimeoShowcaseVideo.upsert({
        where: {
          showcaseId_videoId: { showcaseId: showcase.id, videoId: video.id }
        },
        update: {
          position,
          addedTime: new Date(),
          removedAt: null
        },
        create: {
          showcaseId: showcase.id,
          videoId: video.id,
          position,
          addedTime: new Date()
        }
      });
      linksUpsertedInShowcase++;
      position++;
    }

    const existingLinks = await tx.vimeoShowcaseVideo.findMany({
      where: { showcaseId: showcase.id, removedAt: null }
    });
    const currentVideoIds = new Set(
      (await tx.vimeoVideo.findMany({ where: { id: { in: existingLinks.map((l) => l.videoId) } }, select: { vimeoId: true } })).map(
        (x) => x.vimeoId
      )
    );
    let removed = 0;
    for (const vimeoId of currentVideoIds) {
      if (seenVideoIds.has(vimeoId)) continue;
      const vid = await tx.vimeoVideo.findFirst({ where: { profileId, vimeoId } });
      if (!vid) continue;
      await tx.vimeoShowcaseVideo.updateMany({
        where: { showcaseId: showcase.id, videoId: vid.id },
        data: { removedAt: new Date() }
      });
      removed++;
    }
    add(1, videos.length, linksUpsertedInShowcase, removed);
  });
}

/**
 * Incremental: re-sincroniza todos os showcases (igual full por simplicidade),
 * mas poderia no futuro só re-sincronizar showcases com modified_time alterado.
 */
export async function syncProfileIncremental(
  profileId: string,
  encryptionKey: string | undefined
): Promise<SyncResult> {
  return syncProfileFull(profileId, encryptionKey);
}
