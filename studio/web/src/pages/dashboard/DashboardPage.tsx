import React, { useCallback, useEffect, useState } from "react";
import {
  getDashboardSummary,
  sendDashboardEvent,
  type DashboardSummary
} from "../../api";
import { Button, Card, Input, Field } from "../../components/ui";

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [testType, setTestType] = useState("test_event");
  const [testSource, setTestSource] = useState("studio");
  const [testPayload, setTestPayload] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardSummary(days);
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSendTestEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!testType.trim()) return;
    let payload: Record<string, unknown> | undefined;
    if (testPayload.trim()) {
      try {
        payload = JSON.parse(testPayload.trim()) as Record<string, unknown>;
      } catch {
        alert("Payload inválido: use JSON válido ou deixe em branco.");
        return;
      }
    }
    setSending(true);
    try {
      await sendDashboardEvent({
        type: testType.trim(),
        source: testSource.trim() || undefined,
        payload
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar evento.");
    } finally {
      setSending(false);
    }
  }

  if (loading && !summary) {
    return (
      <div className="top">
        <p className="muted">Carregando dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="top">
        <p className="muted" style={{ color: "var(--danger, #ef4444)" }}>
          {error}
        </p>
        <Button variant="secondary" onClick={load}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const data = summary!;

  return (
    <>
      <div className="top flex flex-wrap gap-md items-center">
        <h1 className="section-title" style={{ margin: 0 }}>
          Dashboard
        </h1>
        <div className="flex gap-sm items-center">
          <label className="muted">
            Período:
            <select
              className="input"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ marginLeft: 8, width: "auto" }}
            >
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </label>
          <Button variant="secondary" onClick={load}>
            Atualizar
          </Button>
        </div>
      </div>

      <p className="muted mb-lg">
        Eventos coletados e salvos no banco. Use o formulário abaixo para enviar um evento de teste ou integre
        <code style={{ marginLeft: 4 }}>POST /v1/dashboard/events</code> no player/outros clientes.
      </p>

      <div className="row">
        <Card plain className="card-padding">
          <div className="card-section-title">Resumo</div>
          <div className="flex flex-wrap gap-xl">
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Total de eventos</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{data.total}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Período</div>
              <div style={{ fontSize: 16 }}>{data.days} dias</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Desde</div>
              <div style={{ fontSize: 14 }}>{new Date(data.since).toLocaleDateString("pt-BR")}</div>
            </div>
          </div>
        </Card>

        <Card plain className="card-padding">
          <div className="card-section-title">Por tipo</div>
          {data.byType.length > 0 ? (
            <ul className="list-unstyled">
              {data.byType.map(({ type, count }) => (
                <li key={type} className="flex flex-between gap-md py-sm">
                  <code>{type}</code>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nenhum evento no período.</p>
          )}
        </Card>

        <Card plain className="card-padding">
          <div className="card-section-title">Por dia</div>
          {data.byDay.length > 0 ? (
            <ul className="list-unstyled" style={{ maxHeight: 240, overflowY: "auto" }}>
              {data.byDay.map(({ date, count }) => (
                <li key={date} className="flex flex-between gap-md py-sm">
                  <span>{new Date(date + "Z").toLocaleDateString("pt-BR")}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nenhum dado por dia.</p>
          )}
        </Card>
      </div>

      <div className="row mt-lg">
        <Card plain className="card-padding">
          <div className="card-section-title">Enviar evento (coleta)</div>
          <form onSubmit={handleSendTestEvent} className="form-row">
            <Field label="Tipo" className="field-flex-sm">
              <Input
                placeholder="ex: player_launch, export, vitrine_view"
                value={testType}
                onChange={(v) => setTestType(v)}
              />
            </Field>
            <Field label="Origem" className="field-flex-sm">
              <Input placeholder="ex: studio, player, api" value={testSource} onChange={(v) => setTestSource(v)} />
            </Field>
            <Field label="Payload (JSON opcional)" className="field-flex">
              <Input
                placeholder='{"vitrineId": "abc", "duration": 120}'
                value={testPayload}
                onChange={(v) => setTestPayload(v)}
              />
            </Field>
            <Button type="submit" disabled={sending || !testType.trim()}>
              {sending ? "Enviando…" : "Enviar evento"}
            </Button>
          </form>
        </Card>
      </div>

      <div className="row mt-lg">
        <Card plain className="card-padding">
          <div className="card-section-title">Últimos eventos (até 50)</div>
          {data.recent.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Tipo</th>
                    <th>Origem</th>
                    <th>Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((e) => (
                    <tr key={e.id}>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>
                        {new Date(e.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td><code>{e.type}</code></td>
                      <td>{e.source ?? "—"}</td>
                      <td className="muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.payload != null ? JSON.stringify(e.payload) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Nenhum evento recente.</p>
          )}
        </Card>
      </div>
    </>
  );
}
