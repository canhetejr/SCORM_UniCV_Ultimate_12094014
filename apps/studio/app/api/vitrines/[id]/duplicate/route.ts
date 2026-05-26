import { NextRequest } from "next/server";
import { ok, err, requireAuth } from "@/lib/api";
import { duplicateVitrine } from "@/lib/vitrines.service";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth();
  if (guard) return guard;

  const { id } = await params;
  const copy = await duplicateVitrine(id);
  if (!copy) return err("Vitrine não encontrada", 404);
  return ok(copy, 201);
}
