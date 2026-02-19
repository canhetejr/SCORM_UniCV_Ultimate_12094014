import { useCallback, useEffect, useState } from "react";
import { getMe, type MeResponse } from "../api";
import { useVitrinesStore, type ViewMode } from "../store/vitrinesStore";

export function useMe(): {
  me: MeResponse | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
} {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mode = useVitrinesStore((s) => s.mode);
  const setMode = useVitrinesStore((s) => s.setMode);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMe()
      .then((data) => {
        if (!cancelled) {
          setMe(data);
          if (data.role !== "admin") {
            setMode("collab");
          }
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Erro ao obter utilizador.";
          setError(msg);
          setMe(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setMode]);

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      if (mode === "admin" && me?.role !== "admin") return;
      setMode(mode);
    },
    [me?.role, setMode]
  );

  const isAdmin = me?.role === "admin";

  return {
    me,
    loading,
    error,
    isAdmin,
    viewMode: mode,
    setViewMode
  };
}
