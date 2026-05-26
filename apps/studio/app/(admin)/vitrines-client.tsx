"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Vitrine, VitrineStatus } from "@prisma/client";

type VitrineWithCount = Vitrine & { _count: { videos: number } };

const STATUS_COLORS: Record<VitrineStatus, string> = {
  ACTIVE: "#22c55e",
  EDITING: "#f59e0b",
  INACTIVE: "#94a3b8",
};

const STATUS_LABELS: Record<VitrineStatus, string> = {
  ACTIVE: "Ativa",
  EDITING: "Editando",
  INACTIVE: "Inativa",
};

export default function VitrinesClient({ initialVitrines }: { initialVitrines: VitrineWithCount[] }) {
  const router = useRouter();
  const [vitrines, setVitrines] = useState(initialVitrines);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = vitrines.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch("/api/vitrines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const vitrine = await res.json() as VitrineWithCount;
      setVitrines([{ ...vitrine, _count: { videos: 0 } }, ...vitrines]);
      setNewTitle("");
      setShowModal(false);
      router.push(`/vitrines/${vitrine.id}`);
    }
    setCreating(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Vitrines</h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "var(--accent)", color: "#fff", border: "none",
            borderRadius: 8, padding: "9px 18px", fontWeight: 600,
          }}
        >
          + Nova Vitrine
        </button>
      </div>

      <input
        type="search"
        placeholder="Buscar vitrines…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 20, maxWidth: 380 }}
      />

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          {search ? "Nenhuma vitrine encontrada." : "Nenhuma vitrine ainda. Crie a primeira!"}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((v) => (
            <VitrineCard key={v.id} vitrine={v} onClick={() => router.push(`/vitrines/${v.id}`)} />
          ))}
        </div>
      )}

      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "#00000080",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 28, width: "100%", maxWidth: 400,
          }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>Nova Vitrine</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input
                type="text"
                placeholder="Título da vitrine"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                required
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "transparent", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "8px 16px", color: "var(--text-muted)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    background: "var(--accent)", color: "#fff", border: "none",
                    borderRadius: 6, padding: "8px 16px", fontWeight: 600,
                    opacity: creating ? 0.7 : 1,
                  }}
                >
                  {creating ? "Criando…" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VitrineCard({ vitrine, onClick }: { vitrine: VitrineWithCount; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "18px 20px", cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{vitrine.title}</span>
        <span style={{
          fontSize: 11, padding: "3px 8px", borderRadius: 20,
          background: `${STATUS_COLORS[vitrine.status]}20`,
          color: STATUS_COLORS[vitrine.status], marginLeft: 8, whiteSpace: "nowrap",
        }}>
          {STATUS_LABELS[vitrine.status]}
        </span>
      </div>
      {vitrine.description && (
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 12px", lineHeight: 1.4 }}>
          {vitrine.description.slice(0, 80)}{vitrine.description.length > 80 ? "…" : ""}
        </p>
      )}
      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
        {vitrine._count.videos} {vitrine._count.videos === 1 ? "vídeo" : "vídeos"}
        {vitrine.slug && <span style={{ marginLeft: 12 }}>/{vitrine.slug}</span>}
      </div>
    </div>
  );
}
