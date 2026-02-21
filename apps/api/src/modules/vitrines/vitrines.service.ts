import { VitrineStatus } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError.js";
import { extractEmbedHash, vimeoGet } from "../vimeo/vimeo.service.js";
import {
  createVitrine,
  findVitrineById,
  findVitrineByIdWithAccountAndVideos,
  findVitrineByIdWithVideos,
  findVitrineBySlugAndAccount,
  findAllVitrinesWithAccountAndCount,
  updateVitrineWithAccountAndVideos,
  upsertVideo,
  addVideosToVitrine,
  findVitrineVideo,
  deleteVitrineVideo,
  moveVitrineVideo,
  importVideosFromCsv,
  duplicateVitrineWithVideos,
  type ImportVideosFromCsvRow,
} from "./vitrines.repository.js";

function toKebab(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "vitrine";
}

async function ensureUniqueSlug(accountId: string, baseSlug: string, excludeId?: string): Promise<string> {
  let candidate = baseSlug;
  let n = 1;
  while (true) {
    const existing = await findVitrineBySlugAndAccount(candidate, accountId, excludeId);
    if (!existing) return candidate;
    candidate = `${baseSlug}-${n++}`;
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

async function resolveVimeoVideoId(input: string): Promise<string> {
  const s = String(input || "").trim();
  if (!s) return "";
  if (/^\d+$/.test(s)) return s;
  const m = s.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m ? m[1] : "";
}

function parseStatus(statusStr: string | undefined): VitrineStatus {
  const s = typeof statusStr === "string" ? statusStr.trim().toUpperCase() : "EDITING";
  return Object.values(VitrineStatus).includes(s as VitrineStatus) ? (s as VitrineStatus) : VitrineStatus.EDITING;
}

function parseStatusOptional(statusStr: string | undefined): VitrineStatus | undefined {
  if (typeof statusStr !== "string") return undefined;
  const s = statusStr.trim().toUpperCase();
  return Object.values(VitrineStatus).includes(s as VitrineStatus) ? (s as VitrineStatus) : undefined;
}

// --- API pública do service ---

export async function getVitrinesList() {
  const vitrines = await findAllVitrinesWithAccountAndCount();
  return vitrines.map((v) => {
    const { _count, ...rest } = v;
    return { ...rest, videoCount: _count.videos };
  });
}

export type CreateVitrineParams = {
  title: string;
  slug?: string | null;
  status?: string;
  description?: string | null;
};

export async function createVitrineForAccount(accountId: string, params: CreateVitrineParams) {
  const title = String(params.title || "").trim();
  if (!title) throw new BadRequestError("title é obrigatório.");
  let slug: string | null = typeof params.slug === "string" ? params.slug.trim() || null : null;
  if (!slug) {
    slug = await ensureUniqueSlug(accountId, toKebab(title));
  } else {
    slug = await ensureUniqueSlug(accountId, toKebab(slug));
  }
  const status = parseStatus(params.status);
  const description = params.description != null ? String(params.description) : null;

  const vitrine = await createVitrine({
    accountId,
    title,
    description,
    slug,
    status,
    vimeoSource: "MANUAL",
  });
  return { vitrine };
}

export async function getVitrineById(id: string) {
  const vitrine = await findVitrineByIdWithAccountAndVideos(id);
  if (!vitrine) throw new NotFoundError("Vitrine não encontrada.");
  return vitrine;
}

export type UpdateVitrineParams = {
  title?: string;
  slug?: string | null;
  status?: string;
};

export async function updateVitrineById(id: string, params: UpdateVitrineParams) {
  const vitrine = await findVitrineById(id);
  if (!vitrine) throw new NotFoundError("Vitrine não encontrada.");

  const title = typeof params.title === "string" ? params.title.trim() : undefined;
  const slug = typeof params.slug === "string" ? params.slug.trim() || null : undefined;
  const status = parseStatusOptional(params.status);

  const data: { title?: string; slug?: string | null; status?: VitrineStatus } = {};
  if (title !== undefined) data.title = title;
  if (slug !== undefined) data.slug = slug;
  if (status !== undefined) data.status = status;

  if (Object.keys(data).length === 0) return { vitrine };

  const updated = await updateVitrineWithAccountAndVideos(id, data);
  return { vitrine: updated };
}

export async function duplicateVitrine(accountId: string, sourceId: string) {
  const source = await findVitrineByIdWithVideos(sourceId);
  if (!source) throw new NotFoundError("Vitrine não encontrada.");

  const newTitle = `${source.title} (cópia)`;
  const baseSlug = toKebab(source.title) + "-copia";
  const slug = await ensureUniqueSlug(accountId, baseSlug);

  const newVitrine = await createVitrine({
    accountId,
    title: newTitle,
    description: source.description,
    slug,
    status: "EDITING",
    vimeoSource: "MANUAL",
  });

  await duplicateVitrineWithVideos(newVitrine.id, source.videos);

  const vitrine = await findVitrineByIdWithAccountAndVideos(newVitrine.id);
  if (!vitrine) throw new NotFoundError("Vitrine não encontrada.");
  return { vitrine };
}

export type AddVideoToVitrineParams = {
  vimeoVideoId?: string;
  url?: string;
  title?: string;
  embedHash?: string;
  thumbnailUrl?: string;
  thumbUrl?: string;
  durationSec?: number;
};

export type VimeoConnection = { accessToken: string };

export async function addVideoToVitrine(
  accountId: string,
  vitrineId: string,
  params: AddVideoToVitrineParams,
  vimeoConn: VimeoConnection | null
) {
  const vitrine = await findVitrineById(vitrineId);
  if (!vitrine) throw new NotFoundError("Vitrine não encontrada.");

  const rawId = params.vimeoVideoId || params.url || "";
  const vimeoVideoId = await resolveVimeoVideoId(rawId);
  if (!vimeoVideoId) throw new BadRequestError("Informe url (Vimeo).");

  const manualTitle = params.title ? String(params.title).trim() : "";
  if (!manualTitle) throw new BadRequestError("title é obrigatório.");

  const manualThumb =
    typeof (params.thumbUrl ?? params.thumbnailUrl) === "string"
      ? String(params.thumbUrl ?? params.thumbnailUrl).trim() || null
      : null;
  const manualDuration =
    typeof params.durationSec === "number" && params.durationSec >= 0 ? params.durationSec : null;
  const manualHash = params.embedHash ? String(params.embedHash).trim() : "";

  let title = manualTitle || `Vídeo ${vimeoVideoId}`;
  let durationSec: number | null = manualDuration;
  let thumbnailUrl: string | null = manualThumb;
  let embedHash: string | null = manualHash || null;

  if (vimeoConn && (!manualThumb || manualDuration == null)) {
    try {
      const v = await vimeoGet<{
        name?: string;
        duration?: number;
        pictures?: { sizes?: Array<{ link: string }> };
        player_embed_url?: string;
        embed?: { html?: string };
      }>({
        accessToken: vimeoConn.accessToken,
        path: `/videos/${encodeURIComponent(vimeoVideoId)}`,
      });
      if (typeof v?.name === "string" && v.name.trim()) title = v.name.trim();
      if (manualDuration == null && typeof v?.duration === "number") durationSec = v.duration;
      const thumb = v?.pictures?.sizes?.[0]?.link;
      if (!manualThumb && typeof thumb === "string") thumbnailUrl = thumb;
      const hash = extractEmbedHash({
        player_embed_url: v?.player_embed_url || null,
        embedHtml: v?.embed?.html || null,
      });
      if (hash) embedHash = hash;
    } catch {
      // continua com dados manuais
    }
  }

  const video = await upsertVideo({
    accountId,
    vimeoVideoId,
    title,
    durationSec: durationSec ?? null,
    thumbnailUrl,
    embedHash,
    playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`,
  });

  await addVideosToVitrine(vitrineId, [{ videoId: video.id }]);
  return { ok: true };
}

export async function removeVideoFromVitrine(vitrineId: string, videoId: string) {
  const vv = await findVitrineVideo(vitrineId, videoId);
  if (!vv) throw new NotFoundError("Vídeo não encontrado na playlist.");
  await deleteVitrineVideo(vv.id);
  return { ok: true };
}

export async function moveVideoInVitrine(vitrineId: string, videoId: string, direction: string) {
  const d = direction?.toLowerCase();
  if (d !== "up" && d !== "down") throw new BadRequestError("direction deve ser 'up' ou 'down'.");
  const moved = await moveVitrineVideo(vitrineId, videoId, d as "up" | "down");
  if (!moved) {
    const vv = await findVitrineVideo(vitrineId, videoId);
    if (!vv) throw new NotFoundError("Vídeo não encontrado na playlist.");
    throw new BadRequestError("Não é possível mover nessa direção.");
  }
  return { ok: true };
}

export async function importCsvIntoVitrine(
  accountId: string,
  vitrineId: string,
  csvText: string
): Promise<{ imported: number }> {
  const vitrine = await findVitrineById(vitrineId);
  if (!vitrine) throw new NotFoundError("Vitrine não encontrada.");

  const trimmed = csvText.trim();
  if (!trimmed) throw new BadRequestError("Envie o CSV como body (text/plain).");

  const lines = trimmed.split(/\r?\n/);
  if (lines.length < 2) throw new BadRequestError("CSV sem linhas suficientes.");

  const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idxId = header.indexOf("vimeo_video_id");
  const idxUrl = header.indexOf("url");
  const idxTitle = header.indexOf("title");
  const idxHash = header.indexOf("embed_hash");
  if (idxId < 0 && idxUrl < 0) {
    throw new BadRequestError("CSV deve ter coluna vimeo_video_id (ou url).");
  }

  const parsedRows: ImportVideosFromCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const parts = parseCSVLine(lines[i]);
    const raw = idxId >= 0 ? parts[idxId] : parts[idxUrl];
    const vimeoVideoId = await resolveVimeoVideoId(raw || "");
    if (!vimeoVideoId) continue;

    const title = idxTitle >= 0 ? String(parts[idxTitle] || "").trim() : "";
    const embedHash = idxHash >= 0 ? String(parts[idxHash] || "").trim() : "";
    parsedRows.push({
      accountId,
      vimeoVideoId,
      title: title || undefined,
      embedHash: embedHash || undefined,
    });
  }

  await importVideosFromCsv(vitrineId, parsedRows);
  return { imported: parsedRows.length };
}
