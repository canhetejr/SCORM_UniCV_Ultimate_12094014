import React from "react";
import type { ExportJobItem } from "../../api";
import { Button, Card } from "../ui";
import { formatDate, TYPE_LABELS, STATUS_LABELS } from "../../lib";

interface VitrineExportsSectionProps {
  jobs: ExportJobItem[];
  loading: boolean;
  onExport: () => void;
  exporting: boolean;
  onDownload: (job: ExportJobItem) => void;
}

export function VitrineExportsSection({
  jobs,
  loading,
  onExport,
  exporting,
  onDownload
}: VitrineExportsSectionProps) {
  return (
    <Card plain className="card-padding">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="muted">Exportações desta vitrine</span>
        <Button size="sm" onClick={onExport} disabled={exporting}>
          {exporting ? "A exportar…" : "Exportar SCORM"}
        </Button>
      </div>
      {loading ? (
        <p className="muted">A carregar…</p>
      ) : jobs.length === 0 ? (
        <p className="muted">Nenhuma exportação encontrada.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Status</th>
                <th>Criado em</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{TYPE_LABELS[job.type] ?? job.type}</td>
                  <td>{STATUS_LABELS[job.status] ?? job.status}</td>
                  <td>{formatDate(job.createdAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    {job.status === "SUCCEEDED" && job.downloadUrl && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onDownload(job)}
                      >
                        Baixar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
