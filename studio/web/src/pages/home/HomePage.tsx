import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchAllVitrines, fetchCollabVitrines } from "../../api";
import { VitrineCard, VitrinesAdvancedSearch, defaultFilters, parseFiltersFromSearchParams, filtersToSearchParams } from "../../components/app";
import type { VitrinesFilters } from "../../components/app";
import { Button, Card, ToastContainer } from "../../components/ui";
import { useToast } from "../../hooks/useToast";
import { useMe } from "../../hooks/useMe";
import { useVitrinesStore, useVitrinesByMode } from "../../store/vitrinesStore";
import type { Vitrine } from "../../types/vitrine";

function getErrorMessage(error: unknown): string {
  const e = error as { message?: string };
  return e?.message ?? "Erro ao carregar vitrines.";
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

  if (f.status) {
    out = out.filter((v) => v.status === f.status);
  }

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
  if (minV != null && !Number.isNaN(minV)) {
    out = out.filter((v) => (v.videoCount ?? 0) >= minV);
  }
  if (maxV != null && !Number.isNaN(maxV)) {
    out = out.filter((v) => (v.videoCount ?? 0) <= maxV);
  }

  out = [...out].sort((a, b) => {
    if (f.sort === "title_asc") {
      return (a.title || "").localeCompare(b.title || "");
    }
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return f.sort === "createdAt_asc" ? ta - tb : tb - ta;
  });

  return out;
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { isAdmin, viewMode, setViewMode, loading: meLoading } = useMe();

  const vitrines = useVitrinesByMode(viewMode);
  const setInitial = useVitrinesStore((s) => s.setInitial);
  const addOnlyNew = useVitrinesStore((s) => s.addOnlyNew);

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

  const [loadingInitial, setLoadingInitial] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [collabNotAvailable, setCollabNotAvailable] = useState(false);

  const fetchByMode = useCallback(
    () => (viewMode === "admin" ? fetchAllVitrines() : fetchCollabVitrines()),
    [viewMode]
  );

  const loadInitialVitrines = useCallback(async () => {
    setLoadingInitial(true);
    setCollabNotAvailable(false);
    try {
      const data = await fetchByMode();
      setInitial(viewMode, data);
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (viewMode === "collab" && e?.code === "collab_not_available") {
        setCollabNotAvailable(true);
        setInitial(viewMode, []);
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setLoadingInitial(false);
    }
  }, [viewMode, fetchByMode, setInitial, toast]);

  useEffect(() => {
    if (viewMode === "collab" && collabNotAvailable) return;
    if (vitrines.length === 0 && !meLoading) {
      loadInitialVitrines();
    }
  }, [vitrines.length, meLoading, viewMode, collabNotAvailable, loadInitialVitrines]);

  const handleBuscarNovas = useCallback(async () => {
    setSyncing(true);
    try {
      const all = await fetchByMode();
      const added = addOnlyNew(viewMode, all);
      if (added > 0) {
        toast.success(`${added} novas vitrines adicionadas`);
      } else {
        toast.info("Nenhuma nova vitrine encontrada");
      }
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (viewMode === "collab" && e?.code === "collab_not_available") {
        toast.info("Modo colaborador ainda não configurado.");
        addOnlyNew(viewMode, []);
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setSyncing(false);
    }
  }, [viewMode, fetchByMode, addOnlyNew, toast]);

  const hasVideoCount = vitrines.some((v) => typeof v.videoCount === "number");

  return (
    <div className="page-home">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />

      <Card plain>
        {viewMode === "collab" && collabNotAvailable && (
          <div
            role="alert"
            className="muted"
            style={{
              padding: "12px 16px",
              marginBottom: 16,
              background: "var(--color-bg-subtle, #f5f5f5)",
              borderRadius: 8,
              border: "1px solid var(--color-border, #eee)"
            }}
          >
            Modo colaborador ainda não configurado.
          </div>
        )}

        <div className="flex flex-between items-center gap-md mb-md flex-wrap">
          <div>
            <h2 style={{ margin: 0 }}>Vitrines</h2>
            <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
              Listagem completa. Use Buscar Novas para adicionar apenas vitrines inéditas.
            </p>
          </div>
          <div className="flex gap-md items-center">
            <span
              title={viewMode === "admin" ? "Listagem com todas as vitrines (requer permissão admin)." : "Listagem restrita ao colaborador (apenas visualização)."}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                background: viewMode === "admin" ? "var(--color-primary-bg, #e3f2fd)" : "var(--color-bg-subtle, #f5f5f5)",
                color: viewMode === "admin" ? "var(--color-primary, #1976d2)" : "var(--color-text-muted, #666)"
              }}
            >
              {viewMode === "admin" ? "Admin" : "Colaborador"}
            </span>
            <label className="flex items-center gap-sm">
              <span className="muted">Modo:</span>
              <select
                className="input"
                value={viewMode}
                onChange={(e) => {
                  const v = e.target.value as "admin" | "collab";
                  if (v === "admin" && !isAdmin) return;
                  setViewMode(v);
                }}
                style={{ minWidth: 140 }}
              >
                <option value="admin" disabled={!isAdmin}>
                  Admin
                </option>
                <option value="collab">Colaborador</option>
              </select>
            </label>
            <Button onClick={handleBuscarNovas} disabled={syncing}>
              {syncing ? "Buscando..." : "Buscar Novas"}
            </Button>
          </div>
        </div>

        <VitrinesAdvancedSearch
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={vitrines.length}
          filteredCount={filteredVitrines.length}
          showVideoCountFilters={hasVideoCount}
        />

        {loadingInitial && vitrines.length === 0 ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))"
            }}
            aria-busy="true"
            aria-label="A carregar vitrines"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  height: 140,
                  borderRadius: 8,
                  background: "var(--color-bg-subtle, #f0f0f0)"
                }}
              />
            ))}
          </div>
        ) : filteredVitrines.length === 0 ? (
          <div className="py-md">
            <p className="muted" style={{ marginBottom: vitrines.length > 0 ? 12 : 0 }}>
              {vitrines.length === 0 ? "Nenhuma vitrine encontrada." : "Nenhum resultado com os filtros aplicados."}
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
              gap: "12px",
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
