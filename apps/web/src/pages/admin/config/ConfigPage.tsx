import React from "react";
import { configModules } from "./configModules";

export function ConfigPage() {
  const sorted = [...configModules].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="h" style={{ marginBottom: 16 }}>
        Configurações
      </div>
      <p className="muted" style={{ marginBottom: 20 }}>
        Status das integrações (Vimeo, LTI, LRS). Configure as variáveis no servidor (arquivo .env da API).
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sorted.map((m) => (
          <m.Component key={m.id} />
        ))}
      </div>
    </div>
  );
}
