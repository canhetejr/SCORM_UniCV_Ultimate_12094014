import { NextRequest } from "next/server";
import { ok, err, requireAuth, parseBody } from "@/lib/api";
import { removeVideoFromVitrine, moveVideoInVitrine } from "@/lib/vitrines.service";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  const guard = await requireAuth();
  if (guard) return guard;

  const { id: vitrineId, videoId } = await params;
  const result = await removeVideoFromVitrine(vitrineId, videoId);
  if (!result) return err("Não encontrado", 404);
  return ok({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  const guard = await requireAuth();
  if (guard) return guard;

  const { id: vitrineId, videoId } = await params;
  const body = await parseBody<{ direction?: "up" | "down" }>(req);
  if (!body.direction) return err("direction é obrigatório", 400);

  const result = await moveVideoInVitrine(vitrineId, videoId, body.direction);
  if (!result) return err("Não encontrado", 404);
  return ok({ ok: true });
}
