import type { VimeoCollaboratorShowcaseItem, VimeoCollaboratorVideoItem } from "../../api/vimeoCollaborators";
import type { Vitrine } from "../../types/vitrine";
import type { VitrinesFilters } from "../../components/app";

export function getErrorMessage(error: unknown): string {
  const e = error as { message?: string };
  return e?.message ?? "Erro ao carregar.";
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "a, button, input, textarea, select, summary, details, [role='button'], [role='link']"
    )
  );
}

export function filterAndSortVitrines(list: Vitrine[], f: VitrinesFilters): Vitrine[] {
  let out = list;
  const q = f.q.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (v) =>
        (v.title || "").toLowerCase().includes(q) ||
        (v.id || "").toLowerCase().includes(q) ||
        (v.vimeoShowcaseId || "").toLowerCase().includes(q)
    );
  }
  if (f.status) out = out.filter((v) => v.status === f.status);
  if (f.dateFrom) {
    const from = new Date(f.dateFrom).getTime();
    out = out.filter((v) => new Date(v.createdAt).getTime() >= from);
  }
  if (f.dateTo) {
    const to = new Date(f.dateTo).getTime();
    out = out.filter((v) => new Date(v.createdAt).getTime() <= to);
  }
  const minV = f.minVideos.trim() ? parseInt(f.minVideos, 10) : null;
  const maxV = f.maxVideos.trim() ? parseInt(f.maxVideos, 10) : null;
  if (minV != null && !Number.isNaN(minV)) out = out.filter((v) => (v.videoCount ?? 0) >= minV);
  if (maxV != null && !Number.isNaN(maxV)) out = out.filter((v) => (v.videoCount ?? 0) <= maxV);
  out = [...out].sort((a, b) => {
    if (f.sort === "title_asc") return (a.title || "").localeCompare(b.title || "");
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return f.sort === "createdAt_asc" ? ta - tb : tb - ta;
  });
  return out;
}

export function getBestThumb(pictures: VimeoCollaboratorShowcaseItem["pictures"]): string | null {
  if (!pictures?.sizes?.length) return null;
  const withLink = pictures.sizes.filter((s) => s?.link);
  if (!withLink.length) return null;
  const sorted = [...withLink].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.link ?? null;
}

export function getVideoThumb(pictures: VimeoCollaboratorVideoItem["pictures"]): string | null {
  if (!pictures?.sizes?.length) return null;
  const withLink = pictures.sizes.filter((s) => s?.link);
  if (!withLink.length) return null;
  const sorted = [...withLink].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.link ?? null;
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
