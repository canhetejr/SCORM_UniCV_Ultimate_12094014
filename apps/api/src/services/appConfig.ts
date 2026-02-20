import type { Env } from "../env.js";
import type { PrismaClient } from "@prisma/client";

export const EDITABLE_KEYS = [
  "BASE_URL",
  "PUBLIC_BASE_URL",
  "VIMEO_CLIENT_ID",
  "VIMEO_CLIENT_SECRET",
  "VIMEO_REDIRECT_URI",
  "LTI_PLATFORM_ISSUER",
  "LTI_PLATFORM_CLIENT_ID",
  "LTI_PLATFORM_AUTH_LOGIN_URL",
  "LTI_PLATFORM_KEYSET_URL",
  "LTI_PLATFORM_DEPLOYMENT_ID",
  "LTI_TOOL_KID",
  "LTI_TOOL_PRIVATE_KEY_PEM",
  "LRS_ENDPOINT",
  "LRS_BASIC_AUTH"
] as const;

export const SECRET_KEYS = new Set<string>([
  "VIMEO_CLIENT_SECRET",
  "LTI_TOOL_PRIVATE_KEY_PEM",
  "LRS_BASIC_AUTH"
]);

export type ConfigItem = {
  key: string;
  value: string | null;
  masked: boolean;
  label: string;
};

const KEY_LABELS: Record<string, string> = {
  BASE_URL: "URL base do serviço",
  PUBLIC_BASE_URL: "URL pública do player/embed (SCORM, iframe; evita localhost em produção)",
  VIMEO_CLIENT_ID: "Vimeo Client ID",
  VIMEO_CLIENT_SECRET: "Vimeo Client Secret",
  VIMEO_REDIRECT_URI: "Vimeo Redirect URI (opcional)",
  LTI_PLATFORM_ISSUER: "LTI Platform Issuer (ex: https://seu-moodle)",
  LTI_PLATFORM_CLIENT_ID: "LTI Platform Client ID",
  LTI_PLATFORM_AUTH_LOGIN_URL: "LTI Auth Login URL",
  LTI_PLATFORM_KEYSET_URL: "LTI Platform Keyset URL",
  LTI_PLATFORM_DEPLOYMENT_ID: "LTI Deployment ID",
  LTI_TOOL_KID: "LTI Tool Key ID",
  LTI_TOOL_PRIVATE_KEY_PEM: "LTI Tool Private Key (PEM)",
  LRS_ENDPOINT: "LRS Endpoint (xAPI)",
  LRS_BASIC_AUTH: "LRS Basic Auth (opcional)"
};

export function createConfigGetter(
  env: Env,
  dbMap: Map<string, string>
): (key: string) => string | undefined {
  return (key: string): string | undefined => {
    const fromDb = dbMap.get(key);
    if (fromDb !== undefined && fromDb !== "") return fromDb;
    const v = (env as unknown as Record<string, string | number | undefined>)[key];
    const s = typeof v === "number" ? String(v) : v;
    return s !== undefined && s !== "" ? s : undefined;
  };
}

export async function loadDbConfig(prisma: PrismaClient): Promise<Map<string, string>> {
  const rows = await prisma.appConfig.findMany();
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.value != null && r.value !== "") map.set(r.key, r.value);
  }
  return map;
}

export function buildConfigItems(getConfig: (key: string) => string | undefined): ConfigItem[] {
  return EDITABLE_KEYS.map((key) => {
    const raw = getConfig(key) ?? null;
    const masked = SECRET_KEYS.has(key) && raw != null && raw.length > 0;
    return {
      key,
      value: masked ? "***" : raw,
      masked,
      label: KEY_LABELS[key] ?? key
    };
  });
}
