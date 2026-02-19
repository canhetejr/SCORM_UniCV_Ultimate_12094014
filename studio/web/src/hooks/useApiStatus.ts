import { useEffect, useState, useCallback } from "react";
import { getResolvedApiBase } from "../api";

export type ApiStatusState = {
  connected: boolean;
  url: string;
  lastPingAt: string | null;
  latencyMs: number | null;
};

type UseApiStatusResult = {
  status: ApiStatusState | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

export function useApiStatus(): UseApiStatusResult {
  const [status, setStatus] = useState<ApiStatusState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    const base = getResolvedApiBase();
    const url = `${base}/v1/config/status`;
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: "include" });
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      const latency = end - start;
      const ok = res.ok;
      setStatus({
        connected: ok,
        url: base,
        lastPingAt: new Date().toISOString(),
        latencyMs: latency
      });
    } catch (err) {
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      const latency = end - start;
      setStatus({
        connected: false,
        url: base,
        lastPingAt: new Date().toISOString(),
        latencyMs: latency
      });
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, error, refresh };
}

