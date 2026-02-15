import { SignJWT, jwtVerify } from "jose";

const SUB = "admin";
const AUD = "unicv-studio";
const EXPIRY = "24h";

export function getAdminJwtSecret(env: { ADMIN_JWT_SECRET?: string; COOKIE_SECRET: string }): string {
  const secret = env.ADMIN_JWT_SECRET ?? env.COOKIE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_JWT_SECRET ou COOKIE_SECRET deve ter pelo menos 16 caracteres.");
  }
  return secret;
}

export async function signAdminToken(env: {
  ADMIN_JWT_SECRET?: string;
  COOKIE_SECRET: string;
}): Promise<string> {
  const secret = getAdminJwtSecret(env);
  const key = new TextEncoder().encode(secret);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(SUB)
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(key);
}

export async function verifyAdminToken(
  token: string,
  env: { ADMIN_JWT_SECRET?: string; COOKIE_SECRET: string }
): Promise<boolean> {
  try {
    const secret = getAdminJwtSecret(env);
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { audience: AUD });
    return payload.sub === SUB;
  } catch {
    return false;
  }
}
