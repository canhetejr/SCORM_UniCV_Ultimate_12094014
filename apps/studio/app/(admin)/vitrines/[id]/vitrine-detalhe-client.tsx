"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Vitrine, VitrineVideo, Video, VitrineStatus } from "@prisma/client";

type VitrineWithVideos = Vitrine & {
  videos: (VitrineVideo & { video: Video })[];
};

const STATUS_OPTIONS: { value: VitrineStatus; label: string }[] = [
  { value: "ACTIVE", label: "Ativa" },
  { value: "EDITING", label: "Editando" },
  { value: "INACTIVE", label: "Inativa" },
];

export default function VitrineDetalheClient({ vitrine: initial }: { vitrine: VitrineWithVideos }) {
  const router = useRouter();
  const [vitrine, setVitrine] = useState(initial);
  const [tab, setTab] = useState<"geral" | "playlist" | "exportacoes">("geral");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Geral form
  const [title, setTitle] = useState(vitrine.title);
  const [description, setDescription] = useState(vitrine.description ?? "");
  const [slug, setSlug] = useState(vitrine.slug ?? "");
  const [status, setStatus] = useState<VitrineStatus>(vitrine.status);

  // Add video
  const [addVideoUrl, setAddVideoUrl] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const [addVideoError, setAddVideoError] = useState("");

  // Export
  const [exporting, setExporting] = useState<"SCORM12" | "HTML" | null>(null);
  const [iframeSnippet, setIframeSnippet] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/vitrines/${vitrine.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, slug: slug || null, status }),
    });
    if (res.ok) {
      const updated = await res.json() as Vitrine;
      setVitrine({ ...vitrine, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    setAddVideoError("");
    setAddingVideo(true);
    const res = await fetch(`/api/vitrines/${vitrine.id}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: addVideoUrl }),
    });
    if (res.ok) {
      setAddVideoUrl("");
      router.refresh();
    } else {
      const err = await res.json() as { message?: string };
      setAddVideoError(err.message ?? "Erro ao adicionar vídeo");
    }
    setAddingVideo(false);
  }

  async function handleRemoveVideo(videoId: string) {
    await fetch(`/api/vitrines/${vitrine.id}/videos/${videoId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleMove(videoId: string, direction: "up" | "down") {
    await fetch(`/api/vitrines/${vitrine.id}/videos/${videoId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    router.refresh();
  }

  async function handleExport(type: "SCORM12" | "HTML" | "IFRAME") {
    if (type === "IFRAME") {
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, vitrine_id: vitrine.id }),
      });
      const data = await res.json() as { snippet?: string };
      if (data.snippet) setIframeSnippet(data.snippet);
      return;
    }
    setExporting(type);
    await fetch("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, vitrine_id: vitrine.id }),
    });
    setExporting(null);
    router.push("/exportacoes");
  }

  const TABS = [
    { key: "geral", label: "Geral" },
    { key: "playlist", label: `Playlist (${vitrine.videos.length})` },
    { key: "exportacoes", label: "Exportações" },
  ] as const;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}
        >←</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{vitrine.title}</h1>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: "none", border: "none", padding: "10px 16px", cursor: "pointer",
              color: tab === key ? "var(--accent)" : "var(--text-muted)",
              borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent",
              fontWeight: tab === key ? 600 : 400, fontSize: 14,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "geral" && (
        <form onSubmit={handleSave} style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, color: "var(--text-muted)", fontSize: 12 }}>TÍTULO</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, color: "var(--text-muted)", fontSize: 12 }}>DESCRIÇÃO</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", padding: "8px 12px", width: "100%", resize: "vertical" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, color: "var(--text-muted)", fontSize: 12 }}>SLUG (URL)</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="minha-vitrine" />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, color: "var(--text-muted)", fontSize: 12 }}>STATUS</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as VitrineStatus)}>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: "var(--accent)", color: "#fff", border: "none",
                borderRadius: 6, padding: "9px 20px", fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar"}
            </button>
          </div>
        </form>
      )}

      {tab === "playlist" && (
        <div style={{ maxWidth: 640 }}>
          <form onSubmit={handleAddVideo} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="URL ou ID do vídeo Vimeo"
              value={addVideoUrl}
              onChange={(e) => setAddVideoUrl(e.target.value)}
            />
            <button
              type="submit"
              disabled={addingVideo || !addVideoUrl.trim()}
              style={{
                background: "var(--accent)", color: "#fff", border: "none",
                borderRadius: 6, padding: "8px 16px", fontWeight: 600, whiteSpace: "nowrap",
                opacity: addingVideo ? 0.7 : 1,
              }}
            >
              {addingVideo ? "…" : "+ Vídeo"}
            </button>
          </form>
          {addVideoError && (
            <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{addVideoError}</p>
          )}

          {vitrine.videos.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Nenhum vídeo ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vitrine.videos.map((vv, idx) => (
                <div
                  key={vv.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "10px 14px",
                  }}
                >
                  {vv.video.thumbnailUrl && (
                    <img src={vv.video.thumbnailUrl} alt="" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 4 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{vv.video.title}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {vv.video.vimeoVideoId}
                      {vv.video.durationSec && ` · ${Math.floor(vv.video.durationSec / 60)}m${vv.video.durationSec % 60}s`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleMove(vv.videoId, "up")}
                      disabled={idx === 0}
                      style={{ background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 8px", color: "var(--text-muted)", cursor: "pointer", opacity: idx === 0 ? 0.3 : 1 }}
                    >↑</button>
                    <button
                      onClick={() => handleMove(vv.videoId, "down")}
                      disabled={idx === vitrine.videos.length - 1}
                      style={{ background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 8px", color: "var(--text-muted)", cursor: "pointer", opacity: idx === vitrine.videos.length - 1 ? 0.3 : 1 }}
                    >↓</button>
                    <button
                      onClick={() => handleRemoveVideo(vv.videoId)}
                      style={{ background: "none", border: "1px solid #ef444430", borderRadius: 4, padding: "4px 8px", color: "var(--danger)", cursor: "pointer" }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "exportacoes" && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { type: "SCORM12" as const, label: "SCORM 1.2", desc: "Pacote .zip compatível com LMS (Moodle, Blackboard…)" },
              { type: "HTML" as const, label: "HTML", desc: "Pacote .zip HTML standalone" },
              { type: "IFRAME" as const, label: "Iframe / Embed", desc: "Snippet HTML para incorporar em qualquer site" },
            ].map(({ type, label, desc }) => (
              <div
                key={type}
                style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "14px 18px", display: "flex",
                  alignItems: "center", justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{label}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{desc}</div>
                </div>
                <button
                  onClick={() => handleExport(type)}
                  disabled={exporting !== null}
                  style={{
                    background: "var(--accent)", color: "#fff", border: "none",
                    borderRadius: 6, padding: "7px 14px", fontWeight: 600, fontSize: 13,
                    opacity: exporting ? 0.7 : 1,
                  }}
                >
                  {exporting === type ? "Gerando…" : "Exportar"}
                </button>
              </div>
            ))}
          </div>

          {iframeSnippet && (
            <div style={{ marginTop: 20 }}>
              <label style={{ display: "block", marginBottom: 6, color: "var(--text-muted)", fontSize: 12 }}>SNIPPET IFRAME</label>
              <textarea
                readOnly
                value={iframeSnippet}
                rows={3}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                style={{
                  background: "var(--bg-input)", border: "1px solid var(--border)",
                  borderRadius: 6, color: "var(--text)", padding: "10px 12px",
                  width: "100%", fontSize: 12, fontFamily: "monospace", resize: "none",
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
