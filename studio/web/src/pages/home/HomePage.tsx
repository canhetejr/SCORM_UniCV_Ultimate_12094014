import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createCollaborator,
  listCollaborators,
  syncCollaborator,
  getCollaboratorShowcases,
  getShowcaseVideos,
  linkShowcaseToStudio,
  type VimeoCollaboratorItem,
  type VimeoCollaboratorShowcaseItem,
  type VimeoCollaboratorVideoItem
} from "../../api/vimeoCollaborators";
import { fetchAllVitrines } from "../../api";
import { VitrineCard, VitrinesAdvancedSearch, defaultFilters, parseFiltersFromSearchParams, filtersToSearchParams } from "../../components/app";
import type { VitrinesFilters } from "../../components/app";
import { Button, Card, ToastContainer } from "../../components/ui";
import { useToast } from "../../hooks/useToast";
import { useVitrinesStore } from "../../store/vitrinesStore";
import type { Vitrine } from "../../types/vitrine";

const PER_PAGE_OPTIONS = [12, 16];
const DEFAULT_PER_PAGE = 12;
const VIDEOS_PER_PAGE_OPTIONS = [12, 24];
const DEFAULT_VIDEOS_PER_PAGE = 24;
const SEARCH_DEBOUNCE_MS = 300;
const COLLAB_STORAGE_KEY = "unicv_vimeo_collaborator_id";

function getErrorMessage(error: unknown): string {
  const e = error as { message?: string };
  return e?.message ?? "Erro ao carregar.";
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "a, button, input, textarea, select, summary, details, [role='button'], [role='link']"
    )
  );
}

function filterAndSortVitrines(list: Vitrine[], f: VitrinesFilters): Vitrine[] {
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

function getBestThumb(pictures: VimeoCollaboratorShowcaseItem["pictures"]): string | null {
  if (!pictures?.sizes?.length) return null;
  const withLink = pictures.sizes.filter((s) => s?.link);
  if (!withLink.length) return null;
  const sorted = [...withLink].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.link ?? null;
}

function getVideoThumb(pictures: VimeoCollaboratorVideoItem["pictures"]): string | null {
  if (!pictures?.sizes?.length) return null;
  const withLink = pictures.sizes.filter((s) => s?.link);
  if (!withLink.length) return null;
  const sorted = [...withLink].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.link ?? null;
}

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const vitrines = useVitrinesStore((s) => s.admin.vitrines);
  const setInitial = useVitrinesStore((s) => s.setInitial);

  // URL state: collaboratorId, q, page, perPage
  const collaboratorIdFromUrl = searchParams.get("collaboratorId") ?? "";
  const qFromUrl = searchParams.get("q") ?? "";
  const pageFromUrl = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPageFromUrl = PER_PAGE_OPTIONS.includes(parseInt(searchParams.get("perPage") ?? "", 10))
    ? parseInt(searchParams.get("perPage") ?? "", 10)
    : DEFAULT_PER_PAGE;

  const [vimeoUserIdInput, setVimeoUserIdInput] = useState("");
  const [collaborators, setCollaborators] = useState<VimeoCollaboratorItem[]>([]);
  const [selectedCollabId, setSelectedCollabId] = useState(() => {
    if (collaboratorIdFromUrl) return collaboratorIdFromUrl;
    try {
      return localStorage.getItem(COLLAB_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [searchQ, setSearchQ] = useState(() => qFromUrl);
  const [page, setPage] = useState(() => pageFromUrl);
  const [perPage, setPerPage] = useState(() => perPageFromUrl);
  const [showcases, setShowcases] = useState<VimeoCollaboratorShowcaseItem[]>([]);
  const [showcasesTotal, setShowcasesTotal] = useState(0);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingShowcases, setLoadingShowcases] = useState(false);
  const [loadingLink, setLoadingLink] = useState<string | null>(null);
  const [loadingVitrines, setLoadingVitrines] = useState(false);

  // Modal Vídeos
  const [videosModal, setVideosModal] = useState<{ showcaseId: string; showcaseName: string } | null>(null);
  const [videosQ, setVideosQ] = useState("");
  const [videosQDebounced, setVideosQDebounced] = useState("");
  const [videosPage, setVideosPage] = useState(1);
  const [videosPerPage, setVideosPerPage] = useState(DEFAULT_VIDEOS_PER_PAGE);
  const [videos, setVideos] = useState<VimeoCollaboratorVideoItem[]>([]);
  const [videosTotal, setVideosTotal] = useState(0);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams]
  );
  const setFilters = useCallback(
    (f: VitrinesFilters) => {
      setSearchParams(filtersToSearchParams(f), { replace: true });
    },
    [setSearchParams]
  );
  const filteredVitrines = useMemo(
    () => filterAndSortVitrines(vitrines, filters),
    [vitrines, filters]
  );

  // Persist collaboratorId, q, page, perPage in URL
  const updateUrl = useCallback(
    (updates: { collaboratorId?: string; q?: string; page?: number; perPage?: number }) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (updates.collaboratorId !== undefined) {
          if (updates.collaboratorId) next.set("collaboratorId", updates.collaboratorId);
          else next.delete("collaboratorId");
        }
        if (updates.q !== undefined) {
          if (updates.q) next.set("q", updates.q);
          else next.delete("q");
        }
        if (updates.page !== undefined) {
          next.set("page", String(updates.page));
        }
        if (updates.perPage !== undefined) {
          next.set("perPage", String(updates.perPage));
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  // Load collaborators on mount
  useEffect(() => {
    setLoadingCollaborators(true);
    listCollaborators()
      .then((res) => setCollaborators(res.collaborators ?? []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingCollaborators(false));
  }, [toast]);

  // Persist selected collaborator to localStorage (preference only)
  useEffect(() => {
    if (!selectedCollabId) return;
    try {
      localStorage.setItem(COLLAB_STORAGE_KEY, selectedCollabId);
    } catch {
      /* ignore */
    }
  }, [selectedCollabId]);

  // Debounce busca vitrines (300ms) → atualiza URL e refetch
  useEffect(() => {
    const t = setTimeout(() => updateUrl({ q: searchQ.trim(), page: 1 }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQ]);

  // Debounce busca vídeos no modal (300ms)
  useEffect(() => {
    if (!videosModal) return;
    const t = setTimeout(() => setVideosQDebounced(videosQ.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [videosModal, videosQ]);

  // Carregar vídeos do modal (cache) quando abre ou page/perPage/q mudam
  useEffect(() => {
    if (!videosModal || !selectedCollabId) return;
    setLoadingVideos(true);
    getShowcaseVideos(selectedCollabId, videosModal.showcaseId, {
      page: videosPage,
      perPage: videosPerPage,
      q: videosQDebounced.trim() || undefined
    })
      .then((r) => {
        setVideos(r.items ?? []);
        setVideosTotal(r.total ?? 0);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err));
        setVideos([]);
        setVideosTotal(0);
      })
      .finally(() => setLoadingVideos(false));
  }, [videosModal, selectedCollabId, videosPage, videosPerPage, videosQDebounced, toast]);

  // Load showcases when selected collaborator or q/page/perPage change
  const effectiveQ = searchParams.get("q") ?? "";
  const effectivePage = parseInt(searchParams.get("page") ?? String(page), 10) || 1;
  const effectivePerPage = PER_PAGE_OPTIONS.includes(parseInt(searchParams.get("perPage") ?? "", 10))
    ? parseInt(searchParams.get("perPage") ?? "", 10)
    : perPage;
  useEffect(() => {
    if (!selectedCollabId) {
      setShowcases([]);
      setShowcasesTotal(0);
      return;
    }
    setLoadingShowcases(true);
    getCollaboratorShowcases(selectedCollabId, {
      page: effectivePage,
      perPage: effectivePerPage,
      q: effectiveQ || undefined
    })
      .then((res) => {
        setShowcases(res.items ?? []);
        setShowcasesTotal(res.total ?? 0);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err));
        setShowcases([]);
        setShowcasesTotal(0);
      })
      .finally(() => setLoadingShowcases(false));
  }, [selectedCollabId, effectivePage, effectivePerPage, effectiveQ, toast]);

  // Vitrines do Studio (lista completa para a seção "Minhas vitrines")
  useEffect(() => {
    if (vitrines.length > 0) return;
    setLoadingVitrines(true);
    fetchAllVitrines()
      .then((data) => setInitial("admin", data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingVitrines(false));
  }, [vitrines.length, setInitial, toast]);

  const handleAddCollaborator = useCallback(async () => {
    const uid = vimeoUserIdInput.trim();
    if (!uid) {
      toast.warning("Informe o Vimeo User ID.");
      return;
    }
    setLoadingAdd(true);
    try {
      const res = await createCollaborator(uid);
      setCollaborators((prev) => {
        const list = prev.filter((c) => c.id !== res.collaborator.id);
        return [res.collaborator, ...list];
      });
      setSelectedCollabId(res.collaborator.id);
      updateUrl({ collaboratorId: res.collaborator.id, page: 1 });
      setVimeoUserIdInput("");
      toast.success("Colaborador adicionado. Sincronizando vitrines e vídeos…");
      const syncRes = await syncCollaborator(res.collaborator.id);
      toast.success(
        `${syncRes.showcasesUpserted} vitrine(s), ${syncRes.videosUpserted} vídeo(s) em cache.`
      );
      listCollaborators().then((r) => setCollaborators(r.collaborators ?? []));
      getCollaboratorShowcases(res.collaborator.id, { page: 1, perPage: effectivePerPage, q: effectiveQ || undefined })
        .then((r) => {
          setShowcases(r.items ?? []);
          setShowcasesTotal(r.total ?? 0);
        })
        .catch(() => {});
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingAdd(false);
    }
  }, [vimeoUserIdInput, toast, updateUrl, effectivePerPage, effectiveQ]);

  const handleSync = useCallback(async () => {
    if (!selectedCollabId) return;
    setLoadingSync(true);
    try {
      const res = await syncCollaborator(selectedCollabId);
      toast.success(
        `${res.showcasesUpserted} vitrine(s), ${res.videosUpserted} vídeo(s) atualizados.`
      );
      listCollaborators().then((r) => setCollaborators(r.collaborators ?? []));
      getCollaboratorShowcases(selectedCollabId, { page: effectivePage, perPage: effectivePerPage, q: effectiveQ || undefined })
        .then((r) => {
          setShowcases(r.items ?? []);
          setShowcasesTotal(r.total ?? 0);
        })
        .catch(() => {});
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingSync(false);
    }
  }, [selectedCollabId, effectivePage, effectivePerPage, effectiveQ, toast]);

  const handleSearchSubmit = useCallback(() => {
    updateUrl({ q: searchQ.trim(), page: 1 });
  }, [searchQ, updateUrl]);

  const handleEditarShowcase = useCallback(
    async (vimeoShowcaseId: string) => {
      if (!selectedCollabId) return;
      setLoadingLink(vimeoShowcaseId);
      try {
        const res = await linkShowcaseToStudio(selectedCollabId, vimeoShowcaseId);
        navigate(`/vitrines/${res.vitrineId}`);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoadingLink(null);
      }
    },
    [selectedCollabId, navigate, toast]
  );

  const totalPages = Math.max(1, Math.ceil(showcasesTotal / effectivePerPage));
  const hasVideoCount = vitrines.some((v) => typeof v.videoCount === "number");
  const selectedCollab = collaborators.find((c) => c.id === selectedCollabId);
  const videosTotalPages = Math.max(1, Math.ceil(videosTotal / videosPerPage));

  const openVideosModal = useCallback((showcaseId: string, showcaseName: string) => {
    setVideosModal({ showcaseId, showcaseName });
    setVideosQ("");
    setVideosQDebounced("");
    setVideosPage(1);
    setVideosPerPage(DEFAULT_VIDEOS_PER_PAGE);
  }, []);

  const copyVideoLink = useCallback((link: string | null) => {
    if (!link) return;
    navigator.clipboard.writeText(link).then(
      () => toast.success("Link copiado."),
      () => toast.error("Não foi possível copiar.")
    );
  }, [toast]);

  return (
    <div className="page-home">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />

      <Card plain>
        <h2 style={{ margin: 0 }}>Colaboradores Vimeo</h2>
        <p className="muted" style={{ marginTop: 6, marginBottom: 12 }}>
          Adicione um Vimeo User ID para salvar o colaborador e usar a lista permanente de vitrines (cache no banco).
        </p>
        <div className="flex gap-md items-center flex-wrap" style={{ marginBottom: 16 }}>
          <label className="flex items-center gap-sm">
            <span className="muted">Vimeo User ID:</span>
            <input
              type="text"
              className="input"
              value={vimeoUserIdInput}
              onChange={(e) => setVimeoUserIdInput(e.target.value)}
              placeholder="ex: 82076795 ou user82076795"
              style={{ minWidth: 200 }}
              onKeyDown={(e) => e.key === "Enter" && handleAddCollaborator()}
            />
          </label>
          <Button onClick={handleAddCollaborator} disabled={loadingAdd}>
            {loadingAdd ? "A adicionar…" : "Adicionar"}
          </Button>
          <label className="flex items-center gap-sm">
            <span className="muted">Colaborador:</span>
            <select
              className="input"
              value={selectedCollabId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedCollabId(id);
                updateUrl({ collaboratorId: id || undefined, page: 1 });
              }}
              style={{ minWidth: 200 }}
              disabled={loadingCollaborators}
            >
              <option value="">— Selecionar —</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || c.vimeoUserId} ({c.showcaseCount} vitrines, {c.videoCount} vídeos)
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={!selectedCollabId || loadingSync}
          >
            {loadingSync ? "A sincronizar…" : "Atualizar (sync tudo)"}
          </Button>
        </div>
        {selectedCollab && (
          <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
            Última atualização:{" "}
            {selectedCollab.lastSyncAt
              ? new Date(selectedCollab.lastSyncAt).toLocaleString("pt-BR")
              : "—"}{" "}
            / {selectedCollab.showcaseCount} vitrines / {selectedCollab.videoCount} vídeos
          </p>
        )}
      </Card>

      {selectedCollabId && (
        <Card plain style={{ marginTop: 24 }}>
          <h2 style={{ margin: 0 }}>Vitrines (cache)</h2>
          <p className="muted" style={{ marginTop: 6, marginBottom: 12 }}>
            Busca e paginação a partir do banco. Clique em Editar para abrir no editor do Studio.
          </p>
          <div className="flex gap-md items-center flex-wrap" style={{ marginBottom: 16 }}>
            <input
              type="search"
              className="input"
              placeholder="Buscar vitrine…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
              style={{ minWidth: 220 }}
            />
            <Button variant="secondary" onClick={handleSearchSubmit}>
              Buscar
            </Button>
            <label className="flex items-center gap-sm muted">
              <span>Por página:</span>
              <select
                className="input"
                value={effectivePerPage}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setPerPage(v);
                  updateUrl({ perPage: v, page: 1 });
                }}
              >
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span className="muted">
              Página {effectivePage} de {totalPages} ({showcasesTotal} total)
            </span>
            <div className="flex gap-sm">
              <Button
                variant="secondary"
                disabled={effectivePage <= 1}
                onClick={() => {
                  const p = effectivePage - 1;
                  setPage(p);
                  updateUrl({ page: p });
                }}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                disabled={effectivePage >= totalPages}
                onClick={() => {
                  const p = effectivePage + 1;
                  setPage(p);
                  updateUrl({ page: p });
                }}
              >
                Próximo
              </Button>
            </div>
          </div>

          {loadingShowcases && showcases.length === 0 ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))"
              }}
              aria-busy="true"
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} style={{ height: 200, borderRadius: 8, background: "var(--color-bg-subtle, #f0f0f0)" }} />
              ))}
            </div>
          ) : showcases.length === 0 ? (
            <p className="muted py-md">
              Nenhuma vitrine em cache. Clique em &quot;Atualizar vitrines&quot; para sincronizar do Vimeo.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                marginBottom: 24
              }}
            >
              {showcases.map((s) => {
                const thumb = getBestThumb(s.pictures);
                const isLinking = loadingLink === s.vimeoShowcaseId;
                return (
                  <div
                    key={s.id}
                    className="card"
                    style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      if (isInteractiveTarget(event.target)) return;
                      handleEditarShowcase(s.vimeoShowcaseId);
                    }}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter") handleEditarShowcase(s.vimeoShowcaseId);
                    }}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" style={{ width: "100%", height: 140, objectFit: "cover" }} />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: 140,
                          background: "var(--color-bg-subtle, #eee)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <span className="muted">Sem miniatura</span>
                      </div>
                    )}
                    <div style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600 }}>{s.name ?? s.vimeoShowcaseId}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        ID: {s.vimeoShowcaseId}
                        {s.totalVideos != null && ` · ${s.totalVideos} vídeo(s)`}
                      </div>
                      {s.modifiedTime && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          {new Date(s.modifiedTime).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                      <div className="flex gap-sm mt-sm" style={{ flexWrap: "wrap" }}>
                        <Button
                          variant="secondary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openVideosModal(s.id, s.name ?? s.vimeoShowcaseId);
                          }}
                        >
                          Vídeos
                        </Button>
                        <Button
                          disabled={isLinking}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditarShowcase(s.vimeoShowcaseId);
                          }}
                        >
                          {isLinking ? "A abrir…" : "Editar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {videosModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="videos-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)"
          }}
          onClick={(e) => e.target === e.currentTarget && setVideosModal(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 16, borderBottom: "1px solid var(--color-border, #ddd)" }}>
              <h2 id="videos-modal-title" style={{ margin: 0, fontSize: 18 }}>
                Vídeos: {videosModal.showcaseName}
              </h2>
              <div className="flex gap-md items-center flex-wrap" style={{ marginTop: 12 }}>
                <input
                  type="search"
                  className="input"
                  placeholder="Buscar vídeo…"
                  value={videosQ}
                  onChange={(e) => setVideosQ(e.target.value)}
                  style={{ minWidth: 200 }}
                />
                <label className="flex items-center gap-sm muted">
                  <span>Por página:</span>
                  <select
                    className="input"
                    value={videosPerPage}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setVideosPerPage(VIDEOS_PER_PAGE_OPTIONS.includes(v) ? v : DEFAULT_VIDEOS_PER_PAGE);
                      setVideosPage(1);
                    }}
                  >
                    {VIDEOS_PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="muted">
                  Página {videosPage} de {videosTotalPages} ({videosTotal} total)
                </span>
                <div className="flex gap-sm">
                  <Button
                    variant="secondary"
                    disabled={videosPage <= 1}
                    onClick={() => setVideosPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={videosPage >= videosTotalPages}
                    onClick={() => setVideosPage((p) => p + 1)}
                  >
                    Próximo
                  </Button>
                </div>
                <Button variant="secondary" onClick={() => setVideosModal(null)}>
                  Fechar
                </Button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              {loadingVideos && videos.length === 0 ? (
                <div className="muted">A carregar vídeos…</div>
              ) : videos.length === 0 ? (
                <p className="muted">Nenhum vídeo nesta vitrine.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {videos.map((v) => {
                    const thumb = getVideoThumb(v.pictures);
                    return (
                      <li
                        key={v.id}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          padding: 8,
                          background: "var(--color-bg-subtle, #f5f5f5)",
                          borderRadius: 8
                        }}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 4 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 120,
                              height: 68,
                              background: "var(--color-bg, #eee)",
                              borderRadius: 4,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              color: "var(--color-muted, #666)"
                            }}
                          >
                            Sem thumb
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{v.name ?? v.vimeoVideoId}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {formatDuration(v.duration)}
                            {v.link && (
                              <>
                                {" · "}
                                <button
                                  type="button"
                                  className="button-link"
                                  onClick={() => copyVideoLink(v.link)}
                                  style={{ fontSize: 12 }}
                                >
                                  Copiar link
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <Card plain style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0 }}>Minhas vitrines</h2>
        <p className="muted" style={{ marginTop: 6, marginBottom: 12 }}>
          Vitrines do Studio. Clique num card para editar.
        </p>
        <VitrinesAdvancedSearch
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={vitrines.length}
          filteredCount={filteredVitrines.length}
          showVideoCountFilters={hasVideoCount}
        />

        {loadingVitrines && vitrines.length === 0 ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))"
            }}
            aria-busy="true"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ height: 140, borderRadius: 8, background: "var(--color-bg-subtle, #f0f0f0)" }} />
            ))}
          </div>
        ) : filteredVitrines.length === 0 ? (
          <div className="py-md">
            <p className="muted">
              {vitrines.length === 0 ? "Nenhuma vitrine no Studio." : "Nenhum resultado com os filtros aplicados."}
            </p>
            {vitrines.length > 0 && (
              <Button variant="secondary" onClick={() => setFilters(defaultFilters)}>
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))"
            }}
          >
            {filteredVitrines.map((vitrine) => (
              <div
                key={vitrine.id}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  if (isInteractiveTarget(event.target)) return;
                  navigate(`/vitrines/${vitrine.id}`);
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter") navigate(`/vitrines/${vitrine.id}`);
                }}
                style={{ cursor: "pointer" }}
              >
                <VitrineCard vitrine={vitrine} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
