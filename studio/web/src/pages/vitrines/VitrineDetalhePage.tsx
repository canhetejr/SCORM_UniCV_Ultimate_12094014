/**
 * Página de detalhe da vitrine: /vitrines/:id
 * Abas: Geral, Playlist, Exportações, Integrações
 */

import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  API_BASE,
  PUBLIC_BASE_URL,
  apiPost,
  getAuthToken,
  getVitrineDetail,
  putVitrine,
  getExportsList,
  syncVitrineFromVimeo,
  getVimeoStatus,
  getVimeoOAuthStartUrl,
  postPlaylistVideo,
  deletePlaylistVideo,
  movePlaylistVideo,
  type VitrineDetail,
  type ExportJobItem
} from "../../api";
import { Button, Card, Input, Field, Modal, ToastContainer } from "../../components/ui";
import { VitrineHeader, VitrinePlaylistSection, VitrineExportsSection, VitrinePreviewModal } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { formatDate, STATUS_OPTIONS, buildPlayerUrl, downloadFile, getExportFilename } from "../../lib";

type TabId = "geral" | "playlist" | "exportacoes" | "integracoes";

export function VitrineDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [vitrine, setVitrine] = useState<VitrineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("geral");

  // Geral
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);

  // Playlist
  const [syncing, setSyncing] = useState(false);

  // Exportações
  const [jobs, setJobs] = useState<ExportJobItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Integrações
  const [vimeoStatus, setVimeoStatus] = useState<{ connected: boolean }>({ connected: false });

  // Publicação e preview
  const toast = useToast();
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Playlist manual (MANUAL vitrines)
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [addVideoTitle, setAddVideoTitle] = useState("");
  const [addVideoUrl, setAddVideoUrl] = useState("");
  const [addVideoThumb, setAddVideoThumb] = useState("");
  const [addVideoDuration, setAddVideoDuration] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const [playlistBusy, setPlaylistBusy] = useState(false);

  const loadVitrine = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const v = await getVitrineDetail(id);
      setVitrine(v);
      setEditTitle(v.title);
      setEditSlug(v.slug ?? "");
      setEditStatus(v.status ?? "ACTIVE");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar vitrine.");
      setVitrine(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVitrine();
  }, [loadVitrine]);

  useEffect(() => {
    getVimeoStatus()
      .then(setVimeoStatus)
      .catch(() => setVimeoStatus({ connected: false }));
  }, []);

  const loadExports = useCallback(async () => {
    if (!id) return;
    setLoadingJobs(true);
    try {
      const res = await getExportsList({ vitrineId: id });
      setJobs(res.jobs ?? []);
    } catch {
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, [id]);

  useEffect(() => {
    if (tab === "exportacoes" && id) loadExports();
  }, [tab, id, loadExports]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await putVitrine(id, {
        title: editTitle.trim() || undefined,
        slug: editSlug.trim() || null,
        status: editStatus
      });
      setVitrine(res.vitrine as VitrineDetail);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncVimeo = async () => {
    if (!vitrine?.vimeoShowcaseId) {
      alert("Esta vitrine não foi importada do Vimeo. Sincronização indisponível.");
      return;
    }
    setSyncing(true);
    try {
      await syncVitrineFromVimeo(vitrine.vimeoShowcaseId);
      await loadVitrine();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao sincronizar.");
    } finally {
      setSyncing(false);
    }
  };

  const handleExportScorm = async () => {
    if (!id || !vitrine) return;
    setExporting(true);
    try {
      const res = await apiPost<{ downloadUrl: string }>("/v1/exports/scorm12", {
        vitrineId: id,
        title: vitrine.title || "UniCV",
        selfContained: true
      });
      await loadExports();
      const url = `${API_BASE}${res.downloadUrl}`;
      const token = getAuthToken();
      if (token) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `export-scorm-${vitrine.title?.replace(/\s/g, "-") ?? "unicv"}.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        window.open(url, "_blank");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao exportar.");
    } finally {
      setExporting(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    setPublishing(true);
    try {
      const res = await putVitrine(id, { status: "ACTIVE" });
      setVitrine(res.vitrine as VitrineDetail);
      setEditStatus("ACTIVE");
      toast.success("Vitrine publicada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao publicar.");
    } finally {
      setPublishing(false);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const title = addVideoTitle.trim();
    const url = addVideoUrl.trim();
    if (!title || !url) {
      toast.error("Título e URL são obrigatórios.");
      return;
    }
    setAddingVideo(true);
    try {
      const durationVal = addVideoDuration.trim();
      const durationSec = durationVal ? parseInt(durationVal, 10) : undefined;
      await postPlaylistVideo(id, {
        title,
        url,
        thumbUrl: addVideoThumb.trim() || undefined,
        durationSec: durationSec != null && !isNaN(durationSec) ? durationSec : undefined
      });
      setShowAddVideo(false);
      setAddVideoTitle("");
      setAddVideoUrl("");
      setAddVideoThumb("");
      setAddVideoDuration("");
      toast.success("Vídeo adicionado.");
      await loadVitrine();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar vídeo.");
    } finally {
      setAddingVideo(false);
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (!id || !confirm("Remover este vídeo da playlist?")) return;
    setPlaylistBusy(true);
    try {
      await deletePlaylistVideo(id, videoId);
      toast.success("Vídeo removido.");
      await loadVitrine();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover.");
    } finally {
      setPlaylistBusy(false);
    }
  };

  const handleMoveVideo = async (videoId: string, direction: "up" | "down") => {
    if (!id) return;
    setPlaylistBusy(true);
    try {
      await movePlaylistVideo(id, videoId, direction);
      toast.success("Ordem atualizada.");
      await loadVitrine();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao mover.");
    } finally {
      setPlaylistBusy(false);
    }
  };

  const handleUnpublish = async () => {
    if (!id) return;
    setPublishing(true);
    try {
      const res = await putVitrine(id, { status: "EDITING" });
      setVitrine(res.vitrine as VitrineDetail);
      setEditStatus("EDITING");
      toast.success("Vitrine despublicada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao despublicar.");
    } finally {
      setPublishing(false);
    }
  };

  const handleDownload = async (job: ExportJobItem) => {
    if (!job.downloadUrl) return;
    const url = `${API_BASE}${job.downloadUrl}`;
    const token = getAuthToken();
    const filename = getExportFilename(job.type, job.title);
    try {
      await downloadFile(url, filename, token);
    } catch (err) {
      toast.error("Erro ao baixar arquivo.");
    }
  };

  const playerUrl = buildPlayerUrl(id, vitrine?.slug, PUBLIC_BASE_URL);

  if (loading && !vitrine) {
    return (
      <div style={{ padding: 24 }} className="muted">
        A carregar…
      </div>
    );
  }

  if (error || !vitrine) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "var(--color-error, #ef4444)" }}>{error ?? "Vitrine não encontrada."}</p>
        <Link to="/">Voltar ao início</Link>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "geral", label: "Geral" },
    { id: "playlist", label: "Playlist" },
    { id: "exportacoes", label: "Exportações" },
    { id: "integracoes", label: "Integrações" }
  ];

  const isPublished = vitrine.status === "ACTIVE";

  return (
    <div style={{ maxWidth: 900, padding: "0 16px" }}>
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />

      <div style={{ marginBottom: 16 }}>
        <Link to="/" className="muted" style={{ fontSize: 14, textDecoration: "none" }}>
          ← Voltar ao início
        </Link>
      </div>

      <VitrineHeader
        vitrine={vitrine}
        playerUrl={playerUrl}
        isPublished={isPublished}
        publishing={publishing}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onPreview={() => setShowPreview(true)}
        onOpenPlayer={() => window.open(playerUrl, "_blank")}
        onCopyLink={() => {
          navigator.clipboard.writeText(playerUrl).then(
            () => toast.success("Link copiado."),
            () => toast.error("Não foi possível copiar.")
          );
        }}
        onSync={vitrine.vimeoShowcaseId ? handleSyncVimeo : undefined}
        syncing={syncing}
        onExportScorm={handleExportScorm}
        exporting={exporting}
      />

      <div className="tabs-row">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`tab-btn ${tab === t.id ? "active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "geral" && (
        <Card plain className="card-padding">
          <Field label="Título">
            <Input value={editTitle} onChange={setEditTitle} placeholder="Título da vitrine" />
          </Field>
          <Field label="Slug">
            <Input value={editSlug} onChange={setEditSlug} placeholder="slug-da-vitrine (opcional)" />
          </Field>
          <Field label="Status">
            <select
              className="input"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              style={{ maxWidth: 240 }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Button onClick={handleSave} disabled={saving} style={{ marginTop: 16 }}>
            {saving ? "A guardar…" : "Salvar"}
          </Button>
        </Card>
      )}

      {tab === "playlist" && (
        <VitrinePlaylistSection
          vitrine={vitrine}
          onSync={vitrine.vimeoShowcaseId ? handleSyncVimeo : undefined}
          syncing={syncing}
          onAddVideo={vitrine.vimeoShowcaseId ? undefined : () => setShowAddVideo(true)}
          onMoveVideo={vitrine.vimeoShowcaseId ? undefined : handleMoveVideo}
          onRemoveVideo={vitrine.vimeoShowcaseId ? undefined : handleRemoveVideo}
          playlistBusy={playlistBusy}
        />
      )}

      <Modal
        open={showAddVideo}
        onClose={() => !addingVideo && setShowAddVideo(false)}
        title="Adicionar vídeo"
      >
        <form onSubmit={handleAddVideo}>
          <Field label="Título *">
            <Input
              value={addVideoTitle}
              onChange={setAddVideoTitle}
              placeholder="Ex.: Aula 01 - Introdução"
            />
          </Field>
          <Field label="URL (Vimeo) *">
            <Input
              value={addVideoUrl}
              onChange={setAddVideoUrl}
              placeholder="https://vimeo.com/123456789"
            />
          </Field>
          <Field label="URL da miniatura (opcional)">
            <Input
              value={addVideoThumb}
              onChange={setAddVideoThumb}
              placeholder="https://..."
            />
          </Field>
          <Field label="Duração em segundos (opcional)">
            <Input
              value={addVideoDuration}
              onChange={setAddVideoDuration}
              placeholder="120"
            />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddVideo(false)}
              disabled={addingVideo}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={addingVideo || !addVideoTitle.trim() || !addVideoUrl.trim()}>
              {addingVideo ? "A adicionar…" : "Adicionar"}
            </Button>
          </div>
        </form>
      </Modal>

      {tab === "exportacoes" && (
        <VitrineExportsSection
          jobs={jobs}
          loading={loadingJobs}
          onExport={handleExportScorm}
          exporting={exporting}
          onDownload={handleDownload}
        />
      )}

      {tab === "integracoes" && (
        <Card plain className="card-padding">
          <div style={{ marginBottom: 16 }}>
            <strong>Vimeo</strong>
          </div>
          <p className="muted" style={{ marginBottom: 16 }}>
            Estado: {vimeoStatus.connected ? (
              <span style={{ color: "var(--color-success, #22c55e)" }}>Conectado</span>
            ) : (
              <span style={{ color: "var(--color-error, #ef4444)" }}>Desconectado</span>
            )}
          </p>
          {!vimeoStatus.connected && (
            <Button
              onClick={() =>
                getVimeoOAuthStartUrl()
                  .then((r) => (window.location.href = r.url))
                  .catch((e) => alert(e?.message ?? "Erro ao iniciar OAuth."))
              }
            >
              Conectar Vimeo
            </Button>
          )}
        </Card>
      )}

      <VitrinePreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        playerUrl={playerUrl}
      />
    </div>
  );
}
