import { resolveBaseUrlForStatus, resolvePublicBaseUrlForStatus } from "../../lib/publicUrl.js";
import { buildConfigItems, EDITABLE_KEYS } from "./appConfig.service.js";
import { deleteAppConfigByKey, upsertAppConfig } from "./config.repository.js";

export type GetStatusParams = {
  getConfig: (key: string) => string | undefined;
  env: { LTI_PLATFORM_ISSUER?: string; LTI_PLATFORM_CLIENT_ID?: string; LTI_PLATFORM_AUTH_LOGIN_URL?: string; LTI_PLATFORM_KEYSET_URL?: string; LTI_PLATFORM_DEPLOYMENT_ID?: string; LTI_TOOL_PRIVATE_KEY_PEM?: string; LRS_ENDPOINT?: string; PUBLIC_BASE_URL?: string; BASE_URL?: string };
  vimeoClientId: () => string | undefined;
  vimeoClientSecret: () => string | undefined;
};

/**
 * Monta o payload de status (vimeo, lti, lrs, urls) para GET /status.
 */
export function getStatus(params: GetStatusParams) {
  const { getConfig, env, vimeoClientId, vimeoClientSecret } = params;
  const vimeo = { configured: Boolean(vimeoClientId() && vimeoClientSecret()) };
  const lti = {
    platformConfigured: Boolean(
      (getConfig("LTI_PLATFORM_ISSUER") ?? env.LTI_PLATFORM_ISSUER) &&
        (getConfig("LTI_PLATFORM_CLIENT_ID") ?? env.LTI_PLATFORM_CLIENT_ID) &&
        (getConfig("LTI_PLATFORM_AUTH_LOGIN_URL") ?? env.LTI_PLATFORM_AUTH_LOGIN_URL) &&
        (getConfig("LTI_PLATFORM_KEYSET_URL") ?? env.LTI_PLATFORM_KEYSET_URL) &&
        (getConfig("LTI_PLATFORM_DEPLOYMENT_ID") ?? env.LTI_PLATFORM_DEPLOYMENT_ID)
    ),
    toolKeyConfigured: Boolean(getConfig("LTI_TOOL_PRIVATE_KEY_PEM") ?? env.LTI_TOOL_PRIVATE_KEY_PEM),
  };
  const lrsEndpoint = getConfig("LRS_ENDPOINT") ?? env.LRS_ENDPOINT;
  const lrs = { configured: Boolean(lrsEndpoint && lrsEndpoint.length > 0) };
  const urls = {
    PUBLIC_BASE_URL: resolvePublicBaseUrlForStatus(getConfig, env),
    BASE_URL: resolveBaseUrlForStatus(getConfig, env),
  };
  return { vimeo, lti, lrs, urls };
}

/**
 * Retorna itens de config para GET /env (lista editável com labels e masking).
 */
export function getEnvItems(getConfig: (key: string) => string | undefined) {
  return { items: buildConfigItems(getConfig) };
}

/**
 * Aplica updates nas chaves editáveis; atualiza dbConfigMap in-place.
 * Retorna os itens atuais após a atualização.
 */
export async function updateEnv(
  updates: Record<string, string | null>,
  dbConfigMap: Map<string, string>,
  getConfig: (key: string) => string | undefined
) {
  for (const key of Object.keys(updates)) {
    if (!EDITABLE_KEYS.includes(key as (typeof EDITABLE_KEYS)[number])) continue;
    const value = updates[key];
    if (value === null || value === "") {
      await deleteAppConfigByKey(key).catch(() => {});
      dbConfigMap.delete(key);
    } else {
      const v = String(value).trim();
      await upsertAppConfig(key, v);
      dbConfigMap.set(key, v);
    }
  }
  return { items: buildConfigItems(getConfig) };
}
