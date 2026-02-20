import type { FastifyPluginAsync } from "fastify";
import {
  buildAuthorizeUrl,
  createOAuthState,
  exchangeCodeForToken,
  getRedirectUri,
  isVimeoApiError,
  parseVimeoUserIdFromUri
} from "../vimeo/vimeo.service.js";
import { prisma } from "../../db.js";
import type { ServerDeps } from "../../routes/deps.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const authVimeoRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;
  const { env, getConfig, vimeoClientId, vimeoClientSecret } = deps;

  async function getOrCreateDefaultAccountId(): Promise<string> {
    const existing = await prisma.account.findFirst({ orderBy: { createdAt: "asc" } });
    if (existing) return existing.id;
    const created = await prisma.account.create({ data: { name: "default" } });
    return created.id;
  }

  app.get("/vimeo/start", async (req, reply) => {
    if (!vimeoClientId() || !vimeoClientSecret()) {
      return reply.status(503).send({
        code: "vimeo_not_configured",
        message: "Configure VIMEO_CLIENT_ID e VIMEO_CLIENT_SECRET em Admin > Configurações ou no .env do servidor."
      });
    }

    const state = createOAuthState();
    reply.setCookie("vimeo_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
      signed: true,
      maxAge: 10 * 60
    });

    const redirectUri = getRedirectUri(getConfig);
    const authorizeUrl = buildAuthorizeUrl({
      clientId: vimeoClientId()!,
      redirectUri,
      state,
      scope: "public private"
    });

    return reply.redirect(authorizeUrl);
  });

  app.get("/vimeo/callback", async (req, reply) => {
    const baseUrl = (getConfig("BASE_URL") ?? env.BASE_URL ?? "").replace(/\/+$/, "") || "/";

    if (!vimeoClientId() || !vimeoClientSecret()) {
      const msg = "Configure VIMEO_CLIENT_ID e VIMEO_CLIENT_SECRET em Admin > Configurações.";
      return reply.status(503).type("text/html").send(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Erro Vimeo</title></head><body><p>${escapeHtml(msg)}</p><p><a href="${escapeHtml(baseUrl)}/">Voltar ao Studio</a></p></body></html>`
      );
    }

    const q = req.query as Record<string, string | undefined>;
    const code = (q.code || "").trim();
    const state = (q.state || "").trim();

    if (!code || !state) {
      const msg = "Callback inválida do Vimeo (faltando code ou state).";
      return reply.status(400).type("text/html").send(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Erro Vimeo</title></head><body><p>${escapeHtml(msg)}</p><p><a href="${escapeHtml(baseUrl)}/">Voltar ao Studio</a></p></body></html>`
      );
    }

    const cookieState = req.cookies?.vimeo_oauth_state;
    const unsigned = cookieState ? req.unsignCookie(cookieState) : null;
    const expectedState = unsigned && unsigned.valid ? unsigned.value : null;
    if (!expectedState || expectedState !== state) {
      const msg = "State inválido. Tente conectar novamente.";
      return reply.status(401).type("text/html").send(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Erro Vimeo</title></head><body><p>${escapeHtml(msg)}</p><p><a href="${escapeHtml(baseUrl)}/">Voltar ao Studio</a></p></body></html>`
      );
    }

    try {
      const redirectUri = getRedirectUri(getConfig);
      const token = await exchangeCodeForToken({
        clientId: vimeoClientId()!,
        clientSecret: vimeoClientSecret()!,
        code,
        redirectUri
      });

      const accountId = await getOrCreateDefaultAccountId();
      const vimeoUserId = parseVimeoUserIdFromUri(token.user?.uri || null);

      await prisma.vimeoConnection.create({
        data: {
          accountId,
          vimeoUserId: vimeoUserId || undefined,
          accessToken: token.access_token,
          refreshToken: null,
          tokenType: token.token_type || "bearer",
          scope: token.scope || null,
          expiresAt: null
        }
      });

      reply.clearCookie("vimeo_oauth_state", { path: "/" });
      return reply.redirect(`${baseUrl}/?vimeo_connected=1`);
    } catch (e: unknown) {
      const message = isVimeoApiError(e) ? e.message : e instanceof Error ? e.message : "Erro ao conectar com Vimeo.";
      return reply.status(400).type("text/html").send(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Erro Vimeo</title></head><body><p><strong>Erro ao conectar Vimeo:</strong> ${escapeHtml(message)}</p><p><a href="${escapeHtml(baseUrl)}/">Voltar ao Studio</a></p></body></html>`
      );
    }
  });
};

export default authVimeoRoutes;
