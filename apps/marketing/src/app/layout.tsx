import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Regulator.AI — Governance Control Plane for Autonomous Agents",
  description:
    "Enterprise-grade governance for AI agent systems. Warrant-based execution authorization, policy enforcement, cryptographic audit trails.",
  openGraph: {
    title: "Regulator.AI",
    description: "Governance Control Plane for Autonomous Agent Systems",
    url: "https://regulator.ai",
    siteName: "Regulator.AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
