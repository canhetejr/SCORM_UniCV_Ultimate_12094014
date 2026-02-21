import { Prisma } from "@prisma/client";
import { prisma } from "../../infra/prisma/client.js";

export type CreateEventData = {
  accountId: string;
  type: string;
  source: string | null;
  payload: object | null;
};

/**
 * Cria um evento de dashboard. Retorna o evento criado com id.
 */
export async function createDashboardEvent(data: CreateEventData) {
  return prisma.dashboardEvent.create({
    data: {
      accountId: data.accountId,
      type: data.type,
      source: data.source,
      payload: data.payload ?? undefined,
    },
  });
}

export type SummaryFilters = {
  since: Date;
  typeFilter: string | null;
  sourceFilter: string | null;
};

export type SummaryRawResult = {
  total: number;
  byType: Array<{ type: string; _count: { id: number } }>;
  bySource: Array<{ source: string | null; _count: { id: number } }>;
  byDay: Array<{ date: string; count: bigint }>;
  recent: Array<{
    id: string;
    type: string;
    source: string | null;
    payload: unknown;
    createdAt: Date;
  }>;
  filterTypes: Array<{ type: string }>;
  filterSources: Array<{ source: string | null }>;
};

/**
 * Busca todos os dados brutos para o resumo do dashboard: count, groupBy por type/source,
 * agregação por dia (raw SQL), eventos recentes e listas de tipos/fontes para filtros.
 */
export async function getSummaryData(filters: SummaryFilters): Promise<SummaryRawResult> {
  const { since, typeFilter, sourceFilter } = filters;

  const baseWhere: { createdAt: { gte: Date }; type?: string; source?: string } = {
    createdAt: { gte: since },
  };
  if (typeFilter) baseWhere.type = typeFilter;
  if (sourceFilter) baseWhere.source = sourceFilter;

  const dateOnlyWhere = { createdAt: { gte: since } };
  const whereParts = [Prisma.sql`"createdAt" >= ${since}`];
  if (typeFilter) whereParts.push(Prisma.sql`"type" = ${typeFilter}`);
  if (sourceFilter) whereParts.push(Prisma.sql`"source" = ${sourceFilter}`);
  const whereSql = Prisma.join(whereParts, " AND ");

  const [total, byType, bySource, byDay, recent, filterTypesRows, filterSourcesRows] = await Promise.all([
    prisma.dashboardEvent.count({ where: baseWhere }),
    prisma.dashboardEvent.groupBy({
      by: ["type"],
      where: baseWhere,
      _count: { id: true },
    }),
    prisma.dashboardEvent.groupBy({
      by: ["source"],
      where: baseWhere,
      _count: { id: true },
    }),
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
      select: { id: true, type: true, source: true, payload: true, createdAt: true },
    }),
    prisma.dashboardEvent.groupBy({
      by: ["type"],
      where: dateOnlyWhere,
      _count: { id: true },
    }),
    prisma.dashboardEvent.groupBy({
      by: ["source"],
      where: dateOnlyWhere,
      _count: { id: true },
    }),
  ]);

  return {
    total,
    byType,
    bySource,
    byDay,
    recent,
    filterTypes: filterTypesRows.map((r) => ({ type: r.type })),
    filterSources: filterSourcesRows.map((r) => ({ source: r.source })),
  };
}
