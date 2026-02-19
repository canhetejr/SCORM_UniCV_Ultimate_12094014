/**
 * Cliente Vimeo para o sistema Clone: token por perfil, timeout, rate limit e paginação.
 * Não expõe token ao frontend; usado apenas no backend sob /admin/vimeo-clone.
 */

const VIMEO_ACCEPT = "application/vnd.vimeo.*+json;version=3.4";
const VIMEO_BASE = "https://api.vimeo.com";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES_5XX = 2;
const PER_PAGE = 100;

export type VimeoClientError = {
  status: number;
  code: string;
  message: string;
  details?: string;
};

export function isVimeoClientError(e: unknown): e is VimeoClientError {
  return typeof e === "object" && e !== null && "code" in e && "status" in e && "message" in e;
}

function mapStatus(status: number): { code: string; message: string } {
  if (status === 401 || status === 403) return { code: "vimeo_auth_failed", message: "Token inválido ou expirado." };
  if (status === 404) return { code: "vimeo_not_found", message: "Recurso não encontrado." };
  if (status === 429) return { code: "vimeo_rate_limited", message: "Limite de taxa atingido." };
  if (status >= 400 && status < 500) return { code: "vimeo_invalid_input", message: "Pedido inválido." };
  if (status >= 500) return { code: "vimeo_unknown", message: "Erro no servidor Vimeo." };
  return { code: "vimeo_unknown", message: `HTTP ${status}` };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(to);
  }
}

async function doRequest(options: {
  accessToken: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  retryCount?: number;
}): Promise<Response> {
  const path = options.path.startsWith("http") ? options.path : `${VIMEO_BASE}${options.path}`;
  const url = new URL(path);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) url.searchParams.set(k, v);
  }

  const res = await fetchWithTimeout(url.toString(), {
    method: options.method,
    headers: {
      Accept: VIMEO_ACCEPT,
      Authorization: `Bearer ${options.accessToken}`,
      ...(options.body != null ? { "Content-Type": "application/json" } : {})
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
    timeoutMs: REQUEST_TIMEOUT_MS
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    const waitSec = retryAfter ? Math.min(parseInt(retryAfter, 10) || 60, 120) : 60;
    await sleep(waitSec * 1000);
    return doRequest({ ...options, retryCount: (options.retryCount ?? 0) + 1 });
  }

  if (res.status >= 500 && (options.retryCount ?? 0) < MAX_RETRIES_5XX) {
    const backoff = Math.min(1000 * 2 ** (options.retryCount ?? 0), 10000);
    await sleep(backoff);
    return doRequest({ ...options, retryCount: (options.retryCount ?? 0) + 1 });
  }

  return res;
}

export async function vimeoClientRequest<T>(options: {
  accessToken: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}): Promise<T> {
  const res = await doRequest(options);
  if (!res.ok) {
    const details = await res.text().catch(() => "");
    const { code, message } = mapStatus(res.status);
    const err: VimeoClientError = { status: res.status, code, message, details: details || undefined };
    throw err;
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") return undefined as T;
  return (await res.json()) as T;
}

export type MeResponse = {
  uri?: string;
  name?: string;
  link?: string;
};

export async function getMe(accessToken: string): Promise<MeResponse> {
  return vimeoClientRequest<MeResponse>({
    accessToken,
    method: "GET",
    path: "/me"
  });
}

export function parseUserIdFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  const m = uri.match(/\/users\/(\d+)/);
  return m ? m[1] : null;
}

export type Paging = {
  next?: string | null;
  previous?: string | null;
  first?: string | null;
  last?: string | null;
};

export type AlbumItem = {
  uri: string;
  name: string;
  description?: string | null;
  privacy?: string | null;
  created_time?: string | null;
  modified_time?: string | null;
  resource_key?: string;
  pictures?: { sizes?: Array<{ width: number; height: number; link: string }> };
  metadata?: { connections?: { videos?: { total?: number } } };
};

export type AlbumsResponse = {
  data: AlbumItem[];
  paging?: Paging;
  total?: number;
};

export type VideoInAlbum = {
  uri: string;
  name: string;
  description?: string | null;
  duration?: number;
  link?: string | null;
  embed?: { html?: string | null } | null;
  privacy?: string | null;
  created_time?: string | null;
  modified_time?: string | null;
  pictures?: { sizes?: Array<{ width: number; height: number; link: string }> };
};

export type AlbumVideosResponse = {
  data: VideoInAlbum[];
  paging?: Paging;
  total?: number;
};

/**
 * Lista todos os álbums/showcases do usuário (paginação automática, per_page=100).
 */
export async function listAllAlbums(accessToken: string, userId: string): Promise<AlbumItem[]> {
  const out: AlbumItem[] = [];
  let page = 1;
  for (;;) {
    const res = await vimeoClientRequest<AlbumsResponse>({
      accessToken,
      method: "GET",
      path: `/users/${encodeURIComponent(userId)}/albums`,
      query: { per_page: String(PER_PAGE), page: String(page) }
    });
    if (res.data?.length) out.push(...res.data);
    const next = res.paging?.next;
    if (!next || !res.data?.length || res.data.length < PER_PAGE) break;
    page++;
  }
  return out;
}

/**
 * Lista todos os vídeos de um álbum (paginação automática, per_page=100).
 */
export async function listAllAlbumVideos(
  accessToken: string,
  albumId: string
): Promise<VideoInAlbum[]> {
  const out: VideoInAlbum[] = [];
  let page = 1;
  for (;;) {
    const res = await vimeoClientRequest<AlbumVideosResponse>({
      accessToken,
      method: "GET",
      path: `/albums/${encodeURIComponent(albumId)}/videos`,
      query: { per_page: String(PER_PAGE), page: String(page) }
    });
    if (res.data?.length) out.push(...res.data);
    const next = res.paging?.next;
    if (!next || !res.data?.length || res.data.length < PER_PAGE) break;
    page++;
  }
  return out;
}

export function extractAlbumIdFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  const m = uri.match(/\/albums\/(\d+)/);
  return m ? m[1] : null;
}

export function extractVideoIdFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  const m = uri.match(/\/videos\/(\d+)/);
  return m ? m[1] : null;
}
