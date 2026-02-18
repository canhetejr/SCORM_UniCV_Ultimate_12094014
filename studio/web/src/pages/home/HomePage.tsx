import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllVitrines } from "../../api";
import { VitrineCard } from "../../components/app";
import { Button, Card, ToastContainer } from "../../components/ui";
import { useToast } from "../../hooks/useToast";
import { useVitrinesStore } from "../../store/vitrinesStore";

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

export function HomePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const vitrines = useVitrinesStore((state) => state.vitrines);
  const setVitrines = useVitrinesStore((state) => state.setVitrines);
  const syncVitrines = useVitrinesStore((state) => state.syncVitrines);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadInitialVitrines = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const data = await fetchAllVitrines();
      setVitrines(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingInitial(false);
    }
  }, [setVitrines, toast]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const data = await fetchAllVitrines();
      syncVitrines(data);
      toast.success(`Sincronizacao concluida: ${data.length} vitrines atualizadas.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }, [syncVitrines, toast]);

  useEffect(() => {
    if (vitrines.length === 0) {
      loadInitialVitrines();
    }
  }, [vitrines.length, loadInitialVitrines]);

  return (
    <div className="page-home">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />

      <Card plain>
        <div className="flex flex-between items-center gap-md mb-md">
          <div>
            <h2 style={{ margin: 0 }}>Vitrines</h2>
            <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
              Listagem completa sem paginacao. Use Sincronizar para buscar novas e alteradas.
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>

        {loadingInitial && vitrines.length === 0 ? (
          <div className="muted py-md">A carregar vitrines...</div>
        ) : vitrines.length === 0 ? (
          <div className="muted py-md">Nenhuma vitrine encontrada.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))"
            }}
          >
            {vitrines.map((vitrine) => (
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
                  if (event.key === "Enter") {
                    navigate(`/vitrines/${vitrine.id}`);
                  }
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
