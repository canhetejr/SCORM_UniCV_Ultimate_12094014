import React from "react";
import { ToolCard } from "../../components/tools/ToolCard";

const VITRINES_TOOLS = [
  "Criar vitrine",
  "Listar vitrines",
  "Atualizar vitrine",
  "Deletar vitrine",
  "Exportar JSON",
  "Importar JSON",
  "Duplicar vitrine"
];

const VIDEOS_TOOLS = [
  "Listar videos da vitrine",
  "Adicionar video",
  "Remover video",
  "Reordenar videos",
  "Atualizar thumbnail",
  "Gerar embed",
  "Alterar privacidade"
];

const INTEGRACOES_TOOLS = [
  "Webhooks Vimeo",
  "Token Vimeo",
  "Testar conexao API",
  "Logs de requisicao"
];

function ToolsSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h3>
      <div
        style={{
          display: "grid",
          gap: "12px",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))"
        }}
      >
        {items.map((item) => (
          <ToolCard key={item} title={item} description="Estrutura visual inicial." />
        ))}
      </div>
    </section>
  );
}

export function ToolsPage() {
  return (
    <div className="page-tools">
      <div className="card card-padding">
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Ferramentas</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Catalogo de ferramentas do Studio. Nesta etapa, os cards sao apenas visuais.
        </p>

        <ToolsSection title="Vitrines" items={VITRINES_TOOLS} />
        <ToolsSection title="Videos" items={VIDEOS_TOOLS} />
        <ToolsSection title="Integracoes" items={INTEGRACOES_TOOLS} />
      </div>
    </div>
  );
}
