import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>
        {children}
      </main>
    </div>
  );
}
