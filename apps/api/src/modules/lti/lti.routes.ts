import type { FastifyPluginAsync } from "fastify";
import { getPublicPlayerBaseUrl } from "../../lib/publicUrl.js";
import type { ServerDeps } from "../../routes/deps.js";
import * as ltiService from "./lti.service.js";

const ltiRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;
  const { env, getLtiPlatform, toolKeys } = deps;

  app.get("/.well-known/jwks.json", async (_req, reply) => {
    const result = ltiService.getJwks(toolKeys);
    return reply.send(result);
  });

  app.get("/config", async (req, reply) => {
    const base = getPublicPlayerBaseUrl(req, deps.getConfig, deps.env);
    const result = ltiService.getConfigResponse({ base });
    return reply.send(result);
  });

  app.get("/login", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const iss = String(q.iss || "");
    const loginHint = String(q.login_hint || "");
    const targetLinkUri = q.target_link_uri ? String(q.target_link_uri) : undefined;
    const ltiMessageHint = q.lti_message_hint ? String(q.lti_message_hint) : undefined;
    const platform = getLtiPlatform();
    const base = getPublicPlayerBaseUrl(req, deps.getConfig, deps.env);

    const result = ltiService.getLoginRedirectParams({
      iss,
      loginHint,
      targetLinkUri,
      ltiMessageHint,
      platform,
      base
    });

    reply.setCookie("lti_state", result.state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
      signed: true,
      maxAge: 10 * 60
    });
    reply.setCookie("lti_nonce", result.nonce, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
      signed: true,
      maxAge: 10 * 60
    });

    return reply.redirect(result.redirectUrl);
  });

  app.post("/launch", async (req, reply) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const idToken = String(body.id_token || "");
    const state = String(body.state || "");
    const platform = getLtiPlatform();

    const cookieState = req.cookies?.lti_state;
    const unsignedState = cookieState ? req.unsignCookie(cookieState) : null;
    const expectedState = unsignedState && unsignedState.valid ? unsignedState.value : null;
    const cookieNonce = req.cookies?.lti_nonce;
    const unsignedNonce = cookieNonce ? req.unsignCookie(cookieNonce) : null;
    const expectedNonce = unsignedNonce && unsignedNonce.valid ? unsignedNonce.value : null;

    const result = await ltiService.postLaunch({
      idToken,
      state,
      expectedState,
      expectedNonce,
      platform
    });

    reply.clearCookie("lti_state", { path: "/" });
    reply.clearCookie("lti_nonce", { path: "/" });

    return reply.redirect(result.redirectPath);
  });
};

export default ltiRoutes;
