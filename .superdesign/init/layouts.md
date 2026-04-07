# Layout Components

## Root Layout
**Path:** `src/app/layout.tsx`
**Type:** Server Component (Root Layout)
**Purpose:** Global layout wrapper with metadata, fonts, analytics, and structured data

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "../styles/design-system.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: {
    default: "Vienna OS — Governance Kernel for Autonomous AI",
    template: "%s | Vienna OS",
  },
  description:
    "The governance kernel that controls what autonomous AI can do. Warrants-based authorization with cryptographic execution authority, policy enforcement, and immutable audit trails for AI systems.",
  metadataBase: new URL("https://regulator.ai"),
  openGraph: {
    title: "Vienna OS — Governance Kernel for Autonomous AI",
    description:
      "The governance kernel that controls what autonomous AI can do. Warrants-based authorization with cryptographic execution authority.",
    url: "https://regulator.ai",
    siteName: "Vienna OS",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vienna OS — The Governance and Authorization Layer for AI Systems",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vienna OS — Governance Kernel for Autonomous AI",
    description:
      "The governance kernel that controls what autonomous AI can do. Warrants-based authorization with cryptographic execution authority.",
    images: ["/og-image.png"],
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
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
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
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "name": "Community Edition",
      "description": "Free tier with 5 agents and full pipeline"
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
    }
  };

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700,400&f[]=satoshi@700,500,400&display=swap" />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData, null, 2),
          }}
        />
        
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
              gtag('config', 'AW-18052030396');
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} ${inter.className}`}>
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
```

---

## Standard Page Layout Pattern

**Common Layout Pattern Used:** Sticky header + main content + footer

### Header Pattern
- **SiteNav** component (always sticky, z-50)
- Optional coordinate bar (UTC, grid info)
- Main content area
- **SiteFooter** at bottom

### Hero Section Pattern
```tsx
<section className="pt-20 pb-32 px-6 relative z-10">
  <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
    {/* Content */}
  </div>
</section>
```

### Container Pattern
```tsx
<div className="max-w-7xl mx-auto px-6">
  {/* Content with responsive padding */}
</div>
```

---

## Layout Components by Route

### Pricing Layout
**Path:** `src/app/pricing/layout.tsx`
**Children:** Pricing page with plan cards

### Docs Layout
**Path:** `src/app/docs/layout.tsx`
**Children:** Documentation pages with sidebar navigation

### Compare Layout
**Path:** `src/app/compare/layout.tsx`
**Children:** Comparison pages (vs competitors)

### Contact Layout
**Path:** `src/app/contact/layout.tsx`
**Children:** Contact form page

### Enterprise Layout
**Path:** `src/app/enterprise/layout.tsx`
**Children:** Enterprise features page

### Try Layout
**Path:** `src/app/try/layout.tsx`
**Children:** Trial signup page

### Blog Layout
**Path:** `src/app/blog/layout.tsx`
**Children:** Blog index and article pages

### Case Studies Layout
**Path:** `src/app/case-studies/layout.tsx`
**Children:** Case studies pages

### Integrations Layout
**Path:** `src/app/integrations/layout.tsx`
**Children:** Integrations page

### About Layout
**Path:** `src/app/about/layout.tsx`
**Children:** About page

### ROI Layout
**Path:** `src/app/roi/layout.tsx`
**Children:** ROI calculator page

### Signup Layout
**Path:** `src/app/signup/layout.tsx`
**Children:** Signup flow pages

### Status Layout
**Path:** `src/app/status/layout.tsx`
**Children:** Status page

### Demo Layout
**Path:** `src/app/demo/layout.tsx`
**Children:** Demo pages

---

## Global Layout Hierarchy

```
RootLayout (html, head, body)
└── Children (pages or nested layouts)
    ├── SiteNav (sticky header)
    ├── [Page Layout] (unique per page)
    │   ├── Hero Section (if applicable)
    │   ├── Content Sections
    │   └── CTA Sections
    └── SiteFooter (sticky bottom)
```

---

## Fixed Elements

### Header (Sticky Top)
- Position: `sticky top-0 z-50`
- Components: SiteNav + optional coordination bar
- Backdrop blur enabled

### Footer (Bottom)
- Position: Appended to page
- Component: SiteFooter
- Always visible with scrolling content

### Floating Elements
- **FloatingContact**: Fixed bottom-right (z-40)
- **ReadingProgressBar**: Fixed top (z-50)

---

## Responsive Breakpoints

Tailwind CSS breakpoints used:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

Common patterns:
- `hidden md:flex` - Hide on mobile, show on tablet+
- `grid md:grid-cols-2` - Single column mobile, 2 columns tablet+
- `px-6` - Padding on all screens

---

## Dark Mode Configuration

All layouts use `dark` class on `<html>` tag with:
- Background: `#09090b` (navy-950)
- Text: `#fafafa` (zinc-50)
- Accents: Purple (#8b5cf6), Amber (#fbbf24)

CSS variables defined in `globals.css`:
```css
body {
  background: #09090b;
  color: #fafafa;
  font-family: 'Satoshi', system-ui, -apple-system, sans-serif;
}
```
