import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050508",
};

export const metadata: Metadata = {
  title: "Pulse OS · Comunidades Mini-Agentes",
  description: "Sistema Operativo de Comunidades de Mini-Agentes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-pulse-bg text-slate-200 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
