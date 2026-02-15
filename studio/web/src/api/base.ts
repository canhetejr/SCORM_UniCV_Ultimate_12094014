declare global {
  interface Window {
    __UNICV_API_BASE?: string;
    __UNICV_PUBLIC_BASE_URL?: string;
  }
}

export const API_BASE =
  (typeof window !== "undefined" && window.__UNICV_API_BASE) ||
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ||
  (import.meta as any).env?.VITE_API_BASE?.toString?.() ||
  "http://localhost:3001";

/** URL pública do player (links partilháveis). Em produção use PUBLIC_BASE_URL; em dev faz fallback para API_BASE. */
export const PUBLIC_BASE_URL =
  (typeof window !== "undefined" && window.__UNICV_PUBLIC_BASE_URL) ||
  (import.meta as any).env?.VITE_PUBLIC_BASE_URL?.toString?.() ||
  API_BASE;

const AUTH_TOKEN_KEY = "unicv_admin_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(AUTH_TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ApiError = { message: string; code?: string; details?: string };

function isVimeoErrorCode(c?: string): boolean {
  return c === "vimeo_disconnected" || c === "vimeo_rate_limit" || c === "vimeo_unavailable" || c === "vimeo_error";
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    try {
      const j = JSON.parse(text) as { message?: string; code?: string; details?: string };
      if (res.status === 401 && !isVimeoErrorCode(j?.code)) clearAuthToken();
      if (j && typeof j.message === "string") {
        const err = new Error(j.message) as Error & ApiError;
        err.code = j.code;
        err.details = j.details;
        throw err;
      }
    } catch (e: unknown) {
      if (e instanceof Error && "code" in e) throw e;
      if (res.status === 401) clearAuthToken();
      throw new Error(text || res.statusText);
    }
    throw new Error(text || res.statusText);
  }
  return JSON.parse(text || "null") as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { ...authHeaders() }
  });
  return handleResponse<T>(res);
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
      "Content-Type": contentType,
      ...authHeaders()
    },
    body:
      body === undefined && !contentType.includes("json")
        ? undefined
        : contentType.includes("json")
          ? JSON.stringify(body ?? {})
          : String(body ?? "")
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...authHeaders() }
  });
  return handleResponse<T>(res);
}
