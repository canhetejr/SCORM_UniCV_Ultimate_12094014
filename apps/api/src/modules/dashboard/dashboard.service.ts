import { BadRequestError } from "../../shared/errors/AppError.js";
import { createDashboardEvent, getSummaryData } from "./dashboard.repository.js";

export type CreateEventParams = {
  accountId: string;
  type: string;
  source?: string | null;
  payload?: Record<string, unknown> | null;
};

export type CreateEventResult = {
  ok: true;
  id: string;
};

/**
 * Registra um evento de dashboard. Lança BadRequestError se type estiver vazio.
 */
export async function createEvent(params: CreateEventParams): Promise<CreateEventResult> {
  const type = String(params.type ?? "").trim();
  if (!type) throw new BadRequestError("type é obrigatório.");

  const source =
    typeof params.source === "string" ? params.source.trim() || null : null;
  const payload =
    params.payload != null && typeof params.payload === "object"
      ? params.payload
      : null;

  const event = await createDashboardEvent({
    accountId: params.accountId,
    type,
    source,
    payload: payload as object | null,
  });

  return { ok: true, id: event.id };
}

export type GetSummaryParams = {
  days?: number;
  typeFilter?: string | null;
  sourceFilter?: string | null;
};

export type GetSummaryResult = {
  since: string;
  days: number;
  total: number;
  byType: Array<{ type: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  byDay: Array<{ date: string; count: number }>;
  filterTypes: string[];
  filterSources: string[];
  recent: Array<{
    id: string;
    type: string;
    source: string | null;
    payload: unknown;
    createdAt: string;
  }>;
};

/**
 * Retorna o resumo agregado do dashboard para o período (days, 1–90).
 * Combina e transforma os dados do repository.
 */
export async function getSummary(params: GetSummaryParams): Promise<GetSummaryResult> {
  const days = Math.min(
    90,
    Math.max(1, typeof params.days === "number" ? params.days : parseInt(String(params.days ?? "30"), 10) || 30)
  );
  const typeFilter =
    typeof params.typeFilter === "string" && params.typeFilter.trim()
      ? params.typeFilter.trim()
      : null;
  const sourceFilter =
    typeof params.sourceFilter === "string" && params.sourceFilter.trim()
      ? params.sourceFilter.trim()
      : null;

  const now = new Date();
  const since = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days,
      0,
      0,
      0,
      0
    )
  );

  const raw = await getSummaryData({
    since,
    typeFilter,
    sourceFilter,
  });

  const byTypeMap = raw.byType
    .map((r) => ({ type: r.type, count: r._count.id }))
    .sort((a, b) => b.count - a.count);

  const bySourceMap = raw.bySource
    .filter((r) => r.source != null)
    .map((r) => ({ source: r.source!, count: r._count.id }))
    .sort((a, b) => b.count - a.count);

  const byDayMap = raw.byDay.map((r) => ({
    date: r.date,
    count: Number(r.count),
  }));

  const filterTypes = raw.filterTypes.map((r) => r.type).sort();
  const filterSources = raw.filterSources
    .filter((r) => r.source != null)
    .map((r) => r.source!)
    .sort();

  const recent = raw.recent.map((e) => ({
    id: e.id,
    type: e.type,
    source: e.source,
    payload: e.payload,
    createdAt: e.createdAt.toISOString(),
  }));

  return {
    since: since.toISOString(),
    days,
    total: raw.total,
    byType: byTypeMap,
    bySource: bySourceMap,
    byDay: byDayMap,
    filterTypes,
    filterSources,
    recent,
  };
}
