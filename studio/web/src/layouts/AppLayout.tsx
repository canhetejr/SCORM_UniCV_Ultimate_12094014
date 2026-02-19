import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { getResolvedApiBase, getResolvedPublicBaseUrl, getLastFetchError } from "../api";

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

  const [, setPublicBaseVersion] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const apiBase = getResolvedApiBase();
    fetch(`${apiBase}/v1/config/status`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { urls?: { PUBLIC_BASE_URL?: string } } | null) => {
        if (data?.urls?.PUBLIC_BASE_URL) {
          window.__UNICV_PUBLIC_BASE_URL = data.urls.PUBLIC_BASE_URL;
          setPublicBaseVersion((n) => n + 1);
        }
      })
      .catch(() => {});
  }, []);

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
            {workspace && (
              <span className="top-bar-api muted">
                Workspace: {workspace}
              </span>
            )}
            {import.meta.env.DEV && (
              <details className="unicv-diagnostic" style={{ marginLeft: 8, fontSize: 11 }}>
                <summary>Diagnóstico</summary>
                <pre style={{ margin: 4, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  origin: {window.location.origin}
                  API_BASE: {getResolvedApiBase()}
                  PUBLIC_BASE: {getResolvedPublicBaseUrl()}
                  {getLastFetchError() ? `erro: ${getLastFetchError()}` : ""}
                </pre>
              </details>
            )}
          </div>
        </header>
        <main className="container container-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
