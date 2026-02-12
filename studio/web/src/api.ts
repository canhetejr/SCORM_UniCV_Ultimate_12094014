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

export async function apiPost<T>(path: string, body?: unknown, contentType = "application/json"): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": contentType
    },
    body: body === undefined ? undefined : contentType.includes("json") ? JSON.stringify(body) : String(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

