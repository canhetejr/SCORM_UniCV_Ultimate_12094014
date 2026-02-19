import React from "react";
import { apiGet, getVimeoOAuthStartUrl } from "../../../../api";
import { useConfigStatus } from "../../../../hooks/useConfigStatus";
import { useApiStatus } from "../../../../hooks/useApiStatus";
import { listCollaborators, createCollaborator, syncCollaborator, type VimeoCollaboratorItem } from "../../../../api/vimeoCollaborators";
import { Button } from "../../../../components/ui/Button";
import { useToast } from "../../../../hooks/useToast";
import { ToastContainer } from "../../../../components/ui/ToastContainer";

export function ConfigVimeo() {
  const { data: configStatus, loading, refresh } = useConfigStatus();
  const { status: apiStatus } = useApiStatus();
  const toast = useToast();
  const [vimeoStatus, setVimeoStatus] = React.useState<{
    connected: boolean;
    configured?: boolean;
    vimeoUserId?: string | null;
  } | null>(null);
  const [collaborators, setCollaborators] = React.useState<VimeoCollaboratorItem[]>([]);
  const [selectedCollabId, setSelectedCollabId] = React.useState<string>("");
  const [vimeoUserIdInput, setVimeoUserIdInput] = React.useState("");
  const [loadingCollaborators, setLoadingCollaborators] = React.useState(false);
  const [loadingAdd, setLoadingAdd] = React.useState(false);
  const [loadingSync, setLoadingSync] = React.useState(false);

  React.useEffect(() => {
    apiGet<{ connected: boolean; configured?: boolean; vimeoUserId?: string | null }>("/v1/vimeo/status")
      .then(setVimeoStatus)
      .catch(() => setVimeoStatus({ connected: false }));
  }, []);

  React.useEffect(() => {
    setLoadingCollaborators(true);
    listCollaborators()
      .then((res) => {
        setCollaborators(res.collaborators ?? []);
        setSelectedCollabId((prev) =>
          res.collaborators?.length && !prev ? res.collaborators[0].id : prev
        );
      })
      .catch((e) => toast.error(e?.message ?? "Erro ao carregar colaboradores."))
      .finally(() => setLoadingCollaborators(false));
  }, [toast]);

  const handleAddCollaborator = React.useCallback(async () => {
    const uid = vimeoUserIdInput.trim();
    if (!uid) {
      toast.warning("Informe o Vimeo User ID.");
      return;
    }
    setLoadingAdd(true);
    try {
      const res = await createCollaborator(uid);
      setCollaborators((prev) => {
        const list = prev.filter((c) => c.id !== res.collaborator.id);
        return [res.collaborator, ...list];
      });
      setSelectedCollabId(res.collaborator.id);
      toast.success("Colaborador salvo.");
    } catch (err) {
      toast.error((err as Error)?.message ?? "Erro ao adicionar colaborador.");
    } finally {
      setVimeoUserIdInput("");
      setLoadingAdd(false);
    }
  }, [vimeoUserIdInput, toast]);

  const handleSync = React.useCallback(async () => {
    if (!selectedCollabId) return;
    setLoadingSync(true);
    try {
      const res = await syncCollaborator(selectedCollabId);
      toast.success(
        `${res.showcasesUpserted} vitrine(s), ${res.videosUpserted} vídeo(s) atualizados.`
      );
      listCollaborators().then((r) => setCollaborators(r.collaborators ?? []));
    } catch (err) {
      toast.error((err as Error)?.message ?? "Erro ao sincronizar colaborador.");
    } finally {
      setLoadingSync(false);
    }
  }, [selectedCollabId, toast]);

  const configured = configStatus?.vimeo?.configured ?? false;
  const connected = vimeoStatus?.connected ?? false;
  const selectedCollab = collaborators.find((c) => c.id === selectedCollabId) ?? null;

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
      <div className="card" style={{ padding: 16 }}>
        <div className="h" style={{ fontSize: 16, marginBottom: 8 }}>
          Vimeo
        </div>
        {loading ? (
          <p className="muted">Carregando...</p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <span className="pill">
                <strong>Status</strong>
                <span>
                  {!configured ? "não configurado" : connected ? "conectado" : "desconectado"}
                </span>
                {connected && vimeoStatus?.vimeoUserId ? (
                  <span className="muted">user {vimeoStatus.vimeoUserId}</span>
                ) : null}
              </span>
              {apiStatus && (
                <span
                  className={`pill ${apiStatus.connected ? "connected" : "disconnected"}`}
                  title={
                    `URL: ${apiStatus.url}\n` +
                    `Último ping: ${
                      apiStatus.lastPingAt
                        ? new Date(apiStatus.lastPingAt).toLocaleString("pt-BR")
                        : "—"
                    }\n` +
                    `Latência: ${
                      apiStatus.latencyMs != null ? `${Math.round(apiStatus.latencyMs)} ms` : "—"
                    }`
                  }
                >
                  <strong>API:</strong>
                  <span>{apiStatus.connected ? "Conectado" : "Offline"}</span>
                </span>
              )}
              <Button variant="secondary" size="sm" onClick={() => refresh()}>
                Atualizar
              </Button>
            </div>
            {!configured ? (
              <p className="muted" style={{ color: "#fbbf24" }}>
                Configure no servidor (arquivo .env ou variáveis de ambiente):
              </p>
            ) : (
              <p className="muted">Variáveis definidas. Use o botão abaixo para conectar uma conta.</p>
            )}
            <ul className="muted" style={{ margin: "8px 0", paddingLeft: 20 }}>
              <li><code>VIMEO_CLIENT_ID</code> — ID do app em developer.vimeo.com</li>
              <li><code>VIMEO_CLIENT_SECRET</code> — segredo do app</li>
              <li><code>VIMEO_REDIRECT_URI</code> — opcional; padrão: BASE_URL + /auth/vimeo/callback</li>
            </ul>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {configured ? (
                <Button
                  onClick={() =>
                    getVimeoOAuthStartUrl()
                      .then((r) => (window.location.href = r.url))
                      .catch((e) => toast.error(e?.message ?? "Erro ao iniciar OAuth."))
                  }
                >
                  Conectar conta Vimeo
                </Button>
              ) : (
                <Button disabled title="Configure as variáveis no servidor">
                  Conectar conta
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => window.open("https://developer.vimeo.com/apps", "_blank")}
              >
                Criar app no Vimeo
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <div className="h" style={{ fontSize: 16, marginBottom: 8 }}>
          Colaboradores Vimeo
        </div>
        <p className="muted" style={{ marginBottom: 12 }}>
          Gerencie os colaboradores e o cache permanente de vitrines. A sincronização chama o Vimeo
          apenas no endpoint de sync; as listagens usam somente o banco.
        </p>
        <div className="flex gap-md items-center flex-wrap" style={{ marginBottom: 12 }}>
          <label className="flex items-center gap-sm">
            <span className="muted">Vimeo User ID</span>
            <input
              type="text"
              className="input"
              placeholder="ex: 82076795 ou user82076795"
              value={vimeoUserIdInput}
              onChange={(e) => setVimeoUserIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCollaborator()}
              style={{ minWidth: 200 }}
            />
          </label>
          <Button onClick={handleAddCollaborator} disabled={loadingAdd}>
            {loadingAdd ? "A adicionar…" : "Adicionar"}
          </Button>
        </div>
        <div className="flex gap-md items-center flex-wrap" style={{ marginBottom: 12 }}>
          <label className="flex items-center gap-sm">
            <span className="muted">Colaborador</span>
            <select
              className="input"
              value={selectedCollabId}
              onChange={(e) => setSelectedCollabId(e.target.value)}
              disabled={loadingCollaborators || !collaborators.length}
              style={{ minWidth: 220 }}
            >
              <option value="">— Selecionar —</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || c.vimeoUserId} ({c.showcaseCount} vitrines, {c.videoCount} vídeos)
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={!selectedCollabId || loadingSync}
          >
            {loadingSync ? "Sincronizando…" : "Sincronizar (tudo)"}
          </Button>
        </div>
        {selectedCollab && (
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Último sync:{" "}
            {selectedCollab.lastSyncAt
              ? new Date(selectedCollab.lastSyncAt).toLocaleString("pt-BR")
              : "—"}{" "}
            · {selectedCollab.showcaseCount} vitrines · {selectedCollab.videoCount} vídeos
          </p>
        )}
      </div>
    </>
  );
}
