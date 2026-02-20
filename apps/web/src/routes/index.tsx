import React from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { getAuthToken } from "../api";
import { AppLayout } from "../layouts/AppLayout";
import { LoginPage } from "../pages/login/LoginPage";
import { HomePage } from "../pages/home/HomePage";
import { ConfigPage } from "../pages/admin/config/ConfigPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { ExportacoesPage } from "../pages/exportacoes/ExportacoesPage";
import { ToolsPage } from "../pages/tools/ToolsPage";
import { VitrineDetalhePage } from "../pages/vitrines/VitrineDetalhePage";

export type MenuItem = {
  path: string;
  label: string;
  parentLabel?: string;
};

export const MENU_ITEMS: MenuItem[] = [
  { path: "/", label: "Início" },
  { path: "/ferramentas", label: "Ferramentas" },
  { path: "/exportacoes", label: "Exportações" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/admin/config", label: "Configurações", parentLabel: "Admin" }
];

function ProtectedRoute() {
  const location = useLocation();
  if (!getAuthToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AppLayout />}>
        <Route index element={<LoginPage />} />
      </Route>
      <Route path="/" element={<AppLayout />}>
        <Route element={<ProtectedRoute />}>
          <Route index element={<HomePage />} />
          <Route path="vitrines/:id" element={<VitrineDetalhePage />} />
          <Route path="ferramentas" element={<ToolsPage />} />
          <Route path="exportacoes" element={<ExportacoesPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="admin/config" element={<ConfigPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
