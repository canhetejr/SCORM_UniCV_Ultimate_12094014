import crypto from "node:crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;
const KEY_LEN = 32;

export class CryptoTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoTokenError";
  }
}

/**
 * Obtém buffer de 32 bytes a partir de VIMEO_TOKEN_ENCRYPTION_KEY (base64).
 * Lança se a chave não existir ou não decodificar para 32 bytes.
 */
export function getEncryptionKey(envKey: string | undefined): Buffer {
  if (!envKey || typeof envKey !== "string") {
    throw new CryptoTokenError("VIMEO_TOKEN_ENCRYPTION_KEY não definida.");
  }
  const trimmed = envKey.trim();
  if (!trimmed) throw new CryptoTokenError("VIMEO_TOKEN_ENCRYPTION_KEY vazia.");
  let key: Buffer;
  try {
    key = Buffer.from(trimmed, "base64");
  } catch {
    throw new CryptoTokenError("VIMEO_TOKEN_ENCRYPTION_KEY deve ser base64 válido.");
  }
  if (key.length !== KEY_LEN) {
    throw new CryptoTokenError(`VIMEO_TOKEN_ENCRYPTION_KEY deve decodificar para exatamente ${KEY_LEN} bytes.`);
  }
  return key;
}

/**
 * Criptografa plaintext com AES-256-GCM.
 * Formato armazenado: base64(iv || authTag || ciphertext).
 */
export function encryptToken(plaintext: string, envKey: string | undefined): string {
  const key = getEncryptionKey(envKey);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv, { authTagLength: AUTH_TAG_LEN });
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/**
 * Descriptografa um valor produzido por encryptToken.
 */
export function decryptToken(encryptedBase64: string, envKey: string | undefined): string {
  if (!encryptedBase64 || typeof encryptedBase64 !== "string") {
    throw new CryptoTokenError("Token criptografado inválido.");
  }
  const key = getEncryptionKey(envKey);
  let buf: Buffer;
  try {
    buf = Buffer.from(encryptedBase64, "base64");
  } catch {
    throw new CryptoTokenError("Token criptografado não é base64 válido.");
  }
  if (buf.length < IV_LEN + AUTH_TAG_LEN) {
    throw new CryptoTokenError("Token criptografado truncado.");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = crypto.createDecipheriv(ALG, key, iv, { authTagLength: AUTH_TAG_LEN });
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}
