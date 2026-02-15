import { apiGet, apiPost } from "./base";

export type DashboardSummary = {
  since: string;
  days: number;
  total: number;
  byType: Array<{ type: string; count: number }>;
  byDay: Array<{ date: string; count: number }>;
  recent: Array<{
    id: string;
    type: string;
    source: string | null;
    payload: unknown;
    createdAt: string;
  }>;
};

export async function getDashboardSummary(days?: number): Promise<DashboardSummary> {
  const q = days != null ? `?days=${days}` : "";
  return apiGet<DashboardSummary>(`/v1/dashboard/summary${q}`);
}

export async function sendDashboardEvent(event: {
  type: string;
  source?: string;
  payload?: Record<string, unknown>;
}): Promise<{ ok: boolean; id: string }> {
  return apiPost<{ ok: boolean; id: string }>("/v1/dashboard/events", event);
}
