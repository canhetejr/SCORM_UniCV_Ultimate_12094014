import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import {
  getDashboardSummary,
  sendDashboardEvent,
  type DashboardSummary,
  type DashboardFilters
} from "../../api";
import { Button, Card, Input, Field } from "../../components/ui";

const POLL_INTERVAL_MS = 15000;
const CHART_COLORS = [
  "var(--unicv, #5c9a40)",
  "var(--info, #0d9488)",
  "var(--warning, #fbbf24)",
  "var(--success, #10b981)",
  "#8b5cf6",
  "#ec4899"
];

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    days: 30,
    type: "",
    source: ""
  });
  const [testType, setTestType] = useState("test_event");
  const [testSource, setTestSource] = useState("studio");
  const [testPayload, setTestPayload] = useState("");
  const [sending, setSending] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardSummary(filters);
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }, [filters.days, filters.type, filters.source]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [autoRefresh, load]);

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
  const chartByDay = data.byDay.map((d) => ({
    date: new Date(d.date + "Z").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short"
    }),
    eventos: d.count,
    full: d.date
  }));
  const chartByType = data.byType.map((d) => ({
    name: d.type,
    value: d.count
  }));

  return (
    <>
      <div className="top flex flex-wrap gap-md items-center">
        <h1 className="section-title" style={{ margin: 0 }}>
          Dashboard
        </h1>
        <div className="flex gap-sm items-center flex-wrap">
          <label className="muted">
            Período:
            <select
              className="input"
              value={filters.days ?? 30}
              onChange={(e) =>
                setFilters((f) => ({ ...f, days: Number(e.target.value) }))
              }
              style={{ marginLeft: 8, width: "auto" }}
            >
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </label>
          <label className="muted">
            Tipo:
            <select
              className="input"
              value={filters.type ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, type: e.target.value }))
              }
              style={{ marginLeft: 8, width: "auto", minWidth: 140 }}
            >
              <option value="">Todos</option>
              {(data.filterTypes ?? data.byType.map((x) => x.type)).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="muted">
            Origem:
            <select
              className="input"
              value={filters.source ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, source: e.target.value }))
              }
              style={{ marginLeft: 8, width: "auto", minWidth: 120 }}
            >
              <option value="">Todas</option>
              {(data.filterSources ?? data.bySource?.map((x) => x.source) ?? []).map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-sm" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: "var(--unicv)" }}
            />
            <span className="muted" style={{ fontSize: 12 }}>
              Atualizar a cada 15s
            </span>
          </label>
          <Button variant="secondary" onClick={load}>
            Atualizar
          </Button>
        </div>
      </div>

      <p className="muted mb-lg">
        Eventos coletados e salvos no banco. Filtros aplicam em tempo real. Use o formulário
        abaixo para enviar um evento de teste ou integre{" "}
        <code>POST /v1/dashboard/events</code> no player/outros clientes.
      </p>

      {/* Cards de resumo */}
      <div className="row">
        <Card plain className="card-padding">
          <div className="card-section-title">Resumo</div>
          <div className="flex flex-wrap gap-xl">
            <div>
              <div className="muted" style={{ fontSize: 12 }}>
                Total de eventos
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{data.total}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>
                Período
              </div>
              <div style={{ fontSize: 16 }}>{data.days} dias</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>
                Desde
              </div>
              <div style={{ fontSize: 14 }}>
                {new Date(data.since).toLocaleDateString("pt-BR")}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="row mt-lg">
        <Card plain className="card-padding" style={{ flex: "1 1 60%" }}>
          <div className="card-section-title">Eventos por dia</div>
          {chartByDay.length > 0 ? (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartByDay}>
                  <defs>
                    <linearGradient id="colorEventos" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--unicv, #5c9a40)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--unicv, #5c9a40)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-muted)"
                    fontSize={11}
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)"
                    }}
                    labelStyle={{ color: "var(--text)" }}
                    formatter={(value: number) => [value, "Eventos"]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.full
                        ? new Date(payload[0].payload.full + "Z").toLocaleDateString(
                            "pt-BR",
                            { dateStyle: "full" }
                          )
                        : ""
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="eventos"
                    stroke="var(--unicv, #5c9a40)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEventos)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted">Nenhum dado por dia no período.</p>
          )}
        </Card>
        <Card plain className="card-padding" style={{ flex: "1 1 35%" }}>
          <div className="card-section-title">Por tipo</div>
          {chartByType.length > 0 ? (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ stroke: "var(--border)" }}
                  >
                    {chartByType.map((_, index) => (
                      <Cell
                        key={index}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)"
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted">Nenhum evento por tipo no período.</p>
          )}
        </Card>
      </div>

      {/* Gráfico de barras por tipo (alternativo) */}
      {chartByType.length > 0 && (
        <div className="row mt-lg">
          <Card plain className="card-padding" style={{ flex: 1 }}>
            <div className="card-section-title">Distribuição por tipo (barras)</div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartByType} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tick={{ fill: "var(--text)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)"
                    }}
                  />
                  <Bar dataKey="value" name="Eventos" fill="var(--unicv, #5c9a40)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

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
              <Input
                placeholder="ex: studio, player, api"
                value={testSource}
                onChange={(v) => setTestSource(v)}
              />
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
                      <td>
                        <code>{e.type}</code>
                      </td>
                      <td>{e.source ?? "—"}</td>
                      <td
                        className="muted"
                        style={{
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
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
