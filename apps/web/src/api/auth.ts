import { apiGet, apiPost } from "./base";

export type MeResponse = { id: string; role: string };

export async function getMe(): Promise<MeResponse> {
  return apiGet<MeResponse>("/v1/admin/me");
}

export async function loginAdmin(username: string, password: string): Promise<{ token: string }> {
  return apiPost<{ token: string }>("/v1/admin/login", { username, password });
}
