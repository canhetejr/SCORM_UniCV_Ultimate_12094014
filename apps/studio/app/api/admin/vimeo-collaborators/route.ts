import { NextRequest } from "next/server";
import { ok, err, requireAuth, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guard = await requireAuth();
  if (guard) return guard;

  const collabs = await prisma.vimeoCollaborator.findMany({ orderBy: { createdAt: "desc" } });
  return ok(collabs);
}

export async function POST(req: NextRequest) {
  const guard = await requireAuth();
  if (guard) return guard;

  const body = await parseBody<{ vimeoUserId?: string; label?: string }>(req);
  if (!body.vimeoUserId?.trim()) return err("vimeoUserId é obrigatório", 400);

  const collab = await prisma.vimeoCollaborator.upsert({
    where: { vimeoUserId: body.vimeoUserId },
    create: { vimeoUserId: body.vimeoUserId, label: body.label },
    update: { label: body.label },
  });
  return ok(collab, 201);
}
