import { NextRequest } from "next/server";
import { ok, err, requireAuth, parseBody } from "@/lib/api";
import { getVitrinesList, createVitrine } from "@/lib/vitrines.service";

export async function GET(req: NextRequest) {
  const guard = await requireAuth();
  if (guard) return guard;

  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const vitrines = await getVitrinesList(q);
  return ok(vitrines);
}

export async function POST(req: NextRequest) {
  const guard = await requireAuth();
  if (guard) return guard;

  const body = await parseBody<{ title?: string; description?: string; slug?: string }>(req);
  if (!body.title?.trim()) return err("title é obrigatório", 400);

  const vitrine = await createVitrine({
    title: body.title.trim(),
    description: body.description,
    slug: body.slug,
  });
  return ok(vitrine, 201);
}
