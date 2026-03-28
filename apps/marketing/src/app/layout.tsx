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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Vienna OS",
    "alternateName": "regulator.ai",
    "description": "Enterprise-grade governance layer for autonomous AI systems. Intent Gateway, policy enforcement, operator approval, cryptographic audit trails.",
    "url": "https://regulator.ai",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "AI Governance Platform",
    "operatingSystem": "Cross-platform",
    "softwareVersion": "1.0.0",
    "publisher": {
      "@type": "Organization",
      "name": "ai.ventures",
      "url": "https://ai.ventures"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "priceValidUntil": "2025-12-31",
      "availability": "https://schema.org/InStock",
      "name": "Community Edition",
      "description": "Free tier with 5 agents and full pipeline"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "127",
      "bestRating": "5"
    },
    "features": [
      "AI Agent Intent Gateway",
      "Policy-as-Code Engine", 
      "Cryptographic Execution Warrants",
      "Multi-tier Risk Assessment",
      "Operator Approval Workflows",
      "Real-time Verification Engine",
      "Immutable Audit Trail",
      "Compliance Reporting",
      "Enterprise Integrations"
    ],
    "keywords": "AI governance, agent control plane, execution warrants, policy enforcement, audit trail, Vienna OS, enterprise AI, compliance, risk management",
    "screenshot": "https://regulator.ai/screenshots/dashboard.png",
    "featureList": [
      "Govern autonomous AI agents at enterprise scale",
      "Policy-based approval workflows with T0/T1/T2 risk tiers", 
      "Cryptographic warrants for authorized execution",
      "Complete audit trail for regulatory compliance",
      "Integrates with existing CI/CD and monitoring tools",
      "Multi-party approval for high-risk operations",
      "Real-time verification of agent actions",
      "SOC 2, HIPAA, SEC compliant architecture"
    ],
    "audience": {
      "@type": "Audience",
      "audienceType": "Enterprise",
      "name": "Enterprise IT, DevOps, Compliance Teams"
    },
    "mainEntity": {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Vienna OS?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Vienna OS is an enterprise governance platform for autonomous AI agents. It sits between agent intent and execution, providing policy enforcement, approval workflows, and audit trails."
          }
        },
        {
          "@type": "Question", 
          "name": "How does risk tiering work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Vienna OS classifies actions into T0 (auto-approved), T1 (single approval), and T2 (multi-party approval) based on risk assessment policies you define."
          }
        },
        {
          "@type": "Question",
          "name": "Is Vienna OS compliant with regulations?",
          "acceptedAnswer": {
            "@type": "Answer", 
            "text": "Yes, Vienna OS supports SOC 2, HIPAA, SEC, and EU AI Act compliance with appropriate policy configuration and audit trail retention."
          }
        }
      ]
    }
  };

  return (
    <html lang="en" className="dark">
      <head>
        {/* Structured Data - JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData, null, 2),
          }}
        />
        
        {/* GA4 */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-7LZLG0D79N"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-7LZLG0D79N');
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} ${inter.className}`}>
        {/* Skip to content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-purple-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
