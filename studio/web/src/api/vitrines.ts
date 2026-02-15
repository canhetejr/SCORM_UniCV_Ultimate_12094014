import { apiGet, apiPut, apiPost, apiDelete } from "./base";

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
