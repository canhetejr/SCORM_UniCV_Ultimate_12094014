import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const accountId = await getOrCreateAccount();
  const since = new Date(Date.now() - 30 * 86400_000);

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

  return (
    <DashboardClient
      byType={byType}
      bySource={bySource}
      byDay={byDay}
      total={events.length}
      recent={events.slice(0, 10).map((e) => ({
        id: e.id, type: e.type, source: e.source, createdAt: e.createdAt.toISOString(),
      }))}
    />
  );
}
