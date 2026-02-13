import React, { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { API_BASE } from "../api";
import { MENU_ITEMS } from "../routes";
import { Button, Input } from "../components/ui";

const WORKSPACE_KEY = "unicv_workspace";

export function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  const [workspace, setWorkspace] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem(WORKSPACE_KEY) || "" : "")
  );

  const topLevel = MENU_ITEMS.filter((m) => !m.parentLabel);
  const adminItems = MENU_ITEMS.filter((m) => m.parentLabel === "Admin");

  const saveWorkspace = (v: string) => {
    setWorkspace(v);
    localStorage.setItem(WORKSPACE_KEY, v);
  };

  return (
    <div className="container">
      <header className="top header-section">
        <div>
          <div className="brand-title">UniCV Studio</div>
          <div className="muted" style={{ marginTop: 4 }}>
            API: <code>{API_BASE}</code>
            {workspace ? ` · Workspace: ${workspace}` : ""}
          </div>
        </div>
        <nav className="nav-row">
          {topLevel.map((item) => (
            <Link key={item.path} to={item.path} className="nav-item">
              {item.label}
            </Link>
          ))}
          {adminItems.length > 0 && (
            <span className="nav-row gap-sm">
              <span className="muted section-title" style={{ margin: 0 }}>Admin</span>
              {adminItems.map((item) => (
                <Link key={item.path} to={item.path} className="nav-item">
                  {item.label}
                </Link>
              ))}
            </span>
          )}
          <Input
            placeholder="Workspace (opcional)"
            value={workspace}
            onChange={(v) => saveWorkspace(v)}
            className="input-workspace"
          />
          <Button variant="secondary" onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
            {theme === "dark" ? "☀️" : "🌙"}
          </Button>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
