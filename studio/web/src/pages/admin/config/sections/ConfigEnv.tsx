import React, { useCallback, useEffect, useState } from "react";
import { getConfigEnv, putConfigEnv, type ConfigEnvItem } from "../../../../api";

export function ConfigEnv() {
  const [items, setItems] = useState<ConfigEnvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: list } = await getConfigEnv();
      setItems(list);
      const vals: Record<string, string> = {};
      const init: Record<string, string> = {};
      list.forEach((item) => {
        const v = item.masked ? "" : (item.value ?? "");
        vals[item.key] = v;
        init[item.key] = v;
      });
      setLocalValues(vals);
      setInitialValues(init);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setValue = (key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates: Record<string, string | null> = {};
      items.forEach((item) => {
        const current = localValues[item.key] ?? "";
        const initial = initialValues[item.key] ?? "";
        if (current !== initial) {
          updates[item.key] = current.trim() || null;
        }
      });
      if (Object.keys(updates).length === 0) {
        setSaving(false);
        return;
      }
      const { items: list } = await putConfigEnv(updates);
      setItems(list);
      const vals: Record<string, string> = {};
      const init: Record<string, string> = {};
      list.forEach((item) => {
        const v = item.masked ? "" : (item.value ?? "");
        vals[item.key] = v;
        init[item.key] = v;
      });
      setLocalValues(vals);
      setInitialValues(init);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div className="h" style={{ fontSize: 16, marginBottom: 8 }}>
          Dados do ambiente
        </div>
        <p className="muted">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="h" style={{ fontSize: 16, marginBottom: 8 }}>
        Dados do ambiente
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Variáveis usadas pela API (Vimeo, LTI, LRS, BASE_URL). Valores salvos aqui têm prioridade sobre o .env do servidor.
      </p>
      {error && (
        <p style={{ color: "#f87171", marginBottom: 12 }}>{error}</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item) => (
          <div key={item.key} className="field">
            <label>
              {item.label} <code style={{ fontSize: 11 }}>{item.key}</code>
            </label>
            <input
              type={item.masked ? "password" : "text"}
              value={localValues[item.key] ?? ""}
              onChange={(e) => setValue(item.key, e.target.value)}
              placeholder={item.masked && item.value === "***" ? "••••••" : ""}
              style={{
                background: "#111",
                color: "inherit",
                border: "1px solid rgba(148,163,184,.25)",
                borderRadius: 10,
                padding: "10px 12px",
                width: "100%",
                fontFamily: item.masked ? "inherit" : "monospace",
                fontSize: 13
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          className="btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="btn secondary" onClick={load} style={{ marginLeft: 8 }}>
          Recarregar
        </button>
      </div>
    </div>
  );
}
