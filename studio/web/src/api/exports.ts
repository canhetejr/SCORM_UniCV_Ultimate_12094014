import { apiGet } from "./base";

export type ExportJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

export type ExportJobItem = {
  id: string;
  vitrineId?: string;
  vitrineName?: string;
  title: string;
  type: string;
  status: ExportJobStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  downloadUrl?: string;
};

export async function getExportsList(params?: {
  status?: string;
  vitrineId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: ExportJobItem[] }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.vitrineId) q.set("vitrineId", params.vitrineId);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const query = q.toString();
  return apiGet<{ jobs: ExportJobItem[] }>(`/v1/exports${query ? `?${query}` : ""}`);
}

export async function getExportJob(id: string): Promise<ExportJobItem> {
  return apiGet<ExportJobItem>(`/v1/exports/${id}`);
}
