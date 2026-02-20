import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginAdmin, setAuthToken, getConfigStatus } from "../../api";
import { Button, Input, Field, Card } from "../../components/ui";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ vimeo?: { configured: boolean }; lti?: object; lrs?: object } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  React.useEffect(() => {
    getConfigStatus()
      .then((s) => setConfigStatus(s))
      .catch(() => setConfigStatus(null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Preencha utilizador e palavra-passe.");
      return;
    }
    setLoading(true);
    try {
      const { token } = await loginAdmin(username.trim(), password);
      setAuthToken(token);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message.includes("invalid_credentials") ? "Utilizador ou palavra-passe incorretos." : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-section" style={{ maxWidth: 400, margin: "2rem auto" }}>
      <Card>
        <h2 style={{ marginTop: 0 }}>UniCV Studio — Login</h2>
        <p className="muted">
          Utilize as credenciais definidas em <code>ADMIN_USER</code> e <code>ADMIN_PASSWORD</code> no .env do servidor.
        </p>
        <form onSubmit={handleSubmit}>
          <Field label="Utilizador">
            <Input
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="ADMIN_USER"
              autoComplete="username"
              disabled={loading}
            />
          </Field>
          <Field label="Palavra-passe">
            <Input
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="ADMIN_PASSWORD"
              autoComplete="current-password"
              disabled={loading}
            />
          </Field>
          {error && (
            <p role="alert" style={{ color: "var(--color-error, #c00)", marginBottom: 12 }}>
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "A entrar…" : "Entrar"}
          </Button>
        </form>
      </Card>
      {configStatus && (
        <p className="muted" style={{ marginTop: 16, fontSize: "0.9rem" }}>
          Estado: Vimeo {configStatus.vimeo?.configured ? "configurado" : "não configurado"}.
        </p>
      )}
    </div>
  );
}
