import { apiGet, apiPut } from "./base";

export type ConfigStatusResponse = {
  vimeo: { configured: boolean };
  lti: { platformConfigured: boolean; toolKeyConfigured: boolean };
  lrs: { configured: boolean };
};

export async function getConfigStatus(): Promise<ConfigStatusResponse> {
  return apiGet<ConfigStatusResponse>("/v1/config/status");
}

export type LtiConfigResponse = {
  tool: {
    initiate_login_url: string;
    redirect_uris: string[];
    jwks_url: string;
    launch_url: string;
    player_url?: string;
  };
};

export async function getLtiConfig(): Promise<LtiConfigResponse> {
  return apiGet<LtiConfigResponse>("/lti/config");
}

export type ConfigEnvItem = {
  key: string;
  value: string | null;
  masked: boolean;
  label: string;
};

export async function getConfigEnv(): Promise<{ items: ConfigEnvItem[] }> {
  return apiGet<{ items: ConfigEnvItem[] }>("/v1/config/env");
}

export async function putConfigEnv(updates: Record<string, string | null>): Promise<{ items: ConfigEnvItem[] }> {
  return apiPut<{ items: ConfigEnvItem[] }>("/v1/config/env", { updates });
}
