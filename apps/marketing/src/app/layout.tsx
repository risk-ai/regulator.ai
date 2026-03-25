import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vienna OS — Governed AI Execution Layer",
  description:
    "Enterprise-grade governance layer for autonomous AI systems. Intent Gateway, policy enforcement, operator approval, cryptographic audit trails.",
  openGraph: {
    title: "Vienna OS",
    description: "Governed AI Execution Layer for Autonomous Systems",
    url: "https://regulator.ai",
    siteName: "Vienna OS",
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
