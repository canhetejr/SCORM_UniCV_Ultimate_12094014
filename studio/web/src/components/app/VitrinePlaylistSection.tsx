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
      <div className="playlist-header">
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
        <div className="playlist-list">
          {vitrine.videos.map((vv, i) => (
            <div key={vv.id} className="playlist-item">
              {vv.video.thumbnailUrl ? (
                <img
                  src={vv.video.thumbnailUrl}
                  alt=""
                  className="playlist-item-thumb"
                />
              ) : (
                <div className="playlist-item-thumb-placeholder">▶</div>
              )}
              <div className="playlist-item-body">
                <div className="playlist-item-title">{vv.video.title}</div>
                <div className="playlist-item-meta">{formatDuration(vv.video.durationSec)}</div>
              </div>
              {!isReadOnly && onMoveVideo && onRemoveVideo && (
                <div className="playlist-item-actions">
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
