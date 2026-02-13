import crypto from "node:crypto";

const VIMEO_ACCEPT = "application/vnd.vimeo.*+json;version=3.4";

export type VimeoTokenResponse = {
  access_token: string;
  token_type?: string;
  scope?: string;
  user?: { uri?: string };
};

export function createOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function getRedirectUri(
  envOrGetConfig:
    | { BASE_URL?: string; VIMEO_REDIRECT_URI?: string }
    | ((key: string) => string | undefined)
): string {
  const get = (k: string): string | undefined =>
    typeof envOrGetConfig === "function"
      ? envOrGetConfig(k)
      : (envOrGetConfig as any)[k];
  const redirectUri = get("VIMEO_REDIRECT_URI");
  if (redirectUri) return redirectUri;
  const baseUrl = get("BASE_URL");
  if (!baseUrl) throw new Error("BASE_URL ou VIMEO_REDIRECT_URI é obrigatório para OAuth.");
  return new URL("/auth/vimeo/callback", baseUrl).toString();
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const url = new URL("https://api.vimeo.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  if (params.scope) url.searchParams.set("scope", params.scope);
  return url.toString();
}

export async function exchangeCodeForToken(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<VimeoTokenResponse> {
  const basic = Buffer.from(`${input.clientId}:${input.clientSecret}`, "utf8").toString("base64");
  const res = await fetch("https://api.vimeo.com/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: VIMEO_ACCEPT,
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao trocar code por token no Vimeo (HTTP ${res.status}). ${txt}`);
  }

  return (await res.json()) as VimeoTokenResponse;
}

export async function vimeoGet<T>(input: { accessToken: string; path: string; query?: Record<string, string> }): Promise<T> {
  const url = new URL(input.path.startsWith("http") ? input.path : `https://api.vimeo.com${input.path}`);
  if (input.query) {
    for (const [k, v] of Object.entries(input.query)) url.searchParams.set(k, v);
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: VIMEO_ACCEPT,
      Authorization: `Bearer ${input.accessToken}`
    }
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Vimeo GET ${url.pathname} falhou (HTTP ${res.status}). ${txt}`);
  }
  return (await res.json()) as T;
}

export function parseVimeoUserIdFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  // ex: "/users/1234567"
  const m = uri.match(/\/users\/(\d+)/);
  return m ? m[1] : null;
}

export function extractEmbedHash(input: { player_embed_url?: string | null; embedHtml?: string | null }): string | null {
  // Preferir player_embed_url (quando existir)
  const candidates: string[] = [];
  if (input.player_embed_url) candidates.push(input.player_embed_url);
  if (input.embedHtml) candidates.push(input.embedHtml);

  for (const c of candidates) {
    // player_embed_url: https://player.vimeo.com/video/12345?h=HASH
    try {
      const url = new URL(c);
      const h = url.searchParams.get("h");
      if (h) return h;
    } catch {
      // embedHtml pode conter "...video/12345?h=HASH..."
      const m = c.match(/[?&]h=([a-zA-Z0-9]+)/);
      if (m && m[1]) return m[1];
    }
  }
  return null;
}

