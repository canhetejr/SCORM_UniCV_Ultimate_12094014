const VIMEO_API = "https://api.vimeo.com";

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function mapVimeoStatus(status: number, message?: string): never {
  if (status === 401) throw Object.assign(new Error(message ?? "Vimeo: não autorizado"), { code: "vimeo_auth_failed", status: 401 });
  if (status === 403) throw Object.assign(new Error(message ?? "Vimeo: acesso negado"), { code: "vimeo_auth_failed", status: 403 });
  if (status === 404) throw Object.assign(new Error(message ?? "Vimeo: não encontrado"), { code: "vimeo_not_found", status: 404 });
  if (status === 429) throw Object.assign(new Error("Vimeo: rate limit"), { code: "vimeo_rate_limit", status: 429 });
  throw Object.assign(new Error(message ?? `Vimeo: erro ${status}`), { code: "vimeo_error", status });
}

export async function vimeoGet<T>(path: string, token: string): Promise<T> {
  const res = await fetchWithTimeout(`${VIMEO_API}${path}`, {
    headers: { Authorization: `bearer ${token}`, Accept: "application/vnd.vimeo.*+json;version=3.4" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    mapVimeoStatus(res.status, body.error);
  }
  return res.json() as Promise<T>;
}

export async function vimeoPut<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${VIMEO_API}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { error?: string };
    mapVimeoStatus(res.status, b.error);
  }
  return res.json() as Promise<T>;
}

export async function vimeoDelete(path: string, token: string): Promise<void> {
  const res = await fetchWithTimeout(`${VIMEO_API}${path}`, {
    method: "DELETE",
    headers: { Authorization: `bearer ${token}`, Accept: "application/vnd.vimeo.*+json;version=3.4" },
  });
  if (!res.ok && res.status !== 204) {
    const b = await res.json().catch(() => ({})) as { error?: string };
    mapVimeoStatus(res.status, b.error);
  }
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.VIMEO_CLIENT_ID!,
    redirect_uri: process.env.VIMEO_REDIRECT_URI!,
    scope: "public private create edit delete video_files",
    state,
  });
  return `https://api.vimeo.com/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string; refresh_token?: string; token_type?: string; scope?: string;
  user?: { uri?: string; link?: string };
}> {
  const creds = Buffer.from(
    `${process.env.VIMEO_CLIENT_ID}:${process.env.VIMEO_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetchWithTimeout("https://api.vimeo.com/oauth/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.VIMEO_REDIRECT_URI,
    }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(b.error ?? `OAuth error ${res.status}`);
  }
  return res.json();
}

export function extractEmbedHash(html: string): string | undefined {
  const m = html.match(/[?&]h=([a-zA-Z0-9]+)/);
  return m?.[1];
}

export function parseVimeoUserIdFromUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  const m = uri.match(/\/users\/(\d+)/);
  return m?.[1];
}
