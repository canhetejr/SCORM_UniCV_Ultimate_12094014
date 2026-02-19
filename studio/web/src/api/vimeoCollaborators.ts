import { apiGet, apiPost, apiDelete } from "./base";

const PREFIX = "/admin/vimeo-collaborators";

type ApiSuccess<T> = { ok: true; data: T };
type ApiError = { ok: false; error: { code: string; message: string } };

function unwrap<T>(r: ApiSuccess<T> | ApiError): T {
  if (r?.ok === true && (r as ApiSuccess<T>).data != null) return (r as ApiSuccess<T>).data;
  const err = (r as ApiError)?.error;
  const e = new Error(err?.message ?? "Resposta inválida.");
  (e as Error & { code?: string }).code = err?.code;
  throw e;
}

export type VimeoCollaboratorItem = {
  id: string;
  vimeoUserId: string;
  label: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
  lastSyncMsg: string | null;
  showcaseCount: number;
  videoCount: number;
};

export type VimeoCollaboratorShowcaseItem = {
  id: string;
  collaboratorId: string;
  vimeoShowcaseId: string;
  name: string | null;
  description: string | null;
  totalVideos: number | null;
  modifiedTime: string | null;
  pictures: { sizes?: Array<{ width?: number; link?: string }> } | null;
  lastFetchedAt: string;
  createdAt: string;
  updatedAt: string;
};

/** POST /admin/vimeo-collaborators — cria ou atualiza colaborador */
export async function createCollaborator(
  vimeoUserId: string,
  label?: string
): Promise<{ collaborator: VimeoCollaboratorItem }> {
  const r = await apiPost<ApiSuccess<{ collaborator: VimeoCollaboratorItem }>>(PREFIX, {
    vimeoUserId,
    ...(label != null && label !== "" && { label })
  });
  return unwrap(r);
}

/** GET /admin/vimeo-collaborators — lista colaboradores */
export async function listCollaborators(): Promise<{
  collaborators: VimeoCollaboratorItem[];
}> {
  const r = await apiGet<ApiSuccess<{ collaborators: VimeoCollaboratorItem[] }>>(PREFIX);
  const data = unwrap(r);
  return { collaborators: data.collaborators ?? [] };
}

/** DELETE /admin/vimeo-collaborators/:id */
export async function deleteCollaborator(id: string): Promise<void> {
  const r = await apiDelete<ApiSuccess<{ deleted: boolean }>>(`${PREFIX}/${encodeURIComponent(id)}`);
  unwrap(r);
}

/** POST /admin/vimeo-collaborators/:id/sync — sincroniza vitrines + vídeos do Vimeo para o cache */
export async function syncCollaborator(id: string): Promise<{
  showcasesFetched: number;
  showcasesUpserted: number;
  videosFetched: number;
  videosUpserted: number;
  linksUpserted: number;
  linksRemovedMarked: number;
}> {
  const r = await apiPost<ApiSuccess<{
    showcasesFetched: number;
    showcasesUpserted: number;
    videosFetched: number;
    videosUpserted: number;
    linksUpserted: number;
    linksRemovedMarked: number;
  }>>(`${PREFIX}/${encodeURIComponent(id)}/sync`);
  return unwrap(r);
}

/** GET /admin/vimeo-collaborators/:id/showcases — listagem paginada do cache */
export async function getCollaboratorShowcases(
  id: string,
  opts: { page?: number; perPage?: number; q?: string }
): Promise<{
  items: VimeoCollaboratorShowcaseItem[];
  page: number;
  perPage: number;
  total: number;
}> {
  const params = new URLSearchParams();
  if (opts.page != null) params.set("page", String(opts.page));
  if (opts.perPage != null) params.set("perPage", String(opts.perPage));
  if (opts.q != null && opts.q.trim()) params.set("q", opts.q.trim());
  const qs = params.toString();
  const path = `${PREFIX}/${encodeURIComponent(id)}/showcases${qs ? `?${qs}` : ""}`;
  const r = await apiGet<ApiSuccess<{ items: VimeoCollaboratorShowcaseItem[]; page: number; perPage: number; total: number }>>(
    path
  );
  return unwrap(r);
}

/** GET /admin/vimeo-collaborators/:id/showcases/:showcaseId/videos — listagem paginada de vídeos da vitrine (cache) */
export type VimeoCollaboratorVideoItem = {
  id: string;
  vimeoVideoId: string;
  name: string | null;
  duration: number | null;
  link: string | null;
  embedHtml?: string;
  pictures: { sizes?: Array<{ width?: number; link?: string }> } | null;
};

export async function getShowcaseVideos(
  collabId: string,
  showcaseId: string,
  opts: { page?: number; perPage?: number; q?: string }
): Promise<{
  items: VimeoCollaboratorVideoItem[];
  page: number;
  perPage: number;
  total: number;
}> {
  const params = new URLSearchParams();
  if (opts.page != null) params.set("page", String(opts.page));
  if (opts.perPage != null) params.set("perPage", String(opts.perPage));
  if (opts.q != null && opts.q.trim()) params.set("q", opts.q.trim());
  const qs = params.toString();
  const path = `${PREFIX}/${encodeURIComponent(collabId)}/showcases/${encodeURIComponent(showcaseId)}/videos${qs ? `?${qs}` : ""}`;
  const r = await apiGet<ApiSuccess<{
    items: VimeoCollaboratorVideoItem[];
    page: number;
    perPage: number;
    total: number;
  }>>(path);
  return unwrap(r);
}

/** POST /admin/vimeo-collaborators/:id/showcases/:vimeoShowcaseId/link — linka ao editor (cria Vitrine se necessário), retorna vitrineId */
export async function linkShowcaseToStudio(
  collabId: string,
  vimeoShowcaseId: string
): Promise<{ vitrineId: string }> {
  const r = await apiPost<ApiSuccess<{ vitrineId: string }>>(
    `${PREFIX}/${encodeURIComponent(collabId)}/showcases/${encodeURIComponent(vimeoShowcaseId)}/link`
  );
  return unwrap(r);
}
