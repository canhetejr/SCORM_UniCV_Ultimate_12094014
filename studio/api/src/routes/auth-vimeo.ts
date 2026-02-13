import type { FastifyPluginAsync } from "fastify";
import {
  buildAuthorizeUrl,
  createOAuthState,
  exchangeCodeForToken,
  getRedirectUri,
  parseVimeoUserIdFromUri
} from "../services/vimeo.js";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

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
        error: "Vimeo não configurado",
        message: "Configure VIMEO_CLIENT_ID e VIMEO_CLIENT_SECRET em Admin > Configurações > Dados do ambiente ou no .env do servidor."
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
    if (!vimeoClientId() || !vimeoClientSecret()) {
      return reply.status(503).send({
        error: "Vimeo não configurado",
        message: "Configure VIMEO_CLIENT_ID e VIMEO_CLIENT_SECRET em Admin > Configurações > Dados do ambiente."
      });
    }

    const q = req.query as Record<string, string | undefined>;
    const code = (q.code || "").trim();
    const state = (q.state || "").trim();

    if (!code || !state) return reply.badRequest("Callback inválida do Vimeo (faltando code/state).");

    const cookieState = req.cookies?.vimeo_oauth_state;
    const unsigned = cookieState ? req.unsignCookie(cookieState) : null;
    const expectedState = unsigned && unsigned.valid ? unsigned.value : null;
    if (!expectedState || expectedState !== state) return reply.unauthorized("State inválido.");

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
    return { ok: true, vimeoUserId };
  });
};

export default authVimeoRoutes;
