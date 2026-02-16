import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { API_BASE, getAuthToken } from "../api";

const WORKSPACE_KEY = "unicv_workspace";
const SIDEBAR_KEY = "unicv_sidebar_collapsed";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspace, setWorkspace] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem(WORKSPACE_KEY) || "" : "")
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const saveWorkspace = (v: string) => {
    setWorkspace(v);
    localStorage.setItem(WORKSPACE_KEY, v);
  };

  return (
    <>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((o) => !o)}
        workspace={workspace}
        onWorkspaceChange={saveWorkspace}
      />
      <div className={`main-with-sidebar ${sidebarCollapsed ? "main-sidebar-collapsed" : ""}`}>
        <header className="top-bar">
          <button
            type="button"
            className="top-bar-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            title="Abrir menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="top-bar-info">
            <span className="top-bar-api muted">
              API: <code>{API_BASE}</code>
              {workspace ? ` · ${workspace}` : ""}
            </span>
          </div>
        </header>
        <main className="container container-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
