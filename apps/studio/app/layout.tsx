import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniCV Studio",
  description: "Plataforma de gestão de vitrines e exportação SCORM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
