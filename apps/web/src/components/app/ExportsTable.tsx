import React from "react";
import type { ExportJobItem, ExportJobStatus } from "../../api";
import { Badge, Button } from "../ui";
import { formatDate, STATUS_LABELS, STATUS_BADGE_VARIANT, TYPE_LABELS } from "../../lib";

interface ExportsTableProps {
  jobs: ExportJobItem[];
  onViewDetails: (id: string) => void;
  onDownload: (job: ExportJobItem) => void;
  onCopyLink: (job: ExportJobItem) => void;
  onRepeat: (job: ExportJobItem) => void;
  repeatingId: string | null;
}

export function ExportsTable({
  jobs,
  onViewDetails,
  onDownload,
  onCopyLink,
  onRepeat,
  repeatingId
}: ExportsTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Vitrine</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Criado em</th>
            <th>Atualizado em</th>
            <th style={{ textAlign: "right" }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>{job.vitrineName ?? job.title}</td>
              <td>{TYPE_LABELS[job.type] ?? job.type}</td>
              <td>
                <Badge variant={STATUS_BADGE_VARIANT[job.status as ExportJobStatus]}>
                  {STATUS_LABELS[job.status] ?? job.status}
                </Badge>
              </td>
              <td style={{ whiteSpace: "nowrap" }}>{formatDate(job.createdAt)}</td>
              <td style={{ whiteSpace: "nowrap" }}>{formatDate(job.updatedAt)}</td>
              <td style={{ textAlign: "right" }}>
                <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Button size="sm" variant="ghost" onClick={() => onViewDetails(job.id)}>
                    Ver detalhes
                  </Button>
                  {job.status === "SUCCEEDED" && job.downloadUrl && (
                    <>
                      <Button size="sm" variant="primary" onClick={() => onDownload(job)}>
                        Baixar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => onCopyLink(job)}>
                        Copiar link
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onRepeat(job)}
                    disabled={!!repeatingId || !job.vitrineId}
                  >
                    {repeatingId === job.id ? "A repetir…" : "Repetir"}
                  </Button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
