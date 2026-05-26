import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const vitrineId = searchParams.get("vitrine_id");
  const showcaseId = searchParams.get("showcase_id");

  let vitrine = null;
  if (vitrineId) {
    vitrine = await prisma.vitrine.findUnique({
      where: { id: vitrineId },
      include: { videos: { orderBy: { position: "asc" }, include: { video: true } } },
    });
  } else if (showcaseId) {
    vitrine = await prisma.vitrine.findFirst({
      where: { vimeoShowcaseId: showcaseId },
      include: { videos: { orderBy: { position: "asc" }, include: { video: true } } },
    });
  }

  if (!vitrine) return err("Vitrine não encontrada", 404);
  if (vitrine.status !== "ACTIVE") return err("Vitrine inativa", 403);

  const videos = vitrine.videos.map((vv) => ({
    id: vv.video.vimeoVideoId,
    title: vv.video.title,
    thumb: vv.video.thumbnailUrl,
    duration: vv.video.durationSec,
    hash: vv.video.embedHash,
    position: vv.position,
  }));

  return ok({ vitrine_id: vitrine.id, title: vitrine.title, videos });
}
