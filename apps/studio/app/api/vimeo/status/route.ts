import { ok, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";

export async function GET() {
  const guard = await requireAuth();
  if (guard) return guard;

  const accountId = await getOrCreateAccount();
  const conn = await prisma.vimeoConnection.findFirst({ where: { accountId } });
  return ok({ connected: !!conn, vimeoUserId: conn?.vimeoUserId ?? null });
}
