import React from "react";
import type { VitrineDetail } from "../../api";
import { Button, Card } from "../ui";
import { formatDuration } from "../../lib";

interface VitrinePlaylistSectionProps {
  vitrine: VitrineDetail;
  onSync?: () => void;
  syncing?: boolean;
  onAddVideo?: () => void;
  onMoveVideo?: (videoId: string, direction: "up" | "down") => void;
  onRemoveVideo?: (videoId: string) => void;
  playlistBusy?: boolean;
}

export function VitrinePlaylistSection({
  vitrine,
  onSync,
  syncing,
  onAddVideo,
  onMoveVideo,
  onRemoveVideo,
  playlistBusy
}: VitrinePlaylistSectionProps) {
  const isReadOnly = !!vitrine.vimeoShowcaseId;

  return (
    <Card plain className="card-padding">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <span className="muted">
          {isReadOnly ? "Vídeos na playlist (somente leitura)" : "Vídeos na playlist"}
        </span>
        {isReadOnly ? (
          onSync && (
            <Button variant="secondary" size="sm" onClick={onSync} disabled={syncing}>
              {syncing ? "A atualizar…" : "Atualizar do Vimeo"}
            </Button>
          )
        ) : (
          onAddVideo && (
            <Button size="sm" onClick={onAddVideo}>
              Adicionar vídeo
            </Button>
          )
        )}
      </div>
      {vitrine.videos && vitrine.videos.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {vitrine.videos.map((vv, i) => (
            <div
              key={vv.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: 12,
                background: "var(--color-bg-elevated, #f9fafb)",
                borderRadius: 8
              }}
            >
              {vv.video.thumbnailUrl ? (
                <img
                  src={vv.video.thumbnailUrl}
                  alt=""
                  style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 4 }}
                />
              ) : (
                <div
                  style={{
                    width: 120,
                    height: 68,
                    background: "var(--border)",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    color: "var(--text-muted)"
                  }}
                >
                  ▶
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{vv.video.title}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {formatDuration(vv.video.durationSec)}
                </div>
              </div>
              {!isReadOnly && onMoveVideo && onRemoveVideo && (
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onMoveVideo(vv.video.id, "up")}
                    disabled={playlistBusy || i === 0}
                    title="Mover para cima"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onMoveVideo(vv.video.id, "down")}
                    disabled={playlistBusy || i === (vitrine.videos?.length ?? 1) - 1}
                    title="Mover para baixo"
                  >
                    ↓
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRemoveVideo(vv.video.id)}
                    disabled={playlistBusy}
                    title="Remover"
                  >
                    Remover
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhum vídeo na playlist.</p>
      )}
    </Card>
  );
}
