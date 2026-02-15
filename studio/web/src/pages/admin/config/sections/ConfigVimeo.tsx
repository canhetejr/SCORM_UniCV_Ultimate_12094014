import React from "react";
import { apiGet, getVimeoOAuthStartUrl } from "../../../../api";
import { useConfigStatus } from "../../../../hooks/useConfigStatus";
import { Button } from "../../../../components/ui/Button";
import { useToast } from "../../../../hooks/useToast";
import { ToastContainer } from "../../../../components/ui/ToastContainer";

export function ConfigVimeo() {
  const { data: configStatus, loading, refresh } = useConfigStatus();
  const toast = useToast();
  const [vimeoStatus, setVimeoStatus] = React.useState<{
    connected: boolean;
    configured?: boolean;
    vimeoUserId?: string | null;
  } | null>(null);

  React.useEffect(() => {
    apiGet<{ connected: boolean; configured?: boolean; vimeoUserId?: string | null }>("/v1/vimeo/status")
      .then(setVimeoStatus)
      .catch(() => setVimeoStatus({ connected: false }));
  }, [configStatus?.vimeo?.configured]);

  const configured = configStatus?.vimeo?.configured ?? false;
  const connected = vimeoStatus?.connected ?? false;

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
    </>
  );
}
