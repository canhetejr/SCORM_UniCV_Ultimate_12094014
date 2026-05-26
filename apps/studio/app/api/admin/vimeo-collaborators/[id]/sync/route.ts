import { NextRequest } from "next/server";
import { ok, err, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import { vimeoGet, extractEmbedHash } from "@/lib/vimeo.service";

interface VimeoShowcase {
  uri: string; name?: string; description?: string;
  metadata?: { connections?: { videos?: { total?: number } } };
  modified_time?: string; pictures?: unknown;
}

interface VimeoVideo {
  uri: string; name?: string; duration?: number;
  pictures?: { sizes?: { link?: string }[] };
  player_embed_url?: string; embed?: { html?: string };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (guard) return guard;

  const { id } = await params;
  const collab = await prisma.vimeoCollaborator.findUnique({ where: { id } });
  if (!collab) return err("Colaborador não encontrado", 404);

  const accountId = await getOrCreateAccount();
  const conn = await prisma.vimeoConnection.findFirst({ where: { accountId } });
  if (!conn) return err("Vimeo não conectado", 400, "vimeo_disconnected");

  try {
    const showcasesData = await vimeoGet<{ data?: VimeoShowcase[] }>(
      `/users/${collab.vimeoUserId}/albums?per_page=100`,
      conn.accessToken
    );

    for (const s of showcasesData.data ?? []) {
      const showcaseId = s.uri.split("/").pop()!;
      const showcase = await prisma.vimeoCollaboratorShowcase.upsert({
        where: { collaboratorId_vimeoShowcaseId: { collaboratorId: id, vimeoShowcaseId: showcaseId } },
        create: {
          collaboratorId: id, vimeoShowcaseId: showcaseId,
          name: s.name, description: s.description,
          totalVideos: s.metadata?.connections?.videos?.total,
          modifiedTime: s.modified_time ? new Date(s.modified_time) : undefined,
          pictures: s.pictures ? s.pictures as import("@prisma/client").Prisma.JsonObject : undefined,
          raw: s as import("@prisma/client").Prisma.JsonObject,
          lastFetchedAt: new Date(),
        },
        update: {
          name: s.name, description: s.description,
          totalVideos: s.metadata?.connections?.videos?.total,
          lastFetchedAt: new Date(),
        },
      });

      const videosData = await vimeoGet<{ data?: VimeoVideo[] }>(
        `/users/${collab.vimeoUserId}/albums/${showcaseId}/videos?per_page=100&fields=uri,name,duration,pictures,player_embed_url,embed`,
        conn.accessToken
      );

      for (const v of videosData.data ?? []) {
        const videoId = v.uri.split("/").pop()!;
        const sizes = v.pictures?.sizes ?? [];
        const thumb = sizes[sizes.length - 1]?.link ?? sizes[0]?.link;
        const embedHash = v.embed?.html ? extractEmbedHash(v.embed.html) : undefined;

        const cv = await prisma.vimeoCollaboratorVideo.upsert({
          where: { collaboratorId_vimeoVideoId: { collaboratorId: id, vimeoVideoId: videoId } },
          create: {
            collaboratorId: id, vimeoVideoId: videoId,
            name: v.name, duration: v.duration,
            pictures: v.pictures ? v.pictures as import("@prisma/client").Prisma.JsonObject : undefined,
            playerUrl: v.player_embed_url,
            raw: v as import("@prisma/client").Prisma.JsonObject,
            lastFetchedAt: new Date(),
          },
          update: { name: v.name, duration: v.duration, lastFetchedAt: new Date() },
        });

        await prisma.vimeoCollaboratorShowcaseVideo.upsert({
          where: { showcaseId_videoId: { showcaseId: showcase.id, videoId: cv.id } },
          create: { showcaseId: showcase.id, videoId: cv.id },
          update: {},
        });
      }
    }

    const updated = await prisma.vimeoCollaborator.update({
      where: { id },
      data: { lastSyncAt: new Date(), lastSyncMsg: `${showcasesData.data?.length ?? 0} showcases` },
    });
    return ok(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao sincronizar";
    await prisma.vimeoCollaborator.update({ where: { id }, data: { lastSyncMsg: msg } });
    return err(msg, 502);
  }
}
