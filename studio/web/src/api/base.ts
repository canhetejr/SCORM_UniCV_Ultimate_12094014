declare global {
  interface Window {
    __UNICV_API_BASE?: string;
    __UNICV_PUBLIC_BASE_URL?: string;
    __UNICV_LAST_FETCH_ERROR?: string;
  }
}

function ensureHttpsWhenSecure(url: string): string {
  if (typeof window === "undefined") return url;
  if (window.location.protocol !== "https:") return url;
  try {
    const u = new URL(url);
    const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol === "http:" && !isLocal) {
      u.protocol = "https:";
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return url;
}

function resolveApiBaseRaw(): string {
  if (typeof window !== "undefined" && window.__UNICV_API_BASE) {
    return window.__UNICV_API_BASE;
  }
  const vite = (import.meta as any).env?.VITE_API_BASE_URL ?? (import.meta as any).env?.VITE_API_BASE;
  if (vite && typeof vite === "string") return vite;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    const viteApi = (import.meta as any).env?.VITE_SERVICE_URL_API;
    const viteFqdn = (import.meta as any).env?.VITE_SERVICE_FQDN_API;
    if (viteApi && typeof viteApi === "string") return ensureHttpsWhenSecure(viteApi);
    if (viteFqdn && typeof viteFqdn === "string") {
      const base = `${protocol}//${viteFqdn}`;
      return ensureHttpsWhenSecure(base);
    }
    if (host.replace(/^www\./, "").includes("web") || host.includes("sslip.io")) {
      const apiHost = host.replace(/^web\./, "api.").replace(/\.web\./, ".api.");
      const isStandardPort = port === "80" || port === "443" || port === "";
      const apiPortSuffix = isStandardPort ? "" : (port ? `:${port}` : "");
      const base = `${protocol}//${apiHost !== host ? apiHost : host}${apiPortSuffix}`;
      return ensureHttpsWhenSecure(base);
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3002";
    }
    const isStandardPort = port === "80" || port === "443" || port === "";
    const sameOrigin = `${protocol}//${host}${isStandardPort ? "" : (port ? ":" + port : "")}`;
    return ensureHttpsWhenSecure(sameOrigin);
  }

  return "http://localhost:3002";
}

function resolvePublicBaseUrlRaw(): string {
  const fromEnv = (import.meta as any).env?.VITE_PUBLIC_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.__UNICV_PUBLIC_BASE_URL) {
    const w = window.__UNICV_PUBLIC_BASE_URL.trim().replace(/\/+$/, "");
    if (w) return w;
  }
  return getResolvedApiBase().replace(/\/+$/, "");
}

export function getResolvedApiBase(): string {
  return ensureHttpsWhenSecure(resolveApiBaseRaw());
}

export function getResolvedPublicBaseUrl(): string {
  return resolvePublicBaseUrlRaw();
}

/** @deprecated Use getResolvedApiBase() para obter a URL que o fetch usa. */
export const API_BASE = typeof window !== "undefined" ? getResolvedApiBase() : "http://localhost:3002";

/** @deprecated Use getResolvedPublicBaseUrl(). */
export const PUBLIC_BASE_URL = getResolvedPublicBaseUrl();

export function setLastFetchError(msg: string | undefined): void {
  if (typeof window !== "undefined") window.__UNICV_LAST_FETCH_ERROR = msg;
}

export function getLastFetchError(): string | undefined {
  return typeof window !== "undefined" ? window.__UNICV_LAST_FETCH_ERROR : undefined;
}

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

export type ApiError = { message: string; code?: string; details?: string; status?: number };

function isVimeoErrorCode(c?: string): boolean {
  return (
    c === "vimeo_disconnected" ||
    c === "vimeo_rate_limit" ||
    c === "vimeo_unavailable" ||
    c === "vimeo_error" ||
    c === "vimeo_auth_failed" ||
    c === "vimeo_not_found" ||
    c === "vimeo_rate_limited" ||
    c === "vimeo_invalid_input" ||
    c === "vimeo_unknown"
  );
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    try {
      const j = JSON.parse(text) as { message?: string; code?: string; details?: string; ok?: boolean; error?: { code?: string; message?: string } };
      if (res.status === 401 && !isVimeoErrorCode(j?.code ?? j?.error?.code)) clearAuthToken();
      const errBody = j?.ok === false && j?.error ? j.error : j;
      const message = typeof errBody?.message === "string" ? errBody.message : (typeof j?.message === "string" ? j.message : undefined);
      const code = errBody?.code ?? j?.code;
      if (message != null) {
        const err = new Error(message) as Error & ApiError;
        err.code = code;
        err.details = j?.details;
        err.status = res.status;
        throw err;
      }
    } catch (e: unknown) {
      if (e instanceof Error && "code" in e) {
        (e as Error & ApiError).status = res.status;
        throw e;
      }
      if (res.status === 401) clearAuthToken();
      const fallback = new Error(text || res.statusText) as Error & ApiError;
      fallback.status = res.status;
      throw fallback;
    }
    const fallback2 = new Error(text || res.statusText) as Error & ApiError;
    fallback2.status = res.status;
    throw fallback2;
  }
  return JSON.parse(text || "null") as T;
}

const inFlightGet = new Map<string, Promise<unknown>>();

export async function apiGet<T>(path: string): Promise<T> {
  const base = getResolvedApiBase();
  const url = `${base}${path}`;
  const existing = inFlightGet.get(url);
  if (existing) return existing as Promise<T>;
  const promise = (async (): Promise<T> => {
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers: { ...authHeaders() }
      }).catch((err) => {
        setLastFetchError(err?.message ?? "Failed to fetch");
        throw err;
      });
      setLastFetchError(undefined);
      return handleResponse<T>(res);
    } finally {
      inFlightGet.delete(url);
    }
  })();
  inFlightGet.set(url, promise);
  return promise;
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  contentType = "application/json"
): Promise<T> {
  const base = getResolvedApiBase();
  const res = await fetch(`${base}${path}`, {
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
  }).catch((err) => {
    setLastFetchError(err?.message ?? "Failed to fetch");
    throw err;
  });
  setLastFetchError(undefined);
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const base = getResolvedApiBase();
  const res = await fetch(`${base}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body)
  }).catch((err) => {
    setLastFetchError(err?.message ?? "Failed to fetch");
    throw err;
  });
  setLastFetchError(undefined);
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const base = getResolvedApiBase();
  const res = await fetch(`${base}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...authHeaders() }
  }).catch((err) => {
    setLastFetchError(err?.message ?? "Failed to fetch");
    throw err;
  });
  setLastFetchError(undefined);
  return handleResponse<T>(res);
}
