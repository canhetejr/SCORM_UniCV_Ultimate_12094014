import { apiGet } from "./base";

export type VimeoStatusResponse = {
  connected: boolean;
  configured?: boolean;
  vimeoUserId?: string | null;
  lastSyncAt?: string | null;
};

export async function getVimeoStatus(): Promise<VimeoStatusResponse> {
  return apiGet<VimeoStatusResponse>("/v1/vimeo/status");
}

export async function getVimeoOAuthStartUrl(): Promise<{ url: string }> {
  return apiGet<{ url: string }>("/v1/vimeo/oauth/start");
}
