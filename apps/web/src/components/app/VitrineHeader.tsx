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
    <div className="action-row vitrine-header-row">
      <div className="vitrine-header-main">
        <div className="vitrine-header-title-row">
          <h1 className="vitrine-header-title">{vitrine.title}</h1>
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
        <div className="muted vitrine-header-slug">slug: <code>{vitrine.slug || vitrine.id}</code></div>
        <div className="vitrine-header-player-link">
          <span className="muted">Link do player: </span>
          <code>{playerUrl}</code>
        </div>
      </div>
      <div className="action-row-buttons">
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
