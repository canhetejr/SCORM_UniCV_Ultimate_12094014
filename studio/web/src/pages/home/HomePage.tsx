import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getResolvedApiBase, getResolvedPublicBaseUrl, apiGet, apiPost, apiPut, getVimeoOAuthStartUrl, postVitrine, postDuplicateVitrine } from "../../api";
import type { Vitrine } from "../../types/vitrine";
import { Button, Input, Field, Card, ToastContainer } from "../../components/ui";
import { VitrineCard, NewVitrineModal } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { STATUS_OPTIONS } from "../../lib";

export function HomePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<{
    connected: boolean;
    configured?: boolean;
    vimeoUserId?: string | null;
  }>({ connected: false });
  const [showcases, setShowcases] = useState<Array<{ id: string; title: string; description: string }>>([]);
  const [accessToken, setAccessToken] = useState("");
  const [vitrines, setVitrines] = useState<Vitrine[]>([]);
  const [selectedVitrineId, setSelectedVitrineId] = useState<string>("");
  const [exportResult, setExportResult] = useState<{ kind: string; url: string } | null>(null);
  const [iframeSnippet, setIframeSnippet] = useState<string>("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [showcaseIdInput, setShowcaseIdInput] = useState("");
  const [vitrineIdInput, setVitrineIdInput] = useState("");
  const [loadingVitrineByCode, setLoadingVitrineByCode] = useState(false);
  const [importingShowcaseByCode, setImportingShowcaseByCode] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("me");
  const [colaboradores, setColaboradores] = useState<Array<{ id: string; name: string }>>([]);
  const [addingColaborador, setAddingColaborador] = useState(false);
  const [newColabId, setNewColabId] = useState("");
  const [newColabName, setNewColabName] = useState("");
  const [searchVitrines, setSearchVitrines] = useState("");
  const [searchShowcases, setSearchShowcases] = useState("");
  const [selectedShowcaseIds, setSelectedShowcaseIds] = useState<Set<string>>(new Set());
  const [importingBatch, setImportingBatch] = useState(false);
  const toast = useToast();
  const [modalNovaVitrine, setModalNovaVitrine] = useState(false);
  const [novaVitrineTitle, setNovaVitrineTitle] = useState("");
  const [novaVitrineStatus, setNovaVitrineStatus] = useState("EDITING");
  const [creatingVitrine, setCreatingVitrine] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

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

  function showVimeoError(err: unknown) {
    const e = err as { message?: string; code?: string };
    const message = e?.message ?? "Erro Vimeo.";
    if (e?.code === "vimeo_disconnected") {
      toast.warning(message);
    } else {
      toast.error(message);
    }
  }

  async function loadProfiles() {
    try {
      const { profiles } = await apiGet<{ profiles: Array<{ id: string; name: string }> }>("/v1/vimeo/profiles");
      setColaboradores(profiles || []);
    } catch {
      setColaboradores([]);
    }
  }

  const saveProfiles = useCallback(async (list: Array<{ id: string; name: string }>) => {
    try {
      await apiPut("/v1/vimeo/profiles", { profiles: list });
    } catch {}
  }, []);

  useEffect(() => {
    refresh().catch((e: unknown) => {
      const err = e as { message?: string; code?: string };
      toast.error(err?.message ?? "Erro ao carregar.");
    });
    loadProfiles().catch(() => {});
  }, [toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vimeoError = params.get("vimeo_error");
    const vimeoConnected = params.get("vimeo_connected");
    if (vimeoError) {
      toast.error(decodeURIComponent(vimeoError));
    }
    if (vimeoError || vimeoConnected) {
      params.delete("vimeo_error");
      params.delete("vimeo_connected");
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : "") + (window.location.hash || "");
      window.history.replaceState({}, "", url);
      if (vimeoConnected) refresh().catch(() => {});
    }
  }, [toast]);

  const vimeoUserIdForImport = selectedProfileId === "me" ? undefined : selectedProfileId;

  async function loadShowcases() {
    const url =
      selectedProfileId === "me"
        ? "/v1/vimeo/showcases"
        : `/v1/vimeo/showcases?userId=${encodeURIComponent(selectedProfileId)}`;
    const data = await apiGet<{ showcases: Array<{ id: string; title: string; description: string }> }>(url);
    setShowcases(data.showcases);
  }

  async function importShowcase(id: string) {
    await apiPost(`/v1/vimeo/showcases/${encodeURIComponent(id)}/import`, {
      ...(vimeoUserIdForImport && { vimeoUserId: vimeoUserIdForImport })
    });
    await refresh();
  }

  async function importShowcaseByCode(e: React.FormEvent) {
    e.preventDefault();
    const id = showcaseIdInput.trim();
    if (!id) return;
    setImportingShowcaseByCode(true);
    try {
      await apiPost(`/v1/vimeo/showcases/${encodeURIComponent(id)}/import`, {
        ...(vimeoUserIdForImport && { vimeoUserId: vimeoUserIdForImport })
      });
      setShowcaseIdInput("");
      await refresh();
    } catch (err: unknown) {
      showVimeoError(err);
    } finally {
      setImportingShowcaseByCode(false);
    }
  }

  function addColaborador(e: React.FormEvent) {
    e.preventDefault();
    const id = newColabId.trim();
    if (!id) return;
    if (colaboradores.some((c) => c.id === id)) {
      toast.warning("Este colaborador já está na lista.");
      return;
    }
    const next = [...colaboradores, { id, name: newColabName.trim() || id }];
    setColaboradores(next);
    saveProfiles(next);
    setSelectedProfileId(id);
    setAddingColaborador(false);
    setNewColabId("");
    setNewColabName("");
  }

  function removeColaborador(id: string) {
    const next = colaboradores.filter((c) => c.id !== id);
    setColaboradores(next);
    saveProfiles(next);
    if (selectedProfileId === id) setSelectedProfileId("me");
  }

  async function importBatch() {
    if (selectedShowcaseIds.size === 0) return;
    const ids = Array.from(selectedShowcaseIds);
    setImportingBatch(true);
    try {
      const res = await apiPost<{ imported: number }>(
        "/v1/vimeo/showcases/import-batch",
        { ids, vimeoUserId: vimeoUserIdForImport || undefined }
      );
      const imported = res.imported || 0;
      setSelectedShowcaseIds(new Set());
      await refresh();
      toast.success(`Importados ${imported} de ${ids.length} showcases.`);
    } catch (err: unknown) {
      showVimeoError(err);
    } finally {
      setImportingBatch(false);
    }
  }

  const filteredVitrines = useMemo(() => {
    const q = searchVitrines.trim().toLowerCase();
    if (!q) return vitrines;
    return vitrines.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        (v.vimeoShowcaseId || "").includes(q)
    );
  }, [vitrines, searchVitrines]);

  const filteredShowcases = useMemo(() => {
    const q = searchShowcases.trim().toLowerCase();
    if (!q) return showcases;
    return showcases.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.id.includes(q) ||
        (s.description || "").toLowerCase().includes(q)
    );
  }, [showcases, searchShowcases]);

  async function loadVitrineByCode(e: React.FormEvent) {
    e.preventDefault();
    const id = vitrineIdInput.trim();
    if (!id) return;
    setLoadingVitrineByCode(true);
    try {
      const v = await apiGet<Vitrine>(`/v1/vitrines/${encodeURIComponent(id)}`);
      setSelectedVitrineId(v.id);
      if (!vitrines.some((x) => x.id === v.id)) {
        setVitrines((prev) => [v, ...prev]);
      }
      setVitrineIdInput("");
    } catch (err: unknown) {
      showVimeoError(err);
    } finally {
      setLoadingVitrineByCode(false);
    }
  }

  async function connectWithToken(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken.trim()) return;
    try {
      await apiPost("/v1/vimeo/connect-token", { accessToken: accessToken.trim() });
      setAccessToken("");
      await refresh();
    } catch (err: unknown) {
      showVimeoError(err);
    }
  }

  async function disconnect() {
    if (!confirm("Desconectar a conta Vimeo? Será necessário conectar novamente para importar showcases.")) return;
    setDisconnecting(true);
    try {
      await apiPost("/v1/vimeo/disconnect", {});
      setShowcases([]);
      await refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleNovaVitrine(e: React.FormEvent) {
    e.preventDefault();
    const title = novaVitrineTitle.trim();
    if (!title) {
      toast.warning("Título é obrigatório.");
      return;
    }
    setCreatingVitrine(true);
    try {
      const { vitrine } = await postVitrine({ title, status: novaVitrineStatus });
      setModalNovaVitrine(false);
      setNovaVitrineTitle("");
      setNovaVitrineStatus("EDITING");
      toast.success("Vitrine criada.");
      navigate(`/vitrines/${vitrine.id}`);
      await refresh();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Erro ao criar vitrine.");
    } finally {
      setCreatingVitrine(false);
    }
  }

  async function handleDuplicateVitrine(vitrineId: string) {
    setDuplicatingId(vitrineId);
    try {
      const { vitrine } = await postDuplicateVitrine(vitrineId);
      toast.success("Vitrine duplicada.");
      navigate(`/vitrines/${vitrine.id}`);
      await refresh();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Erro ao duplicar vitrine.");
    } finally {
      setDuplicatingId(null);
    }
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
    setExportResult({ kind: "SCORM 1.2", url: `${getResolvedApiBase()}${res.downloadUrl}` });
  }

  async function exportHtml() {
    if (!selectedVitrineId) throw new Error("Selecione uma vitrine.");
    const title = selectedVitrine?.title || "UniCV";
    const res = await apiPost<{ downloadUrl: string }>("/v1/exports/html", {
      vitrineId: selectedVitrineId,
      title,
      selfContained: true
    });
    setExportResult({ kind: "HTML", url: `${getResolvedApiBase()}${res.downloadUrl}` });
  }

  async function loadIframe() {
    if (!selectedVitrineId) throw new Error("Selecione uma vitrine.");
    const res = await apiPost<{ snippet: string }>("/v1/exports/iframe", { vitrineId: selectedVitrineId });
    setIframeSnippet(res.snippet);
  }

  return (
    <div className="page-home">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />

      <div className="top flex flex-wrap gap-md">
        <div className={`pill ${status.connected ? "connected" : "disconnected"}`}>
          <strong>Vimeo</strong>
          <span>
            {status.configured === false
              ? "não configurado"
              : status.connected
                ? "Conectado"
                : "Desconectado"}
          </span>
          {status.connected && status.vimeoUserId ? (
            <span className="muted">· user {status.vimeoUserId}</span>
          ) : null}
        </div>
        {status.connected && (
          <Button variant="danger" onClick={disconnect} disabled={disconnecting} title="Desconectar conta Vimeo">
            {disconnecting ? "Desconectando…" : "Desconectar"}
          </Button>
        )}
      </div>

      <div className="row">
        <Card plain>
          <div className="card-section-title">Vimeo</div>
          {status.configured === false ? (
            <p className="muted warning-text mb-lg">
              Configure VIMEO_CLIENT_ID e VIMEO_CLIENT_SECRET no .env (developer.vimeo.com/apps).
            </p>
          ) : !status.connected ? (
            <p className="muted mb-lg">Conecte via OAuth ou use um Access Token para testes.</p>
          ) : (
            <p className="muted mb-lg">Conta conectada. Importe showcases por ID ou liste do Vimeo.</p>
          )}

          {!status.connected && (
            <>
              <div className="form-row mb-lg">
                {status.configured !== false && (
                  <Button
                    onClick={() =>
                      getVimeoOAuthStartUrl()
                        .then((r) => (window.location.href = r.url))
                        .catch((e) => toast.error(e?.message ?? "Erro ao iniciar OAuth."))
                    }
                  >
                    Conectar com OAuth
                  </Button>
                )}
                <Button variant="secondary" onClick={() => refresh()}>
                  Atualizar
                </Button>
              </div>

              <form onSubmit={connectWithToken} className="form-row form-divider">
                <Field label="Ou Access Token (testes)" className="field-flex">
                  <Input
                    type="password"
                    placeholder="Token de developer.vimeo.com/apps"
                    value={accessToken}
                    onChange={(v) => setAccessToken(v)}
                  />
                </Field>
                <Button type="submit" variant="secondary" disabled={!accessToken.trim()}>
                  Conectar com token
                </Button>
              </form>
            </>
          )}

          {status.connected && (
            <>
              <Field label="Perfil para listar vitrines" className="mb-md">
                <select
                  className="input"
                  value={addingColaborador ? "add" : selectedProfileId}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "add") setAddingColaborador(true);
                    else setSelectedProfileId(v);
                  }}
                  style={{ maxWidth: 360 }}
                >
                  <option value="me">
                    Meu perfil
                    {status.vimeoUserId ? ` (ID: ${status.vimeoUserId})` : ""}
                  </option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || "Colaborador"} — ID: {c.id}
                    </option>
                  ))}
                  <option value="add">+ Adicionar colaborador</option>
                </select>
              </Field>
              {colaboradores.length > 0 && (
                <div className="flex flex-wrap gap-sm mb-md">
                  {colaboradores.map((c) => (
                    <span
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      className={`profile-chip ${selectedProfileId === c.id ? "active" : ""}`}
                      onClick={() => setSelectedProfileId(c.id)}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedProfileId(c.id)}
                    >
                      {c.name || c.id}
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeColaborador(c.id);
                        }}
                        title="Remover"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {addingColaborador && (
                <form onSubmit={addColaborador} className="form-row form-add-colab">
                  <Field label="ID do usuário Vimeo" className="field-flex-sm">
                    <Input placeholder="ex: 12345678" value={newColabId} onChange={(v) => setNewColabId(v)} />
                  </Field>
                  <Field label="Nome (opcional)" className="field-flex-sm">
                    <Input placeholder="ex: Departamento X" value={newColabName} onChange={(v) => setNewColabName(v)} />
                  </Field>
                  <Button type="submit" disabled={!newColabId.trim()}>
                    Adicionar
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setAddingColaborador(false)}>
                    Cancelar
                  </Button>
                </form>
              )}

              <Button
                onClick={() => loadShowcases().catch(showVimeoError)}
                className="mb-lg"
              >
                Listar showcases do perfil selecionado
              </Button>

              <form onSubmit={importShowcaseByCode} className="form-row form-row-inline mb-lg">
                <Field label="Importar por ID do showcase" className="field-flex field-flex-160">
                  <Input placeholder="ex: 12097615" value={showcaseIdInput} onChange={(v) => setShowcaseIdInput(v)} />
                </Field>
                <Button type="submit" variant="secondary" disabled={!showcaseIdInput.trim() || importingShowcaseByCode}>
                  {importingShowcaseByCode ? "Importando…" : "Importar"}
                </Button>
              </form>
            </>
          )}

          {status.connected && (
            <div className="mt-md card-scroll-section">
              <div className="form-row mb-md">
                <Input
                  placeholder="Pesquisar showcases (título, ID)"
                  value={searchShowcases}
                  onChange={(v) => setSearchShowcases(v)}
                  className="input-search"
                />
                {selectedShowcaseIds.size > 0 && (
                  <Button onClick={importBatch} disabled={importingBatch}>
                    {importingBatch ? "Importando…" : `Importar ${selectedShowcaseIds.size} selecionados`}
                  </Button>
                )}
              </div>
              <div className="list list-scroll">
                {filteredShowcases.length ? (
                  filteredShowcases.map((s) => (
                    <div key={s.id} className="card vitrine-card card-padding">
                      <div className="flex flex-between gap-md items-center">
                        <label className="flex items-center gap-md flex-1" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={selectedShowcaseIds.has(s.id)}
                            onChange={(e) => {
                              setSelectedShowcaseIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(s.id);
                                else next.delete(s.id);
                                return next;
                              });
                            }}
                          />
                          <div>
                            <div><strong>{s.title}</strong></div>
                            <div className="muted" style={{ fontSize: 12 }}>ID: {s.id}</div>
                          </div>
                        </label>
                        <Button variant="secondary" onClick={() => importShowcase(s.id)}>
                          Importar
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="muted py-md">
                    {showcases.length ? "Nenhum resultado na pesquisa." : 'Clique em "Listar showcases do perfil selecionado" para carregar.'}
                  </div>
                )}
              </div>
            </div>
          )}

        </Card>

        <Card plain>
          <div className="card-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            Vitrines
            <Button onClick={() => setModalNovaVitrine(true)}>
              + Nova Vitrine
            </Button>
          </div>
          <p className="muted mb-lg">Selecione por ID, crie manualmente ou use vitrines já importadas.</p>

          <NewVitrineModal
            open={modalNovaVitrine}
            onClose={() => setModalNovaVitrine(false)}
            onSubmit={handleNovaVitrine}
            title={novaVitrineTitle}
            onTitleChange={setNovaVitrineTitle}
            status={novaVitrineStatus}
            onStatusChange={setNovaVitrineStatus}
            creating={creatingVitrine}
          />

          <form onSubmit={loadVitrineByCode} className="mb-lg">
            <Field label="Selecionar vitrine por código (ID)" className="mb-0">
              <div className="form-row form-row-inline">
                <Input
                  placeholder="ID da vitrine (ex: vimeo_showcase_123456)"
                  value={vitrineIdInput}
                  onChange={(v) => setVitrineIdInput(v)}
                  className="input-vitrine"
                />
                <Button type="submit" variant="secondary" disabled={!vitrineIdInput.trim() || loadingVitrineByCode}>
                  {loadingVitrineByCode ? "Carregando…" : "Carregar"}
                </Button>
              </div>
            </Field>
          </form>

          <div className="mt-lg form-divider card-scroll-section">
            <div className="section-title">Vitrines disponíveis</div>
            <Input
              placeholder="Pesquisar vitrines (título, ID)"
              value={searchVitrines}
              onChange={(v) => setSearchVitrines(v)}
              className="mb-md"
            />
            <div className="list list-scroll mb-lg">
              {filteredVitrines.length > 0 ? filteredVitrines.map((v) => (
                  <VitrineCard
                    key={v.id}
                    vitrine={v}
                    selected={selectedVitrineId === v.id}
                    onSelect={() => setSelectedVitrineId(v.id)}
                    onDuplicate={() => handleDuplicateVitrine(v.id)}
                    duplicating={duplicatingId === v.id}
                  />
                )) : (
                  <div className="muted py-md">
                    {vitrines.length ? "Nenhum resultado na pesquisa." : "Nenhuma vitrine ainda."}
                  </div>
                )}
              </div>
            </div>

          <Field label="Selecionar vitrine">
            <select
              className="input"
              value={selectedVitrineId}
              onChange={(e) => setSelectedVitrineId(e.target.value)}
            >
              <option value="">—</option>
              {vitrines.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} ({v.vimeoSource})
                  {v.account ? ` — ${v.account.name}` : ""}
                </option>
              ))}
            </select>
            {selectedVitrine ? (
              <div className="muted">
                ID: <code>{selectedVitrine.id}</code>{" "}
                {selectedVitrine.vimeoShowcaseId ? (
                  <>| Showcase: <code>{selectedVitrine.vimeoShowcaseId}</code></>
                ) : null}
              </div>
            ) : null}
          </Field>

          <div className="grid mt-md">
            <Card plain highlight={!!selectedVitrineId} className="card-padding">
              <div className="card-section-title">Preview / Exportar</div>
              <div className="muted">
                Preview usa o player hospedado na API (rota <code>/player/</code>).
              </div>
              <div className="form-row mt-md">
                <a
                  className="btn secondary"
                  href={
                    selectedVitrineId
                      ? `${getResolvedPublicBaseUrl()}/player/index.html?vitrine_id=${encodeURIComponent(selectedVitrineId)}`
                      : "#"
                  }
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    if (!selectedVitrineId) e.preventDefault();
                  }}
                >
                  Abrir preview
                </a>
                <Button
                  disabled={!selectedVitrineId}
                  onClick={() => exportScorm().catch(showVimeoError)}
                >
                  Exportar SCORM
                </Button>
                <Button
                  variant="secondary"
                  disabled={!selectedVitrineId}
                  onClick={() => exportHtml().catch(showVimeoError)}
                >
                  Exportar HTML
                </Button>
                <Button
                  variant="secondary"
                  disabled={!selectedVitrineId}
                  onClick={() => loadIframe().catch(showVimeoError)}
                >
                  Gerar iframe
                </Button>
              </div>

              {exportResult ? (
                <div className="muted mt-md">
                  <div>
                    <strong>Pronto:</strong> {exportResult.kind}
                  </div>
                  <div>
                    Download:{" "}
                    <a href={exportResult.url} target="_blank" rel="noreferrer">
                      {exportResult.url}
                    </a>
                  </div>
                </div>
              ) : null}

              {iframeSnippet ? (
                <div className="field mt-md">
                  <label className="muted">iframe</label>
                  <textarea readOnly rows={4} value={iframeSnippet} />
                </div>
              ) : null}
            </Card>

            <Card plain className="card-padding">
              <div className="card-section-title">Adicionar vídeo</div>
              <div className="muted">
                Cole um ID, URL do Vimeo, e opcionalmente o hash do embed para privados.
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addVideo(e.currentTarget)
                    .then(() => toast.success("Vídeo adicionado"))
                    .catch((err) => toast.error(err.message));
                }}
              >
                <Field label="Vimeo Video ID">
                  <input name="vimeoVideoId" className="input" placeholder="123456789" />
                </Field>
                <Field label="ou URL">
                  <input name="url" className="input" placeholder="https://vimeo.com/123456789" />
                </Field>
                <Field label="Título (opcional)">
                  <input name="title" className="input" placeholder="Aula 01" />
                </Field>
                <Field label="Embed hash (opcional)">
                  <input name="embedHash" className="input" placeholder="abc123def" />
                </Field>
                <Button type="submit" disabled={!selectedVitrineId}>
                  Adicionar
                </Button>
              </form>
            </Card>

            <Card plain className="card-padding">
              <div className="card-section-title">Importar CSV (lote)</div>
              <div className="muted">
                Cabeçalho esperado: <code>vimeo_video_id,title,embed_hash</code> (ou <code>url</code> no lugar de{" "}
                <code>vimeo_video_id</code>)
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  importCsv(e.currentTarget)
                    .then(() => toast.success("Importação concluída"))
                    .catch((err) => toast.error(err.message));
                }}
              >
                <Field label="CSV">
                  <textarea
                    name="csv"
                    className="input"
                    rows={6}
                    placeholder={"vimeo_video_id,title,embed_hash\n123,Aula 1,\n456,Aula 2,abc123"}
                  />
                </Field>
                <Button type="submit" disabled={!selectedVitrineId}>
                  Importar
                </Button>
              </form>
            </Card>
          </div>
        </Card>
      </div>
    </div>
  );
}
