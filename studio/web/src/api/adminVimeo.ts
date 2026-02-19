import { apiGet, apiPost, apiDelete } from "./base";

const PREFIX = "/admin/vimeo";

type ApiSuccess<T> = { ok: true; data: T };

export type VimeoPingResponse = { ok: boolean; message: string };

export type VimeoShowcaseItem = { id: string; name: string; description?: string; createdAt?: string | null };

/** Vitrines de um usuário Vimeo (GET /admin/vimeo/users/:userId/showcases) */
export type VimeoUserShowcaseItem = {
  id: string;
  name: string | null;
  uri: string | null;
  totalVideos: number | null;
  pictures: { sizes?: Array<{ width?: number; link?: string }> } | null;
  modifiedTime: string | null;
};

export async function getVimeoUserShowcases(userId: string): Promise<{ showcases: VimeoUserShowcaseItem[] }> {
  const normalized = String(userId).trim().replace(/^\/users\//i, "").replace(/\D/g, "") || String(userId).trim();
  if (!normalized) return { showcases: [] };
  const r = await apiGet<ApiSuccess<{ showcases: VimeoUserShowcaseItem[] }>>(
    `${PREFIX}/users/${encodeURIComponent(normalized)}/showcases`
  );
  return r?.ok && r.data != null ? r.data : { showcases: [] };
}

export type VimeoVideoItem = { id: string; title: string };

export async function getVimeoPing(): Promise<VimeoPingResponse> {
  const r = await apiGet<ApiSuccess<VimeoPingResponse>>(`${PREFIX}/ping`);
  return r?.ok && r.data != null ? r.data : { ok: false, message: "Resposta inválida." };
}

export async function getVimeoShowcases(): Promise<{ showcases: VimeoShowcaseItem[] }> {
  const r = await apiGet<ApiSuccess<{ showcases: VimeoShowcaseItem[] }>>(`${PREFIX}/showcases`);
  return r?.ok && r.data != null ? r.data : { showcases: [] };
}

export async function getVimeoShowcaseVideos(showcaseId: string): Promise<{ videos: VimeoVideoItem[] }> {
  const r = await apiGet<ApiSuccess<{ videos: VimeoVideoItem[] }>>(
    `${PREFIX}/showcases/${encodeURIComponent(showcaseId)}/videos`
  );
  return r?.ok && r.data != null ? r.data : { videos: [] };
}

export async function postVimeoShowcaseVideo(
  showcaseId: string,
  videoIdOrUri: string
): Promise<{ ok: boolean; message?: string }> {
  const r = await apiPost<ApiSuccess<{ message?: string }>>(
    `${PREFIX}/showcases/${encodeURIComponent(showcaseId)}/videos`,
    { videoIdOrUri }
  );
  return r?.ok && r.data != null ? { ok: true, message: r.data.message } : { ok: false };
}

export async function deleteVimeoShowcaseVideo(
  showcaseId: string,
  videoId: string
): Promise<{ ok: boolean; message?: string }> {
  const r = await apiDelete<ApiSuccess<{ message?: string }>>(
    `${PREFIX}/showcases/${encodeURIComponent(showcaseId)}/videos/${encodeURIComponent(videoId)}`
  );
  return r?.ok && r.data != null ? { ok: true, message: r.data.message } : { ok: false };
}

export type VitrineExportPayload = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  vimeoShowcaseId: string | null;
  createdAt: string;
  updatedAt: string;
  videos: Array<{ position: number; id: string; vimeoVideoId: string; title: string }>;
};

export async function getVitrineExport(vitrineId: string): Promise<VitrineExportPayload> {
  const r = await apiGet<ApiSuccess<VitrineExportPayload>>(
    `${PREFIX}/vitrines/${encodeURIComponent(vitrineId)}/export`
  );
  if (r?.ok && r.data != null) return r.data;
  throw new Error("Exportação inválida.");
}

export async function postShowcaseImport(
  json: unknown
): Promise<{ ok: boolean; vitrineId: string; message?: string }> {
  const r = await apiPost<ApiSuccess<{ vitrineId: string; message?: string }>>(
    `${PREFIX}/showcases/import`,
    { json }
  );
  return r?.ok && r.data != null
    ? { ok: true, vitrineId: r.data.vitrineId, message: r.data.message }
    : { ok: false, vitrineId: "" };
}
