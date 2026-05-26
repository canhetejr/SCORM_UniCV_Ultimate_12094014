"use client";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "18px 20px",
    }}>
      <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

interface Props {
  byType: Record<string, number>;
  bySource: Record<string, number>;
  byDay: Record<string, number>;
  total: number;
  recent: { id: string; type: string; source: string | null; createdAt: string }[];
}

export default function DashboardClient({ byType, bySource, byDay, total, recent }: Props) {
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const days = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  const maxDay = Math.max(...days.map((d) => d[1]), 1);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="Eventos (30d)" value={total} />
        {topTypes.slice(0, 3).map(([type, count]) => (
          <StatCard key={type} label={type} value={count} />
        ))}
      </div>

      {days.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Eventos por dia (últimos 14 dias)</h2>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "20px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
              {days.map(([day, count]) => (
                <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: "100%", background: "var(--accent)",
                      borderRadius: "3px 3px 0 0",
                      height: `${Math.round((count / maxDay) * 100)}px`,
                      minHeight: count > 0 ? 4 : 0,
                    }}
                    title={`${day}: ${count}`}
                  />
                  <span style={{ fontSize: 10, color: "var(--text-muted)", transform: "rotate(-40deg)", whiteSpace: "nowrap" }}>
                    {day.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {topTypes.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Tipos de evento</h2>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, overflow: "hidden",
          }}>
            {topTypes.map(([type, count]) => (
              <div
                key={type}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 20px", borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ fontWeight: 500 }}>{type}</span>
                <span style={{
                  background: "#6366f120", color: "var(--accent)",
                  borderRadius: 20, padding: "2px 10px", fontSize: 13,
                }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Eventos recentes</h2>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {recent.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 20px", borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ flex: 1, fontWeight: 500 }}>{e.type}</span>
                {e.source && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{e.source}</span>}
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {new Date(e.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          Nenhum evento nos últimos 30 dias.
        </div>
      )}
    </div>
  );
}
