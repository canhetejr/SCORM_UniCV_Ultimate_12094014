import { NextRequest } from "next/server";
import { ok, err, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";

export async function POST(req: NextRequest) {
  const body = await parseBody<{ type?: string; source?: string; payload?: unknown }>(req);
  if (!body.type) return err("type é obrigatório", 400);

  const accountId = await getOrCreateAccount().catch(() => null);
  await prisma.dashboardEvent.create({
    data: {
      accountId,
      type: body.type,
      source: body.source,
      payload: body.payload ? (body.payload as import("@prisma/client").Prisma.JsonObject) : undefined,
    },
  });
  return ok({ ok: true }, 201);
}
