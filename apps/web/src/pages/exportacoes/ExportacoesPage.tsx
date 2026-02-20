/**
 * WIREFRAME TEXTUAL — Exportações (/exportacoes)
 * -----------------------------------------------
 * [ Cabeçalho: "Exportações" ]
 * [ Filtros: Status (select) | Vitrine (select) | Botão Limpar ]
 * [ Card ]
 *   [ Tabela: Vitrine | Tipo | Status | Criado em | Atualizado em | Ações ]
 *   [ Linhas... ]
 *   [ Empty: "Nenhuma exportação encontrada." ]
 *   [ Skeleton: linhas placeholder ]
 *   [ Erro: mensagem + botão Tentar novamente ]
 * [ Modal detalhes: título, vitrine, tipo, status, datas, erro (se houver), link (se concluído) ]
 *
 * Ações por linha: Ver detalhes | Baixar (se concluído) | Repetir | Copiar link (se concluído)
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  getResolvedApiBase,
  apiGet,
  apiPost,
  getAuthToken,
  getExportsList,
  getExportJob,
  type ExportJobItem
} from "../../api";
import type { Vitrine } from "../../types/vitrine";
import { Button, Card, ToastContainer } from "../../components/ui";
import { ExportsTable, ExportDetailsModal } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import {
  downloadFile,
  getExportFilename
} from "../../lib";

export function ExportacoesPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<ExportJobItem[]>([]);
  const [vitrines, setVitrines] = useState<Vitrine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterVitrineId, setFilterVitrineId] = useState<string>("");
  const [detailJob, setDetailJob] = useState<ExportJobItem | null>(null);
  const [repeatingId, setRepeatingId] = useState<string | null>(null);

  const loadVitrines = useCallback(async () => {
    try {
      const res = await apiGet<{ vitrines: Vitrine[] }>("/v1/vitrines");
      setVitrines(res.vitrines || []);
    } catch {
      setVitrines([]);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: string; vitrineId?: string } = {};
      if (filterStatus) params.status = filterStatus;
      if (filterVitrineId) params.vitrineId = filterVitrineId;
      const res = await getExportsList(params);
      setJobs(res.jobs || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar exportações.";
      setError(msg);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterVitrineId]);

  useEffect(() => {
    loadVitrines();
  }, [loadVitrines]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRepeat = async (job: ExportJobItem) => {
    if (!job.vitrineId) return;
    setRepeatingId(job.id);
    try {
      if (job.type === "SCORM12") {
        await apiPost("/v1/exports/scorm12", {
          vitrineId: job.vitrineId,
          title: job.title,
          selfContained: true
        });
      } else {
        await apiPost("/v1/exports/html", {
          vitrineId: job.vitrineId,
          title: job.title,
          selfContained: true
        });
      }
      toast.success("Exportação repetida com sucesso.");
      await loadJobs();
      if (detailJob?.id === job.id) setDetailJob(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao repetir exportação.");
    } finally {
      setRepeatingId(null);
    }
  };

  const handleCopyLink = (job: ExportJobItem) => {
    if (!job.downloadUrl) return;
    const url = `${getResolvedApiBase()}${job.downloadUrl}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copiado para a área de transferência."),
      () => toast.error("Não foi possível copiar o link.")
    );
  };

  const handleDownload = async (job: ExportJobItem) => {
    if (!job.downloadUrl) return;
    const url = `${getResolvedApiBase()}${job.downloadUrl}`;
    const token = getAuthToken();
    const filename = getExportFilename(job.type, job.title);
    try {
      await downloadFile(url, filename, token);
    } catch (err) {
      toast.error("Erro ao baixar o ficheiro.");
    }
  };

  const openDetail = async (id: string) => {
    try {
      const job = await getExportJob(id);
      setDetailJob(job);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar detalhes.");
    }
  };

  return (
    <div className="page-exportacoes" style={{ maxWidth: 1100 }}>
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
      <h1 style={{ marginTop: 0, marginBottom: 24, fontSize: "1.5rem" }}>Exportações</h1>

      {/* Filtros */}
      <Card plain className="card-padding mb-lg">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label className="muted" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Status
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--input-bg)",
                color: "var(--text)",
                minWidth: 160
              }}
            >
              <option value="">Todos</option>
              <option value="PENDING">Na fila</option>
              <option value="RUNNING">Em execução</option>
              <option value="SUCCEEDED">Concluído</option>
              <option value="FAILED">Erro</option>
            </select>
          </label>
          <label className="muted" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Vitrine
            <select
              value={filterVitrineId}
              onChange={(e) => setFilterVitrineId(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--input-bg)",
                color: "var(--text)",
                minWidth: 200
              }}
            >
              <option value="">Todas</option>
              {vitrines.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            onClick={() => {
              setFilterStatus("");
              setFilterVitrineId("");
            }}
          >
            Limpar filtros
          </Button>
        </div>
      </Card>

      <Card plain className="card-padding">
        {error && (
          <div
            style={{
              padding: 16,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 8,
              marginBottom: 16
            }}
          >
            <p style={{ margin: 0 }}>{error}</p>
            <Button variant="secondary" onClick={loadJobs} className="mt-md">
              Tentar novamente
            </Button>
          </div>
        )}

        {loading && !error && (
          <div className="muted" style={{ padding: "24px 0" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 44,
                    background: "var(--border)",
                    borderRadius: 8,
                    opacity: 0.6
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <p className="muted" style={{ padding: "32px 0", textAlign: "center" }}>
            Nenhuma exportação encontrada.
          </p>
        )}

        {!loading && !error && jobs.length > 0 && (
          <ExportsTable
            jobs={jobs}
            onViewDetails={openDetail}
            onDownload={handleDownload}
            onCopyLink={handleCopyLink}
            onRepeat={handleRepeat}
            repeatingId={repeatingId}
          />
        )}
      </Card>

      <ExportDetailsModal
        job={detailJob}
        onClose={() => setDetailJob(null)}
        onDownload={handleDownload}
        onCopyLink={handleCopyLink}
      />
    </div>
  );
}
