import { importPKCS8, importSPKI, exportJWK, SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import crypto from "crypto";

let _keys: { privateKey: CryptoKey; publicKey: CryptoKey; kid: string } | null = null;

export async function loadToolKeys() {
  if (_keys) return _keys;
  const kid = process.env.LTI_TOOL_KID ?? "unicv-tool-1";
  const pem = process.env.LTI_TOOL_PRIVATE_KEY_PEM;
  if (pem) {
    const privateKey = await importPKCS8(pem, "RS256");
    // Extract public key from private (via subtle crypto)
    const keyPair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    _keys = { privateKey, publicKey: keyPair.publicKey, kid };
  } else {
    const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    _keys = { privateKey: pair.privateKey as CryptoKey, publicKey: pair.publicKey as CryptoKey, kid };
  }
  return _keys;
}

export async function getJwks() {
  const { publicKey, kid } = await loadToolKeys();
  const jwk = await exportJWK(publicKey);
  return { keys: [{ ...jwk, kid, use: "sig", alg: "RS256" }] };
}

export function getConfigResponse(base: string) {
  return {
    title: "UniCV Studio",
    description: "Video playlist player via LTI 1.3",
    target_link_uri: `${base}/api/lti/launch`,
    oidc_initiation_url: `${base}/api/lti/login`,
    public_jwk_url: `${base}/api/lti/.well-known/jwks.json`,
    claims: ["iss", "sub", "name", "email"],
    scopes: [],
    extensions: [],
  };
}

const _states = new Map<string, number>();
const _nonces = new Map<string, number>();

export function createState(): string {
  const s = crypto.randomUUID();
  _states.set(s, Date.now() + 600_000);
  return s;
}

export function createNonce(): string {
  const n = crypto.randomUUID();
  _nonces.set(n, Date.now() + 600_000);
  return n;
}

export function validateState(s: string): boolean {
  const exp = _states.get(s);
  if (!exp || Date.now() > exp) return false;
  _states.delete(s);
  return true;
}

export function validateNonce(n: string): boolean {
  const exp = _nonces.get(n);
  if (!exp || Date.now() > exp) return false;
  _nonces.delete(n);
  return true;
}

export function buildLtiAuthRedirect(params: {
  loginHint: string; ltiMessageHint?: string; state: string; nonce: string; targetLinkUri: string;
}): string {
  const clientId = process.env.LTI_PLATFORM_CLIENT_ID!;
  const redirectUri = `${process.env.PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL}/api/lti/launch`;
  const authUrl = process.env.LTI_PLATFORM_AUTH_LOGIN_URL!;
  const sp = new URLSearchParams({
    scope: "openid",
    response_type: "id_token",
    client_id: clientId,
    redirect_uri: redirectUri,
    login_hint: params.loginHint,
    state: params.state,
    nonce: params.nonce,
    prompt: "none",
    response_mode: "form_post",
  });
  if (params.ltiMessageHint) sp.set("lti_message_hint", params.ltiMessageHint);
  return `${authUrl}?${sp}`;
}

export async function verifyLtiIdToken(idToken: string) {
  const jwksUri = process.env.LTI_PLATFORM_KEYSET_URL!;
  const JWKS = createRemoteJWKSet(new URL(jwksUri));
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: process.env.LTI_PLATFORM_ISSUER!,
    audience: process.env.LTI_PLATFORM_CLIENT_ID!,
  });
  return payload;
}
