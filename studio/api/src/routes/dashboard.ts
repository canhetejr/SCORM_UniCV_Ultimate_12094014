import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

const dashboardRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

  // Coleta um evento e salva no banco
  app.post("/events", async (req, reply) => {
    const body = (req.body || {}) as { type?: string; source?: string; payload?: Record<string, unknown> };
    const type = String(body.type || "").trim();
    if (!type) return reply.badRequest("type é obrigatório.");

    const accountId = await deps.getDefaultAccountId();
    const source = typeof body.source === "string" ? body.source.trim() || null : null;
    const payload = body.payload != null && typeof body.payload === "object" ? body.payload : null;

    const event = await prisma.dashboardEvent.create({
      data: {
        accountId,
        type,
        source,
        payload: payload ? (payload as object) : undefined
      }
    });

    return { ok: true, id: event.id };
  });

  // Resumo agregado para o dashboard (últimos 30 dias por padrão)
  app.get("/summary", async (req, reply) => {
    const q = req.query as { days?: string };
    const days = Math.min(90, Math.max(1, parseInt(q.days || "30", 10) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [total, byType, byDay, recent] = await Promise.all([
      prisma.dashboardEvent.count({ where: { createdAt: { gte: since } } }),
      prisma.dashboardEvent.groupBy({
        by: ["type"],
        where: { createdAt: { gte: since } },
        _count: { id: true }
      }).then((rows) => rows.sort((a, b) => b._count.id - a._count.id)),
      prisma.$queryRaw<
        Array<{ date: string; count: bigint }>
      >`
        SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC')::date::text AS date, count(*)::bigint AS count
        FROM "DashboardEvent"
        WHERE "createdAt" >= ${since}
        GROUP BY date_trunc('day', "createdAt" AT TIME ZONE 'UTC')::date
        ORDER BY date ASC
      `,
      prisma.dashboardEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, type: true, source: true, payload: true, createdAt: true }
      })
    ]);

    const byTypeMap = byType.map((r) => ({ type: r.type, count: r._count.id }));
    const byDayMap = byDay.map((r) => ({ date: r.date, count: Number(r.count) }));

    return {
      since: since.toISOString(),
      days,
      total,
      byType: byTypeMap,
      byDay: byDayMap,
      recent: recent.map((e) => ({
        id: e.id,
        type: e.type,
        source: e.source,
        payload: e.payload,
        createdAt: e.createdAt.toISOString()
      }))
    };
  });
};

export default dashboardRoutes;
