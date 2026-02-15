import React from "react";
import type { VitrineDetail } from "../../api";
import { Button, Badge } from "../ui";

interface VitrineHeaderProps {
  vitrine: VitrineDetail;
  playerUrl: string;
  isPublished: boolean;
  publishing: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onPreview: () => void;
  onOpenPlayer: () => void;
  onCopyLink: () => void;
  onSync?: () => void;
  syncing?: boolean;
  onExportScorm: () => void;
  exporting: boolean;
}

export function VitrineHeader({
  vitrine,
  playerUrl,
  isPublished,
  publishing,
  onPublish,
  onUnpublish,
  onPreview,
  onOpenPlayer,
  onCopyLink,
  onSync,
  syncing,
  onExportScorm,
  exporting
}: VitrineHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 24
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{vitrine.title}</h1>
          <Badge
            variant={
              vitrine.status === "ACTIVE"
                ? "success"
                : vitrine.status === "EDITING"
                  ? "info"
                  : "neutral"
            }
          >
            {vitrine.status === "ACTIVE"
              ? "Publicada"
              : vitrine.status === "EDITING"
                ? "Em edição"
                : "Inativa"}
          </Badge>
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          slug: <code>{vitrine.slug || vitrine.id}</code>
        </div>
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <span className="muted">Link do player: </span>
          <code style={{ wordBreak: "break-all", fontSize: 13 }}>{playerUrl}</code>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {isPublished ? (
          <Button variant="danger" onClick={onUnpublish} disabled={publishing}>
            {publishing ? "A despublicar…" : "Despublicar"}
          </Button>
        ) : (
          <Button onClick={onPublish} disabled={publishing}>
            {publishing ? "A publicar…" : "Publicar"}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onPreview}>
          Ver preview
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenPlayer}>
          Abrir player
        </Button>
        <Button variant="secondary" size="sm" onClick={onCopyLink}>
          Copiar link
        </Button>
        {onSync && vitrine.vimeoShowcaseId && (
          <Button variant="secondary" size="sm" onClick={onSync} disabled={syncing}>
            {syncing ? "Sincronizando…" : "Sincronizar Vimeo"}
          </Button>
        )}
        <Button size="sm" onClick={onExportScorm} disabled={exporting}>
          {exporting ? "Exportando…" : "Exportar SCORM"}
        </Button>
      </div>
    </div>
  );
}
