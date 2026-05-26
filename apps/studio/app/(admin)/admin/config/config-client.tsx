"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span style={{
      fontSize: 11, padding: "3px 8px", borderRadius: 20,
      background: ok ? "#22c55e20" : "#94a3b820",
      color: ok ? "#22c55e" : "#94a3b8",
    }}>
      {ok ? "Configurado" : "Não configurado"}
    </span>
  );
}

function VimeoNotice() {
  const sp = useSearchParams();
  const status = sp.get("vimeo");
  if (!status) return null;
  const isOk = status === "connected";
  return (
    <div style={{
      background: isOk ? "#22c55e1a" : "#ef44441a",
      border: `1px solid ${isOk ? "#22c55e40" : "#ef444440"}`,
      borderRadius: 8, padding: "10px 14px", color: isOk ? "#22c55e" : "#ef4444",
      marginBottom: 20,
    }}>
      {isOk ? "Vimeo conectado com sucesso!" : `Erro ao conectar Vimeo (${status}).`}
    </div>
  );
}

interface Props {
  vimeoConnected: boolean;
  vimeoUserId: string | null;
  ltiConfigured: boolean;
  lrsConfigured: boolean;
}

export default function ConfigClient({ vimeoConnected, vimeoUserId, ltiConfigured, lrsConfigured }: Props) {
  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Configurações</h1>

      <Suspense fallback={null}>
        <VimeoNotice />
      </Suspense>

      {/* Vimeo */}
      <section style={{ marginBottom: 28 }}>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Vimeo</h2>
            <StatusBadge ok={vimeoConnected} />
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 16px" }}>
            Conecte sua conta Vimeo para importar showcases e buscar metadados.
            {vimeoUserId && <span style={{ marginLeft: 8 }}>User ID: <code>{vimeoUserId}</code></span>}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href="/api/auth/vimeo/start"
              style={{
                background: "var(--accent)", color: "#fff", borderRadius: 6,
                padding: "8px 16px", fontWeight: 600, fontSize: 13,
              }}
            >
              {vimeoConnected ? "Reconectar Vimeo" : "Conectar Vimeo"}
            </a>
            {vimeoConnected && (
              <button
                onClick={async () => {
                  await fetch("/api/vimeo/disconnect", { method: "POST" });
                  window.location.reload();
                }}
                style={{
                  background: "transparent", border: "1px solid #ef444440",
                  borderRadius: 6, padding: "8px 16px", color: "var(--danger)", cursor: "pointer", fontSize: 13,
                }}
              >
                Desconectar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* LTI */}
      <section style={{ marginBottom: 28 }}>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>LTI 1.3</h2>
            <StatusBadge ok={ltiConfigured} />
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 12px" }}>
            Configure as variáveis de ambiente <code>LTI_PLATFORM_*</code> para habilitar integração LMS.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "JWKS", href: "/api/lti/.well-known/jwks.json" },
              { label: "Config", href: "/api/lti/config" },
              { label: "Launch URL", href: "/api/lti/launch" },
            ].map(({ label, href }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer"
                style={{ color: "var(--accent)", fontSize: 13, textDecoration: "underline" }}>
                {label} ↗
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* LRS */}
      <section>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>xAPI / LRS</h2>
            <StatusBadge ok={lrsConfigured} />
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
            Configure <code>LRS_ENDPOINT</code> e <code>LRS_BASIC_AUTH</code> para encaminhar statements xAPI.
          </p>
        </div>
      </section>
    </div>
  );
}
