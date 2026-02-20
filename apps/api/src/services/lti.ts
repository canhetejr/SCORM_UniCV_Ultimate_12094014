import crypto from "node:crypto";
import type { KeyObject } from "node:crypto";
import { createRemoteJWKSet, importPKCS8, exportJWK, jwtVerify, type JWTPayload } from "jose";

export type LtiPlatformConfig = {
  issuer: string;
  clientId: string;
  authLoginUrl: string;
  keysetUrl: string;
  deploymentId: string;
};

export type ToolKeys = {
  kid: string;
  privateKey: KeyObject | CryptoKey;
  publicJwk: Record<string, unknown>;
};

export async function loadToolKeys(input: { kid: string; privateKeyPem?: string | null }): Promise<ToolKeys> {
  const kid = input.kid;

  if (input.privateKeyPem && input.privateKeyPem.trim()) {
    const privateKey = await importPKCS8(input.privateKeyPem, "RS256");
    const publicJwk = (await exportJWK(privateKey)) as Record<string, unknown>;
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
    return { kid, privateKey, publicJwk };
  }

  // Fallback efêmero (dev only)
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = (await exportJWK(privateKey)) as any;
  jwk.use = "sig";
  jwk.alg = "RS256";
  jwk.kid = kid;
  delete jwk.d;
  delete jwk.p;
  delete jwk.q;
  delete jwk.dp;
  delete jwk.dq;
  delete jwk.qi;
  delete jwk.oth;
  return { kid, privateKey, publicJwk: jwk };
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

