import React, { useCallback } from "react";
import type { ExportJobItem } from "../../api";
import { Button, Card } from "../ui";
import { formatDate, TYPE_LABELS, STATUS_LABELS, buildIframeEmbedSnippet } from "../../lib";

interface VitrineExportsSectionProps {
  playerUrl: string;
  jobs: ExportJobItem[];
  loading: boolean;
  onExport: () => void;
  exporting: boolean;
  onDownload: (job: ExportJobItem) => void;
  onCopy?: (success: boolean) => void;
}

function CopyButton({
  text,
  label,
  onCopy
}: {
  text: string;
  label: string;
  onCopy?: (success: boolean) => void;
}) {
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(
      () => onCopy?.(true),
      () => onCopy?.(false)
    );
  }, [text, onCopy]);
  return (
    <Button variant="secondary" size="sm" onClick={copy}>
      {label}
    </Button>
  );
}

export function VitrineExportsSection({
  playerUrl,
  jobs,
  loading,
  onExport,
  exporting,
  onDownload,
  onCopy
}: VitrineExportsSectionProps) {
  const iframeSnippet = buildIframeEmbedSnippet(playerUrl, 1280, 720, false);
  const iframeResponsiveSnippet = buildIframeEmbedSnippet(playerUrl, 1280, 720, true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Card plain className="card-padding">
        <div className="muted" style={{ marginBottom: 12 }}>Link direto</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            readOnly
            className="input"
            value={playerUrl}
            style={{ flex: "1 1 280px", minWidth: 0 }}
          />
          <CopyButton text={playerUrl} label="Copiar" onCopy={onCopy} />
        </div>
      </Card>

      <Card plain className="card-padding">
        <div className="muted" style={{ marginBottom: 12 }}>Iframe embed</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <textarea
            readOnly
            className="input"
            rows={2}
            value={iframeSnippet}
            style={{ flex: "1 1 320px", minWidth: 0, fontFamily: "monospace", fontSize: 12 }}
          />
          <CopyButton text={iframeSnippet} label="Copiar" onCopy={onCopy} />
        </div>
      </Card>

      <Card plain className="card-padding">
        <div className="muted" style={{ marginBottom: 12 }}>HTML embed (responsivo)</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <textarea
            readOnly
            className="input"
            rows={5}
            value={iframeResponsiveSnippet}
            style={{ flex: "1 1 320px", minWidth: 0, fontFamily: "monospace", fontSize: 12 }}
          />
          <CopyButton text={iframeResponsiveSnippet} label="Copiar" onCopy={onCopy} />
        </div>
      </Card>

      <Card plain className="card-padding">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span className="muted">Exportações SCORM desta vitrine</span>
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
    </div>
  );
}
