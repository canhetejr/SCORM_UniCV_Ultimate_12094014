import { apiGet, apiPut, apiPost, apiDelete } from "./base";
import type { Vitrine } from "../types/vitrine";

export type VitrineDetail = {
  id: string;
  title: string;
  description: string | null;
  vimeoShowcaseId: string | null;
  vimeoSource: "MANUAL" | "VIMEO_SHOWCASE";
  slug?: string | null;
  status?: "ACTIVE" | "EDITING" | "INACTIVE";
  videos?: Array<{
    id: string;
    position: number;
    video: {
      id: string;
      title: string;
      durationSec: number | null;
      thumbnailUrl: string | null;
      vimeoVideoId: string;
    };
  }>;
};

export async function fetchAllVitrines(): Promise<Vitrine[]> {
  try {
    const data = await apiGet<{ vitrines: Vitrine[] }>("/admin/vitrines");
    return data.vitrines ?? [];
  } catch (error) {
    throw error;
  }
}

export async function fetchCollabVitrines(): Promise<Vitrine[]> {
  const data = await apiGet<{ vitrines: Vitrine[] }>("/collab/vitrines");
  return data.vitrines ?? [];
}

export async function getVitrineDetail(id: string): Promise<VitrineDetail> {
  return apiGet<VitrineDetail>(`/v1/vitrines/${encodeURIComponent(id)}`);
}

export async function putVitrine(
  id: string,
  data: { title?: string; slug?: string | null; status?: string }
): Promise<{ vitrine: VitrineDetail }> {
  return apiPut<{ vitrine: VitrineDetail }>(`/v1/vitrines/${encodeURIComponent(id)}`, data);
}

export async function postVitrine(data: {
  title: string;
  slug?: string;
  status?: string;
}): Promise<{ vitrine: VitrineDetail }> {
  return apiPost<{ vitrine: VitrineDetail }>("/v1/vitrines", data);
}

export async function postDuplicateVitrine(id: string): Promise<{ vitrine: VitrineDetail }> {
  return apiPost<{ vitrine: VitrineDetail }>(`/v1/vitrines/${encodeURIComponent(id)}/duplicate`, {});
}

export async function postPlaylistVideo(
  vitrineId: string,
  data: { title: string; url: string; thumbUrl?: string; durationSec?: number }
): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>(`/v1/vitrines/${encodeURIComponent(vitrineId)}/videos`, {
    title: data.title,
    url: data.url,
    ...(data.thumbUrl && { thumbUrl: data.thumbUrl }),
    ...(data.durationSec != null && { durationSec: data.durationSec })
  });
}

export async function deletePlaylistVideo(vitrineId: string, videoId: string): Promise<{ ok: boolean }> {
  return apiDelete<{ ok: boolean }>(
    `/v1/vitrines/${encodeURIComponent(vitrineId)}/videos/${encodeURIComponent(videoId)}`
  );
}

export async function movePlaylistVideo(
  vitrineId: string,
  videoId: string,
  direction: "up" | "down"
): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>(
    `/v1/vitrines/${encodeURIComponent(vitrineId)}/videos/${encodeURIComponent(videoId)}/move`,
    { direction }
  );
}

export async function syncVitrineFromVimeo(showcaseId: string, vimeoUserId?: string): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>(`/v1/vimeo/showcases/${encodeURIComponent(showcaseId)}/import`, {
    ...(vimeoUserId && { vimeoUserId })
  });
}

type VimeoCacheVideoItem = {
  id: string;
  vimeoVideoId: string;
  name: string | null;
  duration: number | null;
  link: string | null;
  thumbnailUrl: string | null;
  position: number | null;
};

/** GET /admin/vitrines/:id/vimeo-cache/videos — vídeos do cache (paginação) */
export async function getVitrineVimeoCacheVideos(
  vitrineId: string,
  opts?: { page?: number; perPage?: number; q?: string }
): Promise<{ items: VimeoCacheVideoItem[]; page: number; perPage: number; total: number }> {
  const params = new URLSearchParams();
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.perPage != null) params.set("perPage", String(opts.perPage));
  if (opts?.q != null && opts.q.trim()) params.set("q", opts.q.trim());
  const qs = params.toString();
  const path = `/admin/vitrines/${encodeURIComponent(vitrineId)}/vimeo-cache/videos${qs ? `?${qs}` : ""}`;
  const r = await apiGet<{ ok: true; data: { items: VimeoCacheVideoItem[]; page: number; perPage: number; total: number } }>(path);
  const data = (r as { data?: { items: VimeoCacheVideoItem[]; page: number; perPage: number; total: number } })?.data;
  if (!data) throw new Error("Resposta inválida.");
  return data;
}

/** POST /admin/vitrines/:id/vimeo-cache/apply — aplica cache na playlist interna */
export async function applyVitrineVimeoCache(vitrineId: string): Promise<{ applied: number }> {
  const r = await apiPost<{ ok: true; data: { applied: number } }>(
    `/admin/vitrines/${encodeURIComponent(vitrineId)}/vimeo-cache/apply`,
    {}
  );
  const data = (r as { data?: { applied: number } })?.data;
  if (data == null) throw new Error("Resposta inválida.");
  return { applied: data.applied };
}
