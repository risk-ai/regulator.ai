import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: {
    default: "Vienna OS — Governed AI Execution Layer",
    template: "%s | Vienna OS",
  },
  description:
    "Enterprise-grade governance layer for autonomous AI systems. Intent Gateway, policy enforcement, operator approval, cryptographic audit trails.",
  metadataBase: new URL("https://regulator.ai"),
  openGraph: {
    title: "Vienna OS — The control plane agents answer to",
    description:
      "Enterprise governance for AI agents. Policy enforcement, cryptographic warrants, operator approval workflows, and immutable audit trails.",
    url: "https://regulator.ai",
    siteName: "Vienna OS",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Vienna OS — Governed AI Execution Layer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vienna OS — The control plane agents answer to",
    description:
      "Enterprise governance for AI agents. Policy enforcement, cryptographic warrants, and immutable audit trails.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  keywords: [
    "AI governance",
    "AI agent governance",
    "agent control plane",
    "execution warrants",
    "AI compliance",
    "agent approval workflow",
    "policy enforcement",
    "audit trail",
    "Vienna OS",
    "enterprise AI",
    "AI risk management",
  ],
  authors: [{ name: "ai.ventures" }],
  creator: "ai.ventures",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* GA4 */}
        {process.env.NEXT_PUBLIC_GA4_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA4_ID}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} ${inter.className}`}>{children}</body>
    </html>
  );
}
