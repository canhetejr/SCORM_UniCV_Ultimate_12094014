import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
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
    const source = typeof body.source === "string" ? body.source.trim() : null;
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
  // Query: ?days=30&type=player_launch&source=studio
  app.get("/summary", async (req, reply) => {
    const q = req.query as { days?: string; type?: string; source?: string };
    const days = Math.min(90, Math.max(1, parseInt(q.days || "30", 10) || 30));
    const typeFilter = typeof q.type === "string" && q.type.trim() ? q.type.trim() : null;
    const sourceFilter = typeof q.source === "string" && q.source.trim() ? q.source.trim() : null;

    const now = new Date();
    const since = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days,
      0, 0, 0, 0
    ));

    const baseWhere: { createdAt: { gte: Date }; type?: string; source?: string } = {
      createdAt: { gte: since }
    };
    if (typeFilter) baseWhere.type = typeFilter;
    if (sourceFilter) baseWhere.source = sourceFilter;

    const dateOnlyWhere = { createdAt: { gte: since } };
    const whereParts = [Prisma.sql`"createdAt" >= ${since}`];
    if (typeFilter) whereParts.push(Prisma.sql`"type" = ${typeFilter}`);
    if (sourceFilter) whereParts.push(Prisma.sql`"source" = ${sourceFilter}`);
    const whereSql = Prisma.join(whereParts, " AND ");

    const [total, byType, bySource, byDay, recent, filterTypes, filterSources] = await Promise.all([
      prisma.dashboardEvent.count({ where: baseWhere }),
      prisma.dashboardEvent.groupBy({
        by: ["type"],
        where: baseWhere,
        _count: { id: true }
      }).then((rows) => rows.sort((a, b) => b._count.id - a._count.id)),
      prisma.dashboardEvent.groupBy({
        by: ["source"],
        where: baseWhere,
        _count: { id: true }
      }).then((rows) => rows.filter((r) => r.source != null).sort((a, b) => b._count.id - a._count.id)),
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>(
        Prisma.sql`
          SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC')::date::text AS date, count(*)::bigint AS count
          FROM "DashboardEvent"
          WHERE ${whereSql}
          GROUP BY date_trunc('day', "createdAt" AT TIME ZONE 'UTC')::date
          ORDER BY date ASC
        `
      ),
      prisma.dashboardEvent.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, type: true, source: true, payload: true, createdAt: true }
      }),
      prisma.dashboardEvent.groupBy({
        by: ["type"],
        where: dateOnlyWhere,
        _count: { id: true }
      }).then((rows) => rows.map((r) => r.type).sort()),
      prisma.dashboardEvent.groupBy({
        by: ["source"],
        where: dateOnlyWhere,
        _count: { id: true }
      }).then((rows) => rows.filter((r) => r.source != null).map((r) => r.source!).sort())
    ]);

    const byTypeMap = byType.map((r) => ({ type: r.type, count: r._count.id }));
    const bySourceMap = bySource.map((r) => ({ source: r.source!, count: r._count.id }));
    const byDayMap = byDay.map((r) => ({ date: r.date, count: Number(r.count) }));

    const totals = { total, exports: byTypeMap.find((x) => x.type === "export" || x.type === "export_scorm")?.count ?? 0, syncs: byTypeMap.find((x) => x.type === "vimeo_sync" || x.type === "sync")?.count ?? 0, imports: byTypeMap.find((x) => x.type === "import" || x.type === "import_json")?.count ?? 0 };

    return {
      ok: true as const,
      data: {
        since: since.toISOString(),
        days,
        total,
        totals,
        byType: byTypeMap,
        bySource: bySourceMap,
        byDay: byDayMap,
        filterTypes,
        filterSources,
        recent: recent.map((e) => ({
          id: e.id,
          type: e.type,
          source: e.source,
          payload: e.payload,
          createdAt: e.createdAt.toISOString()
        }))
      }
    };
  });
};

export default dashboardRoutes;
