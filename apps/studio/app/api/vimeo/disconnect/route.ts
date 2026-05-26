import { ok, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";

export async function POST() {
  const guard = await requireAuth();
  if (guard) return guard;

  const accountId = await getOrCreateAccount();
  await prisma.vimeoConnection.deleteMany({ where: { accountId } });
  return ok({ ok: true });
}
