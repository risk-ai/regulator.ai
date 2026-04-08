import { Shield, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Vienna OS release history and product updates - tracking the evolution of the governance kernel for autonomous AI and warrants-based governance.",
};

const releases = [
  {
    version: "0.9.0",
    date: "March 27, 2026",
    tag: "Launch Candidate",
    tagColor: "bg-gold-400/20 text-gold-400 border-gold-400/30",
    changes: [
      { type: "feat", text: "Interactive /try demo with warrant simulator" },
      { type: "feat", text: "3 framework integration examples (LangChain, CrewAI, AutoGen)" },
      { type: "feat", text: "Email onboarding drip sequence (4 automated emails)" },
      { type: "feat", text: "GA4 conversion funnel tracking" },
      { type: "improved", text: "Mobile-responsive across all pages" },
      { type: "feat", text: "GitHub launch-ready (issue templates, security policy, PR template)" },
      { type: "feat", text: "3 technical blog posts published" },
      { type: "docs", text: "Comprehensive FAQ with 10 common questions" },
      { type: "docs", text: "Step-by-step integration guide with code samples" },
      { type: "feat", text: "OpenGraph social cards for all key pages" },
      { type: "improved", text: "Enhanced sitemap with complete page discovery" },
    ],
  },
  {
    version: "0.8.0",
    date: "March 26, 2026",
    tag: "Production Hardening",
    tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    changes: [
      { type: "feat", text: "Postgres migration (multi-tenant, row-level security)" },
      { type: "feat", text: "JWT auth + refresh tokens (15min/7day TTL)" },
      { type: "feat", text: "API key auth with scopes + rate limiting" },
      { type: "feat", text: "SSE real-time push (15 event types, 30s heartbeat)" },
      { type: "feat", text: "Policy versioning + evaluation caching + conflict detection" },
      { type: "docs", text: "5 SOC 2 compliance policies" },
      { type: "feat", text: "SDK build verification (TypeScript + Python)" },
      { type: "feat", text: "HMAC-SHA256 warrant signatures with tamper detection" },
      { type: "feat", text: "Agent anomaly detection — velocity, scope, error patterns" },
      { type: "feat", text: "Chaos/red team simulation for policy validation" },
    ],
  },
  {
    version: "0.7.0",
    date: "March 25, 2026",
    tag: "Console & SDKs",
    tagColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    changes: [
      { type: "feat", text: "Console UI (16 pages, dark navy theme)" },
      { type: "feat", text: "TypeScript SDK (@vienna-os/sdk)" },
      { type: "feat", text: "Python SDK (vienna-os)" },
      { type: "docs", text: "OpenAPI 3.1 specification" },
      { type: "feat", text: "Vercel serverless deployment" },
      { type: "feat", text: "Visual Policy Builder with IF/THEN conditions" },
      { type: "feat", text: "Agent Fleet Dashboard with real-time monitoring" },
      { type: "feat", text: "Multi-tenant auth with operator registration" },
      { type: "feat", text: "Slack/Email/GitHub adapters for workflow integration" },
      { type: "feat", text: "BSL 1.1 license + source-available preparation" },
    ],
  },
  {
    version: "0.6.0",
    date: "March 24, 2026",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feat", text: "Marketing site rebrand to Vienna OS" },
      { type: "feat", text: "Agent Intent Layer — Phase 1 production deployment" },
      { type: "feat", text: "Monolithic deployment (frontend + backend) on Fly.io" },
      { type: "feat", text: "Stripe checkout integration (Team/Business plans)" },
      { type: "feat", text: "Interactive 'Try it Live' playground" },
      { type: "improved", text: "Auth schema compatibility improvements" },
      { type: "feat", text: "Rate limiting and security headers" },
      { type: "feat", text: "Error boundaries and toast notifications" },
    ],
  },
  {
    version: "0.5.0",
    date: "March 14, 2026",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feat", text: "Initial Vienna OS governance architecture" },
      { type: "feat", text: "Core pipeline: Intent → Policy → Warrant → Execute → Verify" },
      { type: "feat", text: "State Graph with SQLite (15 tables)" },
      { type: "feat", text: "Operator console with dashboard, approvals, history" },
      { type: "feat", text: "5 governance engines: Policy, Verification, Watchdog, Reconciliation, Circuit Breaker" },
      { type: "feat", text: "Regulator.ai domain + Vercel deployment" },
      { type: "feat", text: "Neon DB schema (regulator schema)" },
    ],
  },
];

const typeColors: Record<string, { bg: string; text: string; label: string }> = {
  feat: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "NEW" },
  fix: { bg: "bg-blue-500/10", text: "text-blue-400", label: "FIXED" },
  docs: { bg: "bg-gold-400/10", text: "text-gold-300", label: "DOCS" },
  improved: { bg: "bg-gold-400/10", text: "text-gold-400", label: "IMPROVED" },
  breaking: { bg: "bg-red-500/10", text: "text-red-400", label: "BREAKING" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-7 h-7 text-gold-400" />
            <span className="font-bold text-white">Vienna<span className="bg-gradient-to-r from-gold-400 to-cyan-400 bg-clip-text text-transparent">OS</span></span>
          </a>
          <a href="/signup" className="text-sm bg-gold-400/20 text-gold-400 hover:bg-gold-400/30 px-4 py-2 rounded-lg transition font-medium">
            Get Started
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Changelog</h1>
        <p className="text-slate-400 mb-12">
          Product updates, new features, and improvements to Vienna OS.
        </p>

        <div className="space-y-12">
          {releases.map((release) => (
            <div key={release.version} className="relative">
              {/* Version header */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-white font-mono">
                  v{release.version}
                </h2>
                {release.tag && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${release.tagColor}`}>
                    {release.tag}
                  </span>
                )}
                <span className="text-sm text-slate-600">{release.date}</span>
              </div>

              {/* Changes */}
              <div className="space-y-2 pl-4 border-l-2 border-navy-700">
                {release.changes.map((change, i) => {
                  const style = typeColors[change.type] || typeColors.feat;
                  return (
                    <div key={i} className="flex items-start gap-3 py-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text} shrink-0 mt-0.5`}>
                        {style.label}
                      </span>
                      <span className="text-sm text-slate-300">{change.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-navy-700 py-8 mt-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <span className="text-xs text-slate-600">© 2026 Technetwork 2 LLC dba ai.ventures. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
