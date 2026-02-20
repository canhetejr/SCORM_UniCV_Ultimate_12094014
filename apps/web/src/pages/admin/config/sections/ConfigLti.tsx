import React, { useEffect, useState } from "react";
import { getLtiConfig } from "../../../../api";
import { useConfigStatus } from "../../../../hooks/useConfigStatus";

export function ConfigLti() {
  const { data: configStatus, loading } = useConfigStatus();
  const [ltiConfig, setLtiConfig] = useState<{
    tool: {
      initiate_login_url: string;
      redirect_uris: string[];
      jwks_url: string;
      launch_url: string;
      player_url?: string;
    };
  } | null>(null);
  const [ltiError, setLtiError] = useState<string | null>(null);

  useEffect(() => {
    getLtiConfig()
      .then(setLtiConfig)
      .catch((err) => setLtiError(err instanceof Error ? err.message : String(err)));
  }, []);

  const platformOk = configStatus?.lti?.platformConfigured ?? false;
  const toolKeyOk = configStatus?.lti?.toolKeyConfigured ?? false;

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="h" style={{ fontSize: 16, marginBottom: 8 }}>
        LTI 1.3 (Moodle)
      </div>
      {loading ? (
        <p className="muted">Carregando...</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <span className="pill">
              <strong>Plataforma</strong>
              <span>{platformOk ? "configurada" : "não configurada"}</span>
            </span>
            <span className="pill">
              <strong>Chave do tool</strong>
              <span>{toolKeyOk ? "definida" : "não definida"}</span>
            </span>
          </div>
          <p className="muted" style={{ marginBottom: 10 }}>
            Variáveis no servidor: <code>LTI_PLATFORM_ISSUER</code>, <code>LTI_PLATFORM_CLIENT_ID</code>,{" "}
            <code>LTI_PLATFORM_AUTH_LOGIN_URL</code>, <code>LTI_PLATFORM_KEYSET_URL</code>,{" "}
            <code>LTI_PLATFORM_DEPLOYMENT_ID</code>. Tool: <code>LTI_TOOL_PRIVATE_KEY_PEM</code>,{" "}
            <code>LTI_TOOL_KID</code>.
          </p>
          {ltiError && (
            <p className="muted" style={{ color: "#f87171" }}>
              URLs do tool: {ltiError}
            </p>
          )}
          {ltiConfig?.tool && (
            <div className="card" style={{ padding: 12, marginTop: 10, background: "rgba(0,0,0,.2)" }}>
              <div className="muted" style={{ marginBottom: 8 }}>URLs para copiar no Moodle (External tool):</div>
              <div className="field">
                <label className="muted">Initiate login URL</label>
                <input readOnly value={ltiConfig.tool.initiate_login_url} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} />
              </div>
              <div className="field">
                <label className="muted">Redirect URI(s)</label>
                <input readOnly value={ltiConfig.tool.redirect_uris?.[0] ?? ""} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} />
              </div>
              <div className="field">
                <label className="muted">Public keyset URL</label>
                <input readOnly value={ltiConfig.tool.jwks_url} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} />
              </div>
              <div className="field">
                <label className="muted">Launch URL</label>
                <input readOnly value={ltiConfig.tool.launch_url} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} />
              </div>
              <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                No link/atividade, adicione custom parameter: <code>vitrine_id=&lt;ID_DA_VITRINE&gt;</code> (recomendado) ou{" "}
                <code>showcase_id=&lt;ID_DO_SHOWCASE&gt;</code>.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
