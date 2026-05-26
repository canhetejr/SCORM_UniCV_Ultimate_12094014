import { NextRequest } from "next/server";
import { ok, err, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth();
  if (guard) return guard;

  const { id } = await params;
  const accountId = await getOrCreateAccount();
  const job = await prisma.exportJob.findFirst({ where: { id, accountId } });
  if (!job) return err("Export não encontrado", 404);
  return ok(job);
}
