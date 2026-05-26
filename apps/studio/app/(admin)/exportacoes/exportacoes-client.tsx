"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExportJob, ExportStatus, ExportType } from "@prisma/client";

const STATUS_COLORS: Record<ExportStatus, string> = {
  PENDING: "#f59e0b",
  RUNNING: "#6366f1",
  SUCCEEDED: "#22c55e",
  FAILED: "#ef4444",
};

const TYPE_LABELS: Record<ExportType, string> = {
  SCORM12: "SCORM 1.2",
  HTML: "HTML",
  IFRAME: "Iframe",
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleString("pt-BR");
}

export default function ExportacoesClient({ initialJobs }: { initialJobs: ExportJob[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);

  async function refresh() {
    const res = await fetch("/api/exports");
    if (res.ok) {
      const data = await res.json() as { jobs: ExportJob[] };
      setJobs(data.jobs);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Exportações</h1>
        <button
          onClick={refresh}
          style={{
            background: "transparent", border: "1px solid var(--border)",
            borderRadius: 6, padding: "7px 14px", color: "var(--text-muted)", cursor: "pointer",
          }}
        >
          ↻ Atualizar
        </button>
      </div>

      {jobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          Nenhuma exportação ainda. Crie uma via uma vitrine.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Título", "Tipo", "Status", "Criado em", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px" }}>{job.title}</td>
                <td style={{ padding: "12px", color: "var(--text-muted)" }}>{TYPE_LABELS[job.type]}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{
                    fontSize: 12, padding: "3px 8px", borderRadius: 20,
                    background: `${STATUS_COLORS[job.status]}20`,
                    color: STATUS_COLORS[job.status],
                  }}>
                    {job.status}
                  </span>
                </td>
                <td style={{ padding: "12px", color: "var(--text-muted)", fontSize: 13 }}>{fmtDate(job.createdAt)}</td>
                <td style={{ padding: "12px" }}>
                  {job.status === "SUCCEEDED" && (
                    <a
                      href={`/api/exports/${job.id}/download`}
                      style={{
                        background: "var(--accent)", color: "#fff", borderRadius: 5,
                        padding: "5px 10px", fontSize: 12, fontWeight: 600,
                      }}
                    >
                      Download
                    </a>
                  )}
                  {job.status === "FAILED" && (
                    <span style={{ color: "var(--danger)", fontSize: 12 }} title={job.errorMessage ?? ""}>
                      Falhou
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
