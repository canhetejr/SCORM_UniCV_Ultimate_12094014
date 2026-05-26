"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Vitrines", icon: "▦" },
  { href: "/exportacoes", label: "Exportações", icon: "↓" },
  { href: "/ferramentas", label: "Ferramentas", icon: "⚙" },
  { href: "/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/admin/config", label: "Config", icon: "⚛" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside style={{
      width: 220, minHeight: "100vh", background: "var(--bg-card)",
      borderRight: "1px solid var(--border)", display: "flex",
      flexDirection: "column", padding: "20px 0",
    }}>
      <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>UniCV</div>
        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>Studio</div>
      </div>

      <nav style={{ flex: 1, padding: "16px 8px" }}>
        {NAV.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 7, marginBottom: 2,
                background: active ? "#6366f120" : "transparent",
                color: active ? "var(--accent)" : "var(--text-muted)",
                fontWeight: active ? 600 : 400,
                transition: "background 0.1s, color 0.1s",
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "16px 8px", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 7, width: "100%",
            background: "transparent", border: "none",
            color: "var(--text-muted)", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>⏻</span>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
