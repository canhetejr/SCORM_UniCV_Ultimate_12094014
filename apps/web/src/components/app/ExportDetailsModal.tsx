import React from "react";
import type { ExportJobItem, ExportJobStatus } from "../../api";
import { Modal, Button, Badge } from "../ui";
import { formatDate, STATUS_LABELS, STATUS_BADGE_VARIANT, TYPE_LABELS } from "../../lib";

interface ExportDetailsModalProps {
  job: ExportJobItem | null;
  onClose: () => void;
  onDownload: (job: ExportJobItem) => void;
  onCopyLink: (job: ExportJobItem) => void;
}

export function ExportDetailsModal({ job, onClose, onDownload, onCopyLink }: ExportDetailsModalProps) {
  if (!job) return null;

  return (
    <Modal
      open={!!job}
      onClose={onClose}
      title="Detalhes da exportação"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <dl style={{ margin: 0, display: "grid", gap: 12 }}>
        <div>
          <dt className="muted" style={{ marginBottom: 4 }}>Vitrine</dt>
          <dd style={{ margin: 0 }}>{job.title}</dd>
        </div>
        <div>
          <dt className="muted" style={{ marginBottom: 4 }}>Tipo</dt>
          <dd style={{ margin: 0 }}>{TYPE_LABELS[job.type] ?? job.type}</dd>
        </div>
        <div>
          <dt className="muted" style={{ marginBottom: 4 }}>Status</dt>
          <dd style={{ margin: 0 }}>
            <Badge variant={STATUS_BADGE_VARIANT[job.status as ExportJobStatus]}>
              {STATUS_LABELS[job.status] ?? job.status}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="muted" style={{ marginBottom: 4 }}>Criado em</dt>
          <dd style={{ margin: 0 }}>{formatDate(job.createdAt)}</dd>
        </div>
        <div>
          <dt className="muted" style={{ marginBottom: 4 }}>Atualizado em</dt>
          <dd style={{ margin: 0 }}>{formatDate(job.updatedAt)}</dd>
        </div>
        {job.errorMessage && (
          <div>
            <dt className="muted" style={{ marginBottom: 4 }}>Erro</dt>
            <dd style={{ margin: 0, color: "var(--color-error, #ef4444)", fontSize: 13 }}>
              {job.errorMessage}
            </dd>
          </div>
        )}
        {job.status === "SUCCEEDED" && job.downloadUrl && (
          <div>
            <dt className="muted" style={{ marginBottom: 4 }}>Link para download</dt>
            <dd style={{ margin: 0, display: "flex", gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={() => onCopyLink(job)}>
                Copiar link
              </Button>
              <Button size="sm" variant="primary" onClick={() => onDownload(job)}>
                Baixar
              </Button>
            </dd>
          </div>
        )}
      </dl>
    </Modal>
  );
}
