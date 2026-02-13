declare global {
  interface Window {
    __UNICV_API_BASE?: string;
  }
}

export const API_BASE =
  (typeof window !== "undefined" && window.__UNICV_API_BASE) ||
  (import.meta as any).env?.VITE_API_BASE?.toString?.() ||
  "http://localhost:3001";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  contentType = "application/json"
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": contentType
    },
    body:
      body === undefined && !contentType.includes("json")
        ? undefined
        : contentType.includes("json")
          ? JSON.stringify(body ?? {})
          : String(body ?? "")
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export type ConfigStatusResponse = {
  vimeo: { configured: boolean };
  lti: { platformConfigured: boolean; toolKeyConfigured: boolean };
  lrs: { configured: boolean };
};

export async function getConfigStatus(): Promise<ConfigStatusResponse> {
  return apiGet<ConfigStatusResponse>("/v1/config/status");
}

export type LtiConfigResponse = {
  tool: {
    initiate_login_url: string;
    redirect_uris: string[];
    jwks_url: string;
    launch_url: string;
    player_url?: string;
  };
};

export async function getLtiConfig(): Promise<LtiConfigResponse> {
  return apiGet<LtiConfigResponse>("/lti/config");
}

export type ConfigEnvItem = {
  key: string;
  value: string | null;
  masked: boolean;
  label: string;
};

export async function getConfigEnv(): Promise<{ items: ConfigEnvItem[] }> {
  return apiGet<{ items: ConfigEnvItem[] }>("/v1/config/env");
}

export async function putConfigEnv(updates: Record<string, string | null>): Promise<{ items: ConfigEnvItem[] }> {
  return apiPut<{ items: ConfigEnvItem[] }>("/v1/config/env", { updates });
}

// Dashboard — coleta e resumo de eventos
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
