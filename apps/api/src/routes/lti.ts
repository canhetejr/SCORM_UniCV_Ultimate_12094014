import type { FastifyPluginAsync } from "fastify";
import { getPublicPlayerBaseUrl } from "../lib/publicUrl.js";
import {
  buildLtiAuthRedirect,
  createNonce,
  createState,
  verifyLtiIdToken
} from "../services/lti.js";
import type { ServerDeps } from "./deps.js";

const ltiRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;
  const { env, getLtiPlatform, baseUrl, toolKeys } = deps;

  app.get("/.well-known/jwks.json", async () => {
    return { keys: [toolKeys.publicJwk] };
  });

  app.get("/config", async (req, reply) => {
    let base: string;
    try {
      base = getPublicPlayerBaseUrl(req, deps.getConfig, deps.env);
    } catch (e) {
      return reply.internalServerError((e instanceof Error ? e.message : String(e)));
    }
    return {
      tool: {
        initiate_login_url: `${base}/lti/login`,
        redirect_uris: [`${base}/lti/launch`],
        jwks_url: `${base}/lti/.well-known/jwks.json`,
        launch_url: `${base}/lti/launch`,
        player_url: `${base}/player/index.html`
      }
    };
  });

  app.get("/login", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const iss = String(q.iss || "");
    const loginHint = String(q.login_hint || "");
    const targetLinkUri = q.target_link_uri ? String(q.target_link_uri) : undefined;
    const ltiMessageHint = q.lti_message_hint ? String(q.lti_message_hint) : undefined;

    const platform = getLtiPlatform();
    if (iss && iss !== platform.issuer) return reply.unauthorized("Issuer não reconhecido.");
    if (!loginHint) return reply.badRequest("login_hint obrigatório.");
    let base: string;
    try {
      base = getPublicPlayerBaseUrl(req, deps.getConfig, deps.env);
    } catch (e) {
      return reply.internalServerError((e instanceof Error ? e.message : String(e)));
    }

    const state = createState();
    const nonce = createNonce();

    reply.setCookie("lti_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
      signed: true,
      maxAge: 10 * 60
    });
    reply.setCookie("lti_nonce", nonce, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
      signed: true,
      maxAge: 10 * 60
    });

    const redirectUri = new URL("/lti/launch", base).toString();
    const url = buildLtiAuthRedirect({
      platform,
      redirectUri,
      state,
      nonce,
      loginHint,
      ltiMessageHint,
      targetLinkUri
    });
    return reply.redirect(url);
  });

  app.post("/launch", async (req, reply) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const idToken = String(body.id_token || "");
    const state = String(body.state || "");
    if (!idToken || !state) return reply.badRequest("id_token/state obrigatórios.");

    const platform = getLtiPlatform();

    const cookieState = req.cookies?.lti_state;
    const unsignedState = cookieState ? req.unsignCookie(cookieState) : null;
    const expectedState = unsignedState && unsignedState.valid ? unsignedState.value : null;
    if (!expectedState || expectedState !== state) return reply.unauthorized("State inválido.");

    const cookieNonce = req.cookies?.lti_nonce;
    const unsignedNonce = cookieNonce ? req.unsignCookie(cookieNonce) : null;
    const expectedNonce = unsignedNonce && unsignedNonce.valid ? unsignedNonce.value : null;
    if (!expectedNonce) return reply.unauthorized("Nonce ausente.");

    const claims = await verifyLtiIdToken({ idToken, platform, expectedNonce });
    const custom = (claims as Record<string, unknown>)["https://purl.imsglobal.org/spec/lti/claim/custom"] as Record<string, string> || {};

    const vitrineId = typeof custom.vitrine_id === "string" ? custom.vitrine_id : "";
    const showcaseId = typeof custom.showcase_id === "string" ? custom.showcase_id : "";

    reply.clearCookie("lti_state", { path: "/" });
    reply.clearCookie("lti_nonce", { path: "/" });

    if (vitrineId) return reply.redirect(`/player/index.html?vitrine_id=${encodeURIComponent(vitrineId)}`);
    if (showcaseId) return reply.redirect(`/player/index.html?showcase_id=${encodeURIComponent(showcaseId)}`);

    return reply.badRequest(
      "LTI launch sem custom params. Configure no Moodle um custom parameter: vitrine_id (recomendado) ou showcase_id."
    );
  });
};

export default ltiRoutes;
