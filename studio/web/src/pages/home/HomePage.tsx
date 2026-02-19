import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchAllVitrines } from "../../api";
import { getVimeoUserShowcases, type VimeoUserShowcaseItem } from "../../api/adminVimeo";
import { VitrineCard, VitrinesAdvancedSearch, defaultFilters, parseFiltersFromSearchParams, filtersToSearchParams } from "../../components/app";
import type { VitrinesFilters } from "../../components/app";
import { Button, Card, ToastContainer } from "../../components/ui";
import { useToast } from "../../hooks/useToast";
import { useVitrinesStore } from "../../store/vitrinesStore";
import type { Vitrine } from "../../types/vitrine";

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

function getBestThumb(pictures: VimeoUserShowcaseItem["pictures"]): string | null {
  if (!pictures?.sizes?.length) return null;
  const withLink = pictures.sizes.filter((s) => s?.link);
  if (!withLink.length) return null;
  const sorted = [...withLink].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.link ?? null;
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const vitrines = useVitrinesStore((s) => s.admin.vitrines);
  const setInitial = useVitrinesStore((s) => s.setInitial);

  const [vimeoUserId, setVimeoUserId] = useState("");
  const [vimeoShowcases, setVimeoShowcases] = useState<VimeoUserShowcaseItem[]>([]);
  const [loadingVimeo, setLoadingVimeo] = useState(false);
  const [loadingVitrines, setLoadingVitrines] = useState(false);

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

  useEffect(() => {
    if (vitrines.length > 0) return;
    setLoadingVitrines(true);
    fetchAllVitrines()
      .then((data) => {
        setInitial("admin", data);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingVitrines(false));
  }, [vitrines.length, setInitial, toast]);

  const handleBuscarVitrines = useCallback(async () => {
    const uid = vimeoUserId.trim();
    if (!uid) {
      toast.warning("Informe o ID do usuário Vimeo.");
      return;
    }
    setLoadingVimeo(true);
    setVimeoShowcases([]);
    try {
      const res = await getVimeoUserShowcases(uid);
      setVimeoShowcases(res.showcases ?? []);
      toast.success(`${(res.showcases ?? []).length} vitrine(s) encontrada(s).`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingVimeo(false);
    }
  }, [vimeoUserId, toast]);

  const hasVideoCount = vitrines.some((v) => typeof v.videoCount === "number");

  return (
    <div className="page-home">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />

      <Card plain>
        <h2 style={{ margin: 0 }}>Vitrines do usuário Vimeo</h2>
        <p className="muted" style={{ marginTop: 6, marginBottom: 12 }}>
          Digite o ID do usuário Vimeo e clique em Buscar para listar as vitrines (showcases).
        </p>
        <div className="flex gap-md items-center flex-wrap" style={{ marginBottom: 16 }}>
          <label className="flex items-center gap-sm">
            <span className="muted">Vimeo User ID:</span>
            <input
              type="text"
              className="input"
              value={vimeoUserId}
              onChange={(e) => setVimeoUserId(e.target.value)}
              placeholder="ex: 123456 ou /users/123456"
              style={{ minWidth: 200 }}
              onKeyDown={(e) => e.key === "Enter" && handleBuscarVitrines()}
            />
          </label>
          <Button onClick={handleBuscarVitrines} disabled={loadingVimeo}>
            {loadingVimeo ? "A carregar…" : "Buscar vitrines"}
          </Button>
        </div>

        {vimeoShowcases.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              marginBottom: 32
            }}
          >
            {vimeoShowcases.map((s) => {
              const thumb = getBestThumb(s.pictures);
              return (
                <div key={s.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {thumb ? (
                    <img src={thumb} alt="" style={{ width: "100%", height: 140, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: 140, background: "var(--color-bg-subtle, #eee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="muted">Sem miniatura</span>
                    </div>
                  )}
                  <div style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{s.name ?? s.id}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      ID: {s.id}
                      {s.totalVideos != null && ` · ${s.totalVideos} vídeo(s)`}
                    </div>
                    {s.modifiedTime && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                        {new Date(s.modifiedTime).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
