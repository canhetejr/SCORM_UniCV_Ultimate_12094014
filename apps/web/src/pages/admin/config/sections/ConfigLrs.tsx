import React from "react";
import { useConfigStatus } from "../../../../hooks/useConfigStatus";

export function ConfigLrs() {
  const { data: configStatus, loading } = useConfigStatus();
  const configured = configStatus?.lrs?.configured ?? false;

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="h" style={{ fontSize: 16, marginBottom: 8 }}>
        LRS (xAPI)
      </div>
      {loading ? (
        <p className="muted">Carregando...</p>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <span className="pill">
              <strong>Status</strong>
              <span>{configured ? "configurado" : "não configurado"}</span>
            </span>
          </div>
          <p className="muted">
            Variáveis no servidor: <code>LRS_ENDPOINT</code> (URL do LRS), <code>LRS_BASIC_AUTH</code> (opcional, base64 ou user:pass).
          </p>
        </>
      )}
    </div>
  );
}
