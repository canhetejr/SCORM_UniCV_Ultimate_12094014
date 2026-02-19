import { apiGet, apiPost } from "./base";

export type DashboardSummary = {
  since: string;
  days: number;
  total: number;
  totals?: { total: number; exports: number; syncs: number; imports: number };
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

export type DashboardFilters = {
  days?: number;
  type?: string;
  source?: string;
};

export async function getDashboardSummary(filters?: DashboardFilters): Promise<DashboardSummary> {
  const params = new URLSearchParams();
  if (filters?.days != null) params.set("days", String(filters.days));
  if (filters?.type?.trim()) params.set("type", filters.type.trim());
  if (filters?.source?.trim()) params.set("source", filters.source.trim());
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await apiGet<{ ok: true; data: DashboardSummary }>(`/v1/dashboard/summary${q}`);
  if (res && typeof res === "object" && "data" in res) return (res as { data: DashboardSummary }).data;
  return res as unknown as DashboardSummary;
}

export async function sendDashboardEvent(event: {
  type: string;
  source?: string;
  payload?: Record<string, unknown>;
}): Promise<{ ok: boolean; id: string }> {
  return apiPost<{ ok: boolean; id: string }>("/v1/dashboard/events", event);
}
