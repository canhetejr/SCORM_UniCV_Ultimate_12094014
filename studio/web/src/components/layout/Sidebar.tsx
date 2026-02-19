import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { getAuthToken, clearAuthToken } from "../../api";
import { MENU_ITEMS } from "../../routes";
import type { MenuItem } from "../../routes";
import { ThemeToggle } from "../ui";

const SIDEBAR_KEY = "unicv_sidebar_collapsed";
const SIDEBAR_MOBILE_KEY = "unicv_sidebar_mobile_open";

export type SidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  workspace?: string;
  onWorkspaceChange?: (v: string) => void;
};

const icons: Record<string, React.ReactNode> = {
  "/": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  "/exportacoes": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  "/ferramentas": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.2-3.2a6 6 0 0 1-7.8 7.8l-5.9 5.9a2 2 0 1 1-2.8-2.8l5.9-5.9a6 6 0 0 1 7.8-7.8z" />
    </svg>
  ),
  "/dashboard": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  "/admin/config": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
};

function getIcon(path: string, parent?: string): React.ReactNode {
  if (path === "/" && !parent) return icons["/"];
  return icons[path] ?? icons["/"];
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onToggleMobile,
  workspace = "",
  onWorkspaceChange
}: SidebarProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const topLevel = MENU_ITEMS.filter((m) => !m.parentLabel);
  const adminItems = MENU_ITEMS.filter((m) => m.parentLabel === "Admin");

  const handleLogout = () => {
    clearAuthToken();
    window.location.href = "/login";
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const closeMobile = () => onToggleMobile();

  return (
    <>
      <div
        className={`sidebar-overlay ${mobileOpen ? "sidebar-overlay-visible" : ""}`}
        onClick={closeMobile}
        aria-hidden
      />
      <aside
        className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-mobile-open" : ""}`}
        aria-label="Menu principal"
      >
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => {
                onToggleCollapse();
                if (mobileOpen) closeMobile();
              }}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              )}
            </button>
          </div>

          {!collapsed && onWorkspaceChange && (
            <div className="sidebar-workspace">
              <label className="sidebar-label">Workspace</label>
              <input
                type="text"
                className="sidebar-input"
                placeholder="Opcional"
                value={workspace}
                onChange={(e) => onWorkspaceChange(e.target.value)}
              />
            </div>
          )}

          <nav className="sidebar-nav">
            {topLevel.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive(item.path) ? "active" : ""}`}
                onClick={closeMobile}
                title={item.label}
              >
                <span className="sidebar-item-icon">{getIcon(item.path)}</span>
                {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
              </Link>
            ))}
            {adminItems.length > 0 && !collapsed && (
              <div className="sidebar-group">
                <span className="sidebar-group-title">Admin</span>
              </div>
            )}
            {adminItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive(item.path) ? "active" : ""}`}
                onClick={closeMobile}
                title={item.label}
              >
                <span className="sidebar-item-icon">{getIcon(item.path)}</span>
                {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
              </Link>
            ))}
            {getAuthToken() && (
              <button
                type="button"
                className="sidebar-item sidebar-item-logout"
                onClick={handleLogout}
                title="Sair"
              >
                <span className="sidebar-item-icon">{icons.logout}</span>
                {!collapsed && <span className="sidebar-item-label">Sair</span>}
              </button>
            )}
          </nav>

          <div className="sidebar-footer">
            <div className={`sidebar-theme ${collapsed ? "sidebar-theme-collapsed" : ""}`}>
              <ThemeToggle
                theme={theme}
                onClick={toggleTheme}
                title={theme === "dark" ? "Modo claro" : "Modo escuro"}
                className="sidebar-theme-btn"
              />
              {!collapsed && (
                <span className="sidebar-theme-label">{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
