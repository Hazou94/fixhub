import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FixHub – Maintenance Hôtelière",
  description: "Plateforme intelligente de gestion des incidents hôteliers",
  manifest: "/manifest.json",
  themeColor: "#1a2744",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
