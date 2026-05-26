import { NextRequest } from "next/server";
import { ok, err, requireAuth, parseBody } from "@/lib/api";
import { getVitrineById, updateVitrine } from "@/lib/vitrines.service";
import type { VitrineStatus } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth();
  if (guard) return guard;

  const { id } = await params;
  const vitrine = await getVitrineById(id);
  if (!vitrine) return err("Vitrine não encontrada", 404);
  return ok(vitrine);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth();
  if (guard) return guard;

  const { id } = await params;
  const body = await parseBody<{ title?: string; description?: string; slug?: string; status?: VitrineStatus }>(req);
  const vitrine = await updateVitrine(id, body);
  if (!vitrine) return err("Vitrine não encontrada", 404);
  return ok(vitrine);
}
