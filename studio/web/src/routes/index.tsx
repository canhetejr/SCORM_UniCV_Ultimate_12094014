import React from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { HomePage } from "../pages/home/HomePage";
import { ConfigPage } from "../pages/admin/config/ConfigPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";

export type MenuItem = {
  path: string;
  label: string;
  parentLabel?: string;
};

export const MENU_ITEMS: MenuItem[] = [
  { path: "/", label: "Início" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/admin/config", label: "Configurações", parentLabel: "Admin" }
];

const ROUTE_ELEMENTS: Record<string, React.ReactNode> = {
  "/": <HomePage />,
  "/dashboard": <DashboardPage />,
  "/admin/config": <ConfigPage />
};

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={ROUTE_ELEMENTS["/"]} />
        <Route path="dashboard" element={ROUTE_ELEMENTS["/dashboard"]} />
        <Route path="admin/config" element={ROUTE_ELEMENTS["/admin/config"]} />
      </Route>
    </Routes>
  );
}
