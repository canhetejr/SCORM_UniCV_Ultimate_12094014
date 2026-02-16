import { apiGet, apiPost } from "./base";

export type DashboardSummary = {
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
  return apiGet<DashboardSummary>(`/v1/dashboard/summary${q}`);
}

export async function sendDashboardEvent(event: {
  type: string;
  source?: string;
  payload?: Record<string, unknown>;
}): Promise<{ ok: boolean; id: string }> {
  return apiPost<{ ok: boolean; id: string }>("/v1/dashboard/events", event);
}
