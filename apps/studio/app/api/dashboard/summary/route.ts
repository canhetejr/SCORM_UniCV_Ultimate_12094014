import { NextRequest } from "next/server";
import { ok, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";

export async function GET(req: NextRequest) {
  const guard = await requireAuth();
  if (guard) return guard;

  const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "30"), 90);
  const since = new Date(Date.now() - days * 86400_000);
  const accountId = await getOrCreateAccount();

  const events = await prisma.dashboardEvent.findMany({
    where: { accountId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const byType: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byDay: Record<string, number> = {};

  for (const e of events) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
    if (e.source) bySource[e.source] = (bySource[e.source] ?? 0) + 1;
    const day = e.createdAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }

  return ok({ byType, bySource, byDay, total: events.length, recent: events.slice(0, 10) });
}
