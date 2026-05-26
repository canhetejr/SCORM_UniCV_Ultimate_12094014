import { NextRequest } from "next/server";
import { ok, err, requireAuth, parseBody } from "@/lib/api";
import { addVideoToVitrine } from "@/lib/vitrines.service";
import { vimeoGet } from "@/lib/vimeo.service";
import { getOrCreateAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth();
  if (guard) return guard;

  const { id: vitrineId } = await params;
  const body = await parseBody<{ vimeo_video_id?: string; url?: string }>(req);

  let vimeoVideoId = body.vimeo_video_id;
  if (!vimeoVideoId && body.url) {
    const match = body.url.match(/vimeo\.com\/(\d+)/);
    vimeoVideoId = match?.[1];
  }
  if (!vimeoVideoId) return err("vimeo_video_id é obrigatório", 400);

  // Try to fetch metadata from Vimeo if connection exists
  let meta: { title?: string; thumbnailUrl?: string; durationSec?: number; embedHash?: string; playerUrl?: string } = {};
  try {
    const accountId = await getOrCreateAccount();
    const conn = await prisma.vimeoConnection.findFirst({ where: { accountId } });
    if (conn) {
      const data = await vimeoGet<{
        name?: string; duration?: number;
        pictures?: { sizes?: { link?: string }[] };
        player_embed_url?: string;
        embed?: { html?: string };
      }>(`/videos/${vimeoVideoId}`, conn.accessToken);
      const sizes = data.pictures?.sizes ?? [];
      const thumb = sizes[sizes.length - 1]?.link ?? sizes[0]?.link;
      let embedHash: string | undefined;
      const html = data.embed?.html ?? "";
      const hashMatch = html.match(/[?&]h=([a-zA-Z0-9]+)/);
      if (hashMatch) embedHash = hashMatch[1];
      meta = {
        title: data.name,
        thumbnailUrl: thumb,
        durationSec: data.duration,
        playerUrl: data.player_embed_url,
        embedHash,
      };
    }
  } catch { /* skip */ }

  const result = await addVideoToVitrine(vitrineId, vimeoVideoId, meta);
  if (!result) return err("Vitrine não encontrada", 404);
  return ok(result, 201);
}
