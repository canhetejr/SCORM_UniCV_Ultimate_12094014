"use client";

import { useState } from "react";
import type { VimeoCollaborator } from "@prisma/client";

export default function FerramentasClient({
  vimeoConnected,
  initialCollabs,
}: {
  vimeoConnected: boolean;
  initialCollabs: VimeoCollaborator[];
}) {
  const [collabs, setCollabs] = useState(initialCollabs);
  const [newUserId, setNewUserId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  async function handleAddCollab(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserId.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/vimeo-collaborators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vimeoUserId: newUserId.trim(), label: newLabel.trim() || undefined }),
    });
    if (res.ok) {
      const c = await res.json() as VimeoCollaborator;
      setCollabs([c, ...collabs]);
      setNewUserId("");
      setNewLabel("");
    }
    setAdding(false);
  }

  async function handleSync(id: string) {
    setSyncing(id);
    const res = await fetch(`/api/admin/vimeo-collaborators/${id}/sync`);
    if (res.ok) {
      const updated = await res.json() as VimeoCollaborator;
      setCollabs(collabs.map((c) => (c.id === id ? updated : c)));
    }
    setSyncing(null);
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Ferramentas</h1>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Colaboradores Vimeo</h2>

        {!vimeoConnected && (
          <div style={{
            background: "#f59e0b1a", border: "1px solid #f59e0b40",
            borderRadius: 8, padding: "12px 16px", color: "#f59e0b", marginBottom: 16,
          }}>
            Conecte sua conta Vimeo primeiro em <a href="/admin/config" style={{ color: "#f59e0b", textDecoration: "underline" }}>Configurações</a>.
          </div>
        )}

        <form onSubmit={handleAddCollab} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Vimeo User ID"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            style={{ maxWidth: 200 }}
          />
          <input
            type="text"
            placeholder="Rótulo (opcional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={{ maxWidth: 200 }}
          />
          <button
            type="submit"
            disabled={adding || !newUserId.trim()}
            style={{
              background: "var(--accent)", color: "#fff", border: "none",
              borderRadius: 6, padding: "8px 16px", fontWeight: 600,
              opacity: adding ? 0.7 : 1,
            }}
          >
            {adding ? "…" : "Adicionar"}
          </button>
        </form>

        {collabs.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Nenhum colaborador ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {collabs.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "12px 16px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{c.label || c.vimeoUserId}</span>
                  {c.label && <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>({c.vimeoUserId})</span>}
                  {c.lastSyncAt && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      Sync: {new Date(c.lastSyncAt).toLocaleString("pt-BR")}
                      {c.lastSyncMsg && ` — ${c.lastSyncMsg}`}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleSync(c.id)}
                  disabled={syncing === c.id}
                  style={{
                    background: "transparent", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "6px 12px", color: "var(--text-muted)", cursor: "pointer",
                    opacity: syncing === c.id ? 0.6 : 1,
                  }}
                >
                  {syncing === c.id ? "Sync…" : "↻ Sync"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
