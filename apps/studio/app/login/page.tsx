"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Credenciais inválidas. Verifique e-mail e senha.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)",
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "40px 36px", width: "100%", maxWidth: 380,
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>UniCV</div>
          <div style={{ color: "var(--text-muted)", marginTop: 4 }}>Studio Admin</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, color: "var(--text-muted)", fontSize: 12 }}>
              E-MAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemplo.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, color: "var(--text-muted)", fontSize: 12 }}>
              SENHA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{
              background: "#ef44441a", border: "1px solid #ef444440",
              borderRadius: 6, padding: "10px 12px", color: "var(--danger)", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "var(--accent)", color: "#fff", border: "none",
              borderRadius: 8, padding: "12px", fontWeight: 600, fontSize: 14,
              opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
