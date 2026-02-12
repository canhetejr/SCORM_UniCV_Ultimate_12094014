import React, { useEffect, useMemo, useState } from "react";
import { API_BASE, apiGet, apiPost } from "./api";

type Vitrine = {
  id: string;
  title: string;
  description: string | null;
  vimeoShowcaseId: string | null;
  vimeoSource: "MANUAL" | "VIMEO_SHOWCASE";
  createdAt: string;
};

export function App() {
  const [status, setStatus] = useState<{ connected: boolean; vimeoUserId?: string | null }>({ connected: false });
  const [showcases, setShowcases] = useState<Array<{ id: string; title: string; description: string }>>([]);
  const [vitrines, setVitrines] = useState<Vitrine[]>([]);
  const [selectedVitrineId, setSelectedVitrineId] = useState<string>("");
  const [exportResult, setExportResult] = useState<{ kind: string; url: string } | null>(null);
  const [iframeSnippet, setIframeSnippet] = useState<string>("");

  const selectedVitrine = useMemo(
    () => vitrines.find((v) => v.id === selectedVitrineId) || null,
    [vitrines, selectedVitrineId]
  );

  async function refresh() {
    const s = await apiGet<any>("/v1/vimeo/status");
    setStatus(s);
    const v = await apiGet<{ vitrines: Vitrine[] }>("/v1/vitrines");
    setVitrines(v.vitrines);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  async function loadShowcases() {
    const data = await apiGet<{ showcases: Array<{ id: string; title: string; description: string }> }>("/v1/vimeo/showcases");
    setShowcases(data.showcases);
  }

  async function importShowcase(id: string) {
    await apiPost(`/v1/vimeo/showcases/${encodeURIComponent(id)}/import`);
    await refresh();
  }

  async function createVitrine(form: HTMLFormElement) {
    const fd = new FormData(form);
    const title = String(fd.get("title") || "").trim();
    const description = String(fd.get("description") || "").trim();
    await apiPost("/v1/vitrines", { title, description: description || null });
    form.reset();
    await refresh();
  }

  async function addVideo(form: HTMLFormElement) {
    const fd = new FormData(form);
    const vimeoVideoId = String(fd.get("vimeoVideoId") || "").trim();
    const url = String(fd.get("url") || "").trim();
    const title = String(fd.get("title") || "").trim();
    const embedHash = String(fd.get("embedHash") || "").trim();

    if (!selectedVitrineId) throw new Error("Selecione uma vitrine.");
    await apiPost(`/v1/vitrines/${encodeURIComponent(selectedVitrineId)}/videos`, {
      vimeoVideoId: vimeoVideoId || undefined,
      url: url || undefined,
      title: title || undefined,
      embedHash: embedHash || undefined
    });
    form.reset();
  }

  async function importCsv(form: HTMLFormElement) {
    const fd = new FormData(form);
    const csv = String(fd.get("csv") || "");
    if (!selectedVitrineId) throw new Error("Selecione uma vitrine.");
    await apiPost(`/v1/vitrines/${encodeURIComponent(selectedVitrineId)}/import/csv`, csv, "text/plain");
    form.reset();
  }

  async function exportScorm() {
    if (!selectedVitrineId) throw new Error("Selecione uma vitrine.");
    const title = selectedVitrine?.title || "UniCV";
    const res = await apiPost<{ downloadUrl: string }>("/v1/exports/scorm12", {
      vitrineId: selectedVitrineId,
      title,
      selfContained: true
    });
    setExportResult({ kind: "SCORM 1.2", url: `${API_BASE}${res.downloadUrl}` });
  }

  async function exportHtml() {
    if (!selectedVitrineId) throw new Error("Selecione uma vitrine.");
    const title = selectedVitrine?.title || "UniCV";
    const res = await apiPost<{ downloadUrl: string }>("/v1/exports/html", {
      vitrineId: selectedVitrineId,
      title,
      selfContained: true
    });
    setExportResult({ kind: "HTML", url: `${API_BASE}${res.downloadUrl}` });
  }

  async function loadIframe() {
    if (!selectedVitrineId) throw new Error("Selecione uma vitrine.");
    const res = await apiPost<{ snippet: string }>("/v1/exports/iframe", { vitrineId: selectedVitrineId });
    setIframeSnippet(res.snippet);
  }

  return (
    <div className="container">
      <div className="top">
        <div>
          <div className="h">UniCV Studio</div>
          <div className="muted">
            API: <code>{API_BASE}</code>
          </div>
        </div>
        <div className="pill">
          <strong>Vimeo</strong>
          <span>{status.connected ? "conectado" : "desconectado"}</span>
          {status.connected ? <span className="muted">user {status.vimeoUserId || "?"}</span> : null}
        </div>
      </div>

      <div className="row">
        <div className="card">
          <div className="h" style={{ fontSize: 16 }}>Conectar Vimeo</div>
          <p className="muted">
            Clique para iniciar OAuth. Você será redirecionado para o Vimeo e voltará para a API.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn" href={`${API_BASE}/auth/vimeo/start`}>Conectar conta</a>
            <button className="btn secondary" onClick={() => refresh()}>Atualizar status</button>
            <button className="btn secondary" disabled={!status.connected} onClick={() => loadShowcases()}>
              Listar Showcases
            </button>
          </div>

          <div style={{ marginTop: 14 }} className="list">
            {showcases.length ? showcases.map((s) => (
              <div key={s.id} className="card" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div><strong>{s.title}</strong></div>
                    <div className="muted">{s.id}</div>
                  </div>
                  <button className="btn" onClick={() => importShowcase(s.id)}>Importar</button>
                </div>
              </div>
            )) : <div className="muted">Sem showcases carregados.</div>}
          </div>
        </div>

        <div className="card">
          <div className="h" style={{ fontSize: 16 }}>Vitrines</div>
          <p className="muted">Crie vitrines manuais, ou importe do Vimeo.</p>

          <form onSubmit={(e) => { e.preventDefault(); createVitrine(e.currentTarget).catch((err) => alert(err.message)); }}>
            <div className="field">
              <label>Título</label>
              <input name="title" placeholder="Ex.: Enfermagem - Módulo 1" />
            </div>
            <div className="field">
              <label>Descrição (opcional)</label>
              <textarea name="description" rows={2} placeholder="Notas internas..." />
            </div>
            <button className="btn" type="submit">Criar vitrine</button>
          </form>

          <div style={{ marginTop: 16 }} className="field">
            <label>Selecionar vitrine</label>
            <select
              value={selectedVitrineId}
              onChange={(e) => setSelectedVitrineId(e.target.value)}
              style={{ background: "#0b1220", color: "inherit", borderRadius: 10, padding: "10px 12px", border: "1px solid rgba(148,163,184,.25)" }}
            >
              <option value="">—</option>
              {vitrines.map((v) => (
                <option key={v.id} value={v.id}>{v.title} ({v.vimeoSource})</option>
              ))}
            </select>
            {selectedVitrine ? (
              <div className="muted">
                ID: <code>{selectedVitrine.id}</code>{" "}
                {selectedVitrine.vimeoShowcaseId ? <>| Showcase: <code>{selectedVitrine.vimeoShowcaseId}</code></> : null}
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 14, marginTop: 10 }}>
            <div className="card" style={{ padding: 12 }}>
              <div><strong>Preview / Exportar</strong></div>
              <div className="muted">Preview usa o player hospedado na API (rota <code>/player/</code>).</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                <a
                  className="btn secondary"
                  href={selectedVitrineId ? `${API_BASE}/player/index.html?vitrine_id=${encodeURIComponent(selectedVitrineId)}` : "#"}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => { if (!selectedVitrineId) e.preventDefault(); }}
                >
                  Abrir preview
                </a>
                <button className="btn" disabled={!selectedVitrineId} onClick={() => exportScorm().catch((e) => alert(e.message))}>
                  Exportar SCORM
                </button>
                <button className="btn secondary" disabled={!selectedVitrineId} onClick={() => exportHtml().catch((e) => alert(e.message))}>
                  Exportar HTML
                </button>
                <button className="btn secondary" disabled={!selectedVitrineId} onClick={() => loadIframe().catch((e) => alert(e.message))}>
                  Gerar iframe
                </button>
              </div>

              {exportResult ? (
                <div style={{ marginTop: 10 }} className="muted">
                  <div><strong>Pronto:</strong> {exportResult.kind}</div>
                  <div>
                    Download: <a href={exportResult.url} target="_blank" rel="noreferrer">{exportResult.url}</a>
                  </div>
                </div>
              ) : null}

              {iframeSnippet ? (
                <div style={{ marginTop: 10 }} className="field">
                  <label className="muted">iframe</label>
                  <textarea readOnly rows={4} value={iframeSnippet} />
                </div>
              ) : null}
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div><strong>Adicionar vídeo (um a um)</strong></div>
              <div className="muted">Cole um ID, URL do Vimeo, e opcionalmente o hash do embed para privados.</div>
              <form onSubmit={(e) => { e.preventDefault(); addVideo(e.currentTarget).then(() => alert("Vídeo adicionado")).catch((err) => alert(err.message)); }}>
                <div className="field"><label>Vimeo Video ID</label><input name="vimeoVideoId" placeholder="123456789" /></div>
                <div className="field"><label>ou URL</label><input name="url" placeholder="https://vimeo.com/123456789" /></div>
                <div className="field"><label>Título (opcional)</label><input name="title" placeholder="Aula 01" /></div>
                <div className="field"><label>Embed hash (opcional)</label><input name="embedHash" placeholder="abc123def" /></div>
                <button className="btn" type="submit" disabled={!selectedVitrineId}>Adicionar</button>
              </form>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div><strong>Importar CSV (lote)</strong></div>
              <div className="muted">
                Cabeçalho esperado: <code>vimeo_video_id,title,embed_hash</code> (ou <code>url</code> no lugar de <code>vimeo_video_id</code>)
              </div>
              <form onSubmit={(e) => { e.preventDefault(); importCsv(e.currentTarget).then(() => alert("Importação concluída")).catch((err) => alert(err.message)); }}>
                <div className="field">
                  <label>CSV</label>
                  <textarea name="csv" rows={6} placeholder={"vimeo_video_id,title,embed_hash\n123,Aula 1,\n456,Aula 2,abc123"} />
                </div>
                <button className="btn" type="submit" disabled={!selectedVitrineId}>Importar</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

