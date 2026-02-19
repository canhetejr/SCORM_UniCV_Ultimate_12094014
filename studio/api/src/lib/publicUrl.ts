/**
 * URL pública do player/embed – nunca localhost em produção.
 * Usado em SCORM, iframe, preview e LTI.
 */

import type { FastifyRequest } from "fastify";

function isHttpUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://");
}

function isLocalhost(url: URL): boolean {
  const h = url.hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

function normalizeBase(url: string): string {
  const u = url.trim().replace(/\/+$/, "");
  return u || "";
}

/** Considera x-forwarded-proto ao derivar esquema (evita mixed content quando AVA/site é https). */
function requestProtocol(req: FastifyRequest): "https" | "http" {
  const raw = (req.headers["x-forwarded-proto"] as string)?.toLowerCase();
  const first = raw?.split(",")[0]?.trim();
  if (first === "https") return "https";
  return "http";
}

/**
 * Retorna a base URL pública para o player (embed/SCORM/preview).
 * Ordem: PUBLIC_BASE_URL → BASE_URL → Origin/Referer do request.
 * Quando atrás de proxy, usa x-forwarded-proto para gerar https se o cliente estiver em https (evita Failed to fetch no AVA).
 * Em produção (NODE_ENV=production) nunca retorna localhost.
 */
export function getPublicPlayerBaseUrl(
  req: FastifyRequest,
  getConfig: (key: string) => string | undefined,
  env: { PUBLIC_BASE_URL?: string; BASE_URL?: string; NODE_ENV?: string }
): string {
  const isProd = env.NODE_ENV === "production";
  const proto = requestProtocol(req);

  const publicBase = getConfig("PUBLIC_BASE_URL") ?? env.PUBLIC_BASE_URL ?? "";
  if (publicBase && isHttpUrl(publicBase)) {
    let normalized = normalizeBase(publicBase);
    if (normalized && proto === "https") {
      try {
        const u = new URL(normalized);
        if (u.protocol === "http:") normalized = normalizeBase(`https://${u.host}${u.pathname}`);
      } catch {
        /* keep normalized */
      }
    }
    if (normalized) {
      if (isProd && isLocalhost(new URL(normalized))) {
        // fallthrough para não devolver localhost em prod
      } else {
        return normalized;
      }
    }
  }

  const baseUrl = getConfig("BASE_URL") ?? env.BASE_URL ?? "";
  if (baseUrl && isHttpUrl(baseUrl)) {
    let normalized = normalizeBase(baseUrl);
    if (normalized && proto === "https") {
      try {
        const u = new URL(normalized);
        if (u.protocol === "http:") normalized = normalizeBase(`https://${u.host}${u.pathname}`);
      } catch {
        /* keep normalized */
      }
    }
    if (normalized) {
      if (isProd && isLocalhost(new URL(normalized))) {
        // fallthrough
      } else {
        return normalized;
      }
    }
  }

  const originRaw = (req.headers.origin ?? req.headers.referer ?? "") as string;
  if (originRaw && isHttpUrl(originRaw)) {
    try {
      const u = new URL(originRaw);
      if (isProd && isLocalhost(u)) {
        throw new Error(
          "Em produção não é permitido usar localhost. Configure PUBLIC_BASE_URL ou BASE_URL no servidor."
        );
      }
      const scheme = proto === "https" ? "https" : u.protocol.replace(":", "");
      const resolved = normalizeBase(`${scheme}://${u.host}`);
      if (resolved) return resolved;
    } catch (e) {
      if (e instanceof Error && e.message.includes("produção")) throw e;
    }
  }

  if (isProd) {
    throw new Error(
      "URL pública não configurada. Defina PUBLIC_BASE_URL ou BASE_URL no servidor (ex: https://seu-dominio.com)."
    );
  }

  const fallback = normalizeBase(baseUrl) || "http://localhost:3002";
  if (proto === "https" && fallback.startsWith("http://")) {
    try {
      const u = new URL(fallback);
      return normalizeBase(`https://${u.host}${u.pathname}`);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Resolve PUBLIC_BASE_URL e BASE_URL para exibição em /v1/config/status (sem request).
 */
export function resolvePublicBaseUrlForStatus(
  getConfig: (key: string) => string | undefined,
  env: { PUBLIC_BASE_URL?: string; BASE_URL?: string }
): string {
  const publicBase = getConfig("PUBLIC_BASE_URL") ?? env.PUBLIC_BASE_URL ?? "";
  if (publicBase && isHttpUrl(publicBase)) return normalizeBase(publicBase);
  const baseUrl = getConfig("BASE_URL") ?? env.BASE_URL ?? "";
  if (baseUrl && isHttpUrl(baseUrl)) return normalizeBase(baseUrl);
  return "";
}

export function resolveBaseUrlForStatus(
  getConfig: (key: string) => string | undefined,
  env: { BASE_URL?: string }
): string {
  const baseUrl = getConfig("BASE_URL") ?? env.BASE_URL ?? "";
  if (baseUrl && isHttpUrl(baseUrl)) return normalizeBase(baseUrl);
  return "";
}
