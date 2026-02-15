import { apiPost } from "./base";

export async function loginAdmin(username: string, password: string): Promise<{ token: string }> {
  return apiPost<{ token: string }>("/v1/admin/login", { username, password });
}
