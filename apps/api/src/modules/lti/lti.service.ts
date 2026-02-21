import crypto from "node:crypto";
import type { KeyObject } from "node:crypto";
import { createRemoteJWKSet, importPKCS8, exportJWK, jwtVerify, type JWTPayload } from "jose";
import type { ToolKeys } from "../../routes/deps.js";
import { AppError, BadRequestError } from "../../shared/errors/AppError.js";

export type LtiPlatformConfig = {
  issuer: string;
  clientId: string;
  authLoginUrl: string;
  keysetUrl: string;
  deploymentId: string;
};

export async function loadToolKeys(input: { kid: string; privateKeyPem?: string | null }): Promise<ToolKeys> {
  const kid = input.kid;

  if (input.privateKeyPem && input.privateKeyPem.trim()) {
    const privateKey = await importPKCS8(input.privateKeyPem, "RS256");
    const publicJwk: Record<string, unknown> = (await exportJWK(privateKey)) as Record<string, unknown>;
    publicJwk.use = "sig";
    publicJwk.alg = "RS256";
    publicJwk.kid = kid;
    // exportJWK de chave privada inclui parâmetros privados; removemos na resposta JWKS.
    delete publicJwk.d;
    delete publicJwk.p;
    delete publicJwk.q;
    delete publicJwk.dp;
    delete publicJwk.dq;
    delete publicJwk.qi;
    delete publicJwk.oth;
    return { publicJwk };
  }

  // Fallback efêmero (dev only)
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicJwk: Record<string, unknown> = (await exportJWK(privateKey)) as Record<string, unknown>;
  publicJwk.use = "sig";
  publicJwk.alg = "RS256";
  publicJwk.kid = kid;
  delete publicJwk.d;
  delete publicJwk.p;
  delete publicJwk.q;
  delete publicJwk.dp;
  delete publicJwk.dq;
  delete publicJwk.qi;
  delete publicJwk.oth;
  return { publicJwk };
}

export function createState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function createNonce(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function buildLtiAuthRedirect(params: {
  platform: LtiPlatformConfig;
  redirectUri: string;
  state: string;
  nonce: string;
  loginHint: string;
  ltiMessageHint?: string;
  targetLinkUri?: string;
}): string {
  const url = new URL(params.platform.authLoginUrl);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("response_type", "id_token");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("prompt", "none");
  url.searchParams.set("client_id", params.platform.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("login_hint", params.loginHint);
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  if (params.ltiMessageHint) url.searchParams.set("lti_message_hint", params.ltiMessageHint);
  if (params.targetLinkUri) url.searchParams.set("target_link_uri", params.targetLinkUri);
  return url.toString();
}

export type LtiLaunchClaims = JWTPayload & {
  "https://purl.imsglobal.org/spec/lti/claim/deployment_id"?: string;
  "https://purl.imsglobal.org/spec/lti/claim/message_type"?: string;
  "https://purl.imsglobal.org/spec/lti/claim/version"?: string;
  "https://purl.imsglobal.org/spec/lti/claim/custom"?: Record<string, unknown>;
  "https://purl.imsglobal.org/spec/lti/claim/roles"?: string[];
  "https://purl.imsglobal.org/spec/lti/claim/context"?: Record<string, unknown>;
  "https://purl.imsglobal.org/spec/lti/claim/resource_link"?: Record<string, unknown>;
};

export async function verifyLtiIdToken(input: {
  idToken: string;
  platform: LtiPlatformConfig;
  expectedNonce: string;
}): Promise<LtiLaunchClaims> {
  const jwks = createRemoteJWKSet(new URL(input.platform.keysetUrl));
  const { payload } = await jwtVerify(input.idToken, jwks, {
    issuer: input.platform.issuer,
    audience: input.platform.clientId
  });

  if (payload.nonce !== input.expectedNonce) {
    throw new Error("Nonce inválido.");
  }
  const deploymentId = (payload as any)["https://purl.imsglobal.org/spec/lti/claim/deployment_id"];
  if (deploymentId !== input.platform.deploymentId) {
    throw new Error("deployment_id inválido.");
  }

  return payload as LtiLaunchClaims;
}

// --- Funções de API (routes → service) ---

export function getJwks(toolKeys: ToolKeys): { keys: Record<string, unknown>[] } {
  return { keys: [toolKeys.publicJwk] };
}

export function getConfigResponse(params: { base: string }): {
  tool: {
    initiate_login_url: string;
    redirect_uris: string[];
    jwks_url: string;
    launch_url: string;
    player_url: string;
  };
} {
  const { base } = params;
  return {
    tool: {
      initiate_login_url: `${base}/lti/login`,
      redirect_uris: [`${base}/lti/launch`],
      jwks_url: `${base}/lti/.well-known/jwks.json`,
      launch_url: `${base}/lti/launch`,
      player_url: `${base}/player/index.html`
    }
  };
}

export type GetLoginRedirectParams = {
  iss: string;
  loginHint: string;
  targetLinkUri?: string;
  ltiMessageHint?: string;
  platform: LtiPlatformConfig;
  base: string;
};

export type GetLoginRedirectResult = {
  state: string;
  nonce: string;
  redirectUrl: string;
};

/**
 * Valida parâmetros de login e monta state, nonce e URL de redirect.
 * Lança AppError(401) se issuer não reconhecido, BadRequestError se login_hint ausente.
 */
export function getLoginRedirectParams(params: GetLoginRedirectParams): GetLoginRedirectResult {
  const { iss, loginHint, targetLinkUri, ltiMessageHint, platform, base } = params;
  if (iss && iss !== platform.issuer) {
    throw new AppError("Issuer não reconhecido.", 401, "UNAUTHORIZED");
  }
  if (!loginHint || !String(loginHint).trim()) {
    throw new BadRequestError("login_hint obrigatório.");
  }
  const state = createState();
  const nonce = createNonce();
  const redirectUri = new URL("/lti/launch", base).toString();
  const redirectUrl = buildLtiAuthRedirect({
    platform,
    redirectUri,
    state,
    nonce,
    loginHint: String(loginHint).trim(),
    ltiMessageHint,
    targetLinkUri
  });
  return { state, nonce, redirectUrl };
}

export type PostLaunchParams = {
  idToken: string;
  state: string;
  expectedState: string | null;
  expectedNonce: string | null;
  platform: LtiPlatformConfig;
};

export type PostLaunchResult = {
  redirectPath: string;
};

/**
 * Valida state/nonce e verifica id_token; extrai custom e retorna redirectPath.
 * Lança BadRequestError se id_token/state ausentes ou sem custom params;
 * AppError(401) se state ou nonce inválidos.
 */
export async function postLaunch(params: PostLaunchParams): Promise<PostLaunchResult> {
  const { idToken, state, expectedState, expectedNonce, platform } = params;
  if (!idToken || !String(idToken).trim() || !state || !String(state).trim()) {
    throw new BadRequestError("id_token/state obrigatórios.");
  }
  if (!expectedState || expectedState !== state) {
    throw new AppError("State inválido.", 401, "UNAUTHORIZED");
  }
  if (!expectedNonce || !String(expectedNonce).trim()) {
    throw new AppError("Nonce ausente.", 401, "UNAUTHORIZED");
  }
  const nonceStr = String(expectedNonce).trim();

  const claims = await verifyLtiIdToken({
    idToken: String(idToken).trim(),
    platform,
    expectedNonce: nonceStr
  });
  const custom = (claims["https://purl.imsglobal.org/spec/lti/claim/custom"] as Record<string, string>) || {};
  const vitrineId = typeof custom.vitrine_id === "string" ? custom.vitrine_id : "";
  const showcaseId = typeof custom.showcase_id === "string" ? custom.showcase_id : "";

  if (vitrineId) {
    return { redirectPath: `/player/index.html?vitrine_id=${encodeURIComponent(vitrineId)}` };
  }
  if (showcaseId) {
    return { redirectPath: `/player/index.html?showcase_id=${encodeURIComponent(showcaseId)}` };
  }

  throw new BadRequestError(
    "LTI launch sem custom params. Configure no Moodle um custom parameter: vitrine_id (recomendado) ou showcase_id."
  );
}
