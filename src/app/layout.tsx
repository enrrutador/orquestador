import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orquestador",
  description: "Plataforma inteligente para administrar múltiples Páginas de Facebook mediante IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}