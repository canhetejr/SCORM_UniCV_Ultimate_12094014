import { NextRequest } from "next/server";
import { ok, err, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import { vimeoGet, extractEmbedHash } from "@/lib/vimeo.service";
import { addVideoToVitrine, createVitrine } from "@/lib/vitrines.service";

interface VimeoVideo {
  uri: string; name?: string; duration?: number;
  pictures?: { sizes?: { link?: string }[] };
  player_embed_url?: string; embed?: { html?: string };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (guard) return guard;

  const { id: showcaseId } = await params;
  const accountId = await getOrCreateAccount();
  const conn = await prisma.vimeoConnection.findFirst({ where: { accountId } });
  if (!conn) return err("Vimeo não conectado", 400, "vimeo_disconnected");

  try {
    const userId = conn.vimeoUserId;
    const showcasePath = userId
      ? `/users/${userId}/albums/${showcaseId}`
      : `/me/albums/${showcaseId}`;
    const showcase = await vimeoGet<{ name?: string; description?: string }>(showcasePath, conn.accessToken);

    const vitrine = await createVitrine({
      title: showcase.name ?? `Showcase ${showcaseId}`,
      description: showcase.description,
    });

    const videosPath = userId
      ? `/users/${userId}/albums/${showcaseId}/videos?per_page=100&fields=uri,name,duration,pictures,player_embed_url,embed`
      : `/me/albums/${showcaseId}/videos?per_page=100&fields=uri,name,duration,pictures,player_embed_url,embed`;
    const videosData = await vimeoGet<{ data?: VimeoVideo[] }>(videosPath, conn.accessToken);

    for (const v of videosData.data ?? []) {
      const vimeoId = v.uri.replace("/videos/", "");
      const sizes = v.pictures?.sizes ?? [];
      const thumb = sizes[sizes.length - 1]?.link ?? sizes[0]?.link;
      const embedHash = v.embed?.html ? extractEmbedHash(v.embed.html) : undefined;
      await addVideoToVitrine(vitrine.id, vimeoId, {
        title: v.name ?? vimeoId,
        thumbnailUrl: thumb,
        durationSec: v.duration,
        playerUrl: v.player_embed_url,
        embedHash,
      });
    }

    return ok({ vitrine, imported: videosData.data?.length ?? 0 }, 201);
  } catch (e) {
    const error = e as { message?: string; code?: string };
    return err(error.message ?? "Erro ao importar", 502, error.code);
  }
}
