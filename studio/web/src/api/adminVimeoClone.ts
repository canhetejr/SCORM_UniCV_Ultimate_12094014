import { apiGet, apiPost, apiDelete } from "./base";

const PREFIX = "/admin/vimeo-clone";

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: { code: string; message: string } };

function unwrap<T>(r: ApiSuccess<T> | ApiFailure): T {
  if (r.ok && r.data != null) return r.data;
  const err = !r.ok ? r.error : { code: "unknown", message: "Resposta inválida." };
  throw new Error(err.message);
}

export type VimeoProfilePublic = {
  id: string;
  label: string | null;
  vimeoUserId: string;
  vimeoUri: string | null;
  name: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function postProfile(accessToken: string, label?: string): Promise<{ profile: VimeoProfilePublic }> {
  const r = await apiPost<ApiSuccess<{ profile: VimeoProfilePublic }> | ApiFailure>(
    `${PREFIX}/profiles`,
    { accessToken: accessToken.trim(), label: label?.trim() || undefined }
  );
  return unwrap(r);
}

export async function getProfiles(): Promise<{ profiles: VimeoProfilePublic[] }> {
  const r = await apiGet<ApiSuccess<{ profiles: VimeoProfilePublic[] }> | ApiFailure>(`${PREFIX}/profiles`);
  return unwrap(r);
}

export async function deleteProfile(id: string): Promise<{ message: string }> {
  const r = await apiDelete<ApiSuccess<{ message: string }> | ApiFailure>(`${PREFIX}/profiles/${encodeURIComponent(id)}`);
  return unwrap(r);
}

export type SyncResult = {
  showcasesUpserted: number;
  videosUpserted: number;
  linksUpserted: number;
  linksRemovedMarked: number;
};

export async function postProfileSync(profileId: string, mode: "full" | "incremental" = "full"): Promise<SyncResult> {
  const r = await apiPost<ApiSuccess<SyncResult> | ApiFailure>(
    `${PREFIX}/profiles/${encodeURIComponent(profileId)}/sync?mode=${mode}`
  );
  return unwrap(r);
}

export type ShowcaseItem = {
  id: string;
  vimeoId: string;
  uri: string | null;
  name: string | null;
  description: string | null;
  privacy: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
  totalVideos: number | null;
  pictures: unknown;
};

export async function getShowcases(
  profileId: string,
  params?: { q?: string; page?: number; perPage?: number }
): Promise<{ items: ShowcaseItem[]; total: number; page: number; perPage: number }> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.perPage != null) sp.set("perPage", String(params.perPage));
  const qs = sp.toString();
  const r = await apiGet<
    ApiSuccess<{ items: ShowcaseItem[]; total: number; page: number; perPage: number }> | ApiFailure
  >(`${PREFIX}/profiles/${encodeURIComponent(profileId)}/showcases${qs ? `?${qs}` : ""}`);
  return unwrap(r);
}

export type VideoItem = {
  id: string;
  vimeoId: string;
  uri: string | null;
  name: string | null;
  description: string | null;
  duration: number | null;
  link: string | null;
  embedHtml: string | null;
  privacy: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
  pictures: unknown;
  position: number | null;
};

export async function getShowcaseVideos(
  profileId: string,
  showcaseId: string,
  params?: { page?: number; perPage?: number }
): Promise<{ items: VideoItem[]; total: number; page: number; perPage: number }> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.perPage != null) sp.set("perPage", String(params.perPage));
  const qs = sp.toString();
  const r = await apiGet<
    ApiSuccess<{ items: VideoItem[]; total: number; page: number; perPage: number }> | ApiFailure
  >(
    `${PREFIX}/profiles/${encodeURIComponent(profileId)}/showcases/${encodeURIComponent(showcaseId)}/videos${qs ? `?${qs}` : ""}`
  );
  return unwrap(r);
}

export async function postImportToStudio(showcaseId: string): Promise<{ vitrineId: string; message: string }> {
  const r = await apiPost<ApiSuccess<{ vitrineId: string; message: string }> | ApiFailure>(
    `${PREFIX}/showcases/${encodeURIComponent(showcaseId)}/import-to-studio`
  );
  return unwrap(r);
}

/** Pega a melhor URL de thumbnail de pictures.sizes (maior largura razoável). */
export function getBestThumbUrl(pictures: unknown): string | null {
  if (!pictures || typeof pictures !== "object") return null;
  const sizes = (pictures as { sizes?: Array<{ width?: number; link?: string }> }).sizes;
  if (!Array.isArray(sizes) || sizes.length === 0) return null;
  const withLink = sizes.filter((s) => s?.link);
  if (withLink.length === 0) return null;
  const sorted = [...withLink].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.link ?? null;
}
