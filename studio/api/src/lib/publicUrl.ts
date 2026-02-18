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

/**
 * Retorna a base URL pública para o player (embed/SCORM/preview).
 * Ordem: PUBLIC_BASE_URL → BASE_URL → Origin/Referer do request.
 * Em produção (NODE_ENV=production) nunca retorna localhost.
 */
export function getPublicPlayerBaseUrl(
  req: FastifyRequest,
  getConfig: (key: string) => string | undefined,
  env: { PUBLIC_BASE_URL?: string; BASE_URL?: string; NODE_ENV?: string }
): string {
  const isProd = env.NODE_ENV === "production";

  const publicBase = getConfig("PUBLIC_BASE_URL") ?? env.PUBLIC_BASE_URL ?? "";
  if (publicBase && isHttpUrl(publicBase)) {
    const normalized = normalizeBase(publicBase);
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
    const normalized = normalizeBase(baseUrl);
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
      const resolved = normalizeBase(`${u.protocol}//${u.host}`);
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

  return normalizeBase(baseUrl) || "http://localhost:3002";
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
