import { Shield, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Vienna OS release history and product updates.",
};

const releases = [
  {
    version: "0.11.0",
    date: "March 26, 2026",
    tag: "Latest",
    tagColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    changes: [
      { type: "feat", text: "T3 multi-party warrants — 2+ approvers, mandatory justification + rollback plan" },
      { type: "feat", text: "HMAC-SHA256 warrant signatures with tamper detection" },
      { type: "feat", text: "JWT authentication with refresh tokens (15min/7day TTL)" },
      { type: "feat", text: "SSO/OIDC — Google Workspace, Okta, Azure AD, Auth0 with JIT provisioning" },
      { type: "feat", text: "RBAC — admin/operator/viewer/agent roles with 30+ permissions" },
      { type: "feat", text: "Real-time SSE event stream — 15 event types with tenant filtering" },
      { type: "feat", text: "AI-powered policy suggestions — 6 pattern detectors analyzing agent behavior" },
      { type: "feat", text: "Natural language policy creation — describe rules in plain English" },
      { type: "feat", text: "Agent anomaly detection — velocity, scope, error, time, pattern break" },
      { type: "feat", text: "Chaos/red team simulation — 6 adversarial scenarios for policy validation" },
      { type: "feat", text: "TypeScript SDK — 6 modules, framework wrappers, npm publish ready" },
      { type: "feat", text: "Python SDK — zero-dependency, framework adapters, PyPI ready" },
      { type: "feat", text: "OpenClaw governance plugin — enforce/audit/dry-run modes" },
      { type: "feat", text: "Framework adapters — LangChain, CrewAI, AutoGen, Google ADK" },
      { type: "feat", text: "OpenAPI 3.1 specification — complete API documentation" },
      { type: "feat", text: "Terraform provider schema — IaC governance configuration" },
      { type: "feat", text: "Billing & usage metering — per-tenant tracking with plan limits" },
      { type: "feat", text: "Pricing page with 4 tiers (Community/Team/Business/Enterprise)" },
      { type: "feat", text: "Integration guide with code examples for 4 frameworks" },
      { type: "feat", text: "Case studies page — Financial Services, Healthcare, Legal, DevOps" },
      { type: "fix", text: "Console loading spinner — shows error state instead of infinite spin when backend down" },
      { type: "fix", text: "Fly.io deploy — resolved esbuild import path errors" },
      { type: "fix", text: "Server boot — no longer crashes on missing env vars (auto-generates)" },
      { type: "docs", text: "SOC 2 controls documentation — 95% Type I readiness" },
      { type: "docs", text: "Security hardening checklist + incident response template" },
      { type: "docs", text: "Provisional patent filed — USPTO Application #64/018,152" },
    ],
  },
  {
    version: "0.10.0",
    date: "March 25, 2026",
    tag: "",
    tagColor: "",
    changes: [
      { type: "feat", text: "Multi-tenant auth — individual operator registration with scrypt password hashing" },
      { type: "feat", text: "API key authentication — agents authenticate via Bearer vos_xxx tokens" },
      { type: "feat", text: "Visual Policy Builder — create governance rules with IF/THEN conditions" },
      { type: "feat", text: "Agent Fleet Dashboard — real-time view of all agents under governance" },
      { type: "feat", text: "Compliance Report Generator — one-click governance reports" },
      { type: "feat", text: "Custom Action Types — operators define their own governed actions" },
      { type: "feat", text: "TypeScript SDK (packages/sdk/) — 10 modules for programmatic integration" },
      { type: "feat", text: "Slack adapter — interactive approval buttons, execution notifications, violation alerts" },
      { type: "feat", text: "Email adapter — approval emails, execution results, daily governance digest" },
      { type: "feat", text: "GitHub adapter — governed deployments, PR status checks, audit comments" },
      { type: "feat", text: "Simulation service — dry-run executions through full governance pipeline" },
      { type: "feat", text: "Apache 2.0 license + CONTRIBUTING.md — open-source release prep" },
      { type: "feat", text: "Console expanded to 13 navigation sections" },
      { type: "fix", text: "SQLite-backed sessions — persist across Fly.io restarts" },
      { type: "fix", text: "Stripe webhook endpoint for subscription lifecycle events" },
    ],
  },
  {
    version: "0.9.0",
    date: "March 25, 2026 (morning)",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feat", text: "28-page marketing site built from scratch (regulator.ai)" },
      { type: "feat", text: "Interactive 'Try it Live' playground — test governance API without signup" },
      { type: "feat", text: "Stripe checkout for Team ($49/agent/mo) and Business ($99/agent/mo) plans" },
      { type: "feat", text: "Security page with compliance roadmap (SOC 2, HIPAA, FedRAMP)" },
      { type: "feat", text: "Blog with 4 thought leadership articles on AI governance" },
      { type: "feat", text: "First-run onboarding modal in console" },
      { type: "fix", text: "Dark theme login screen with Vienna OS branding" },
      { type: "fix", text: "Dashboard failure rate display (0/0 no longer shows 100%)" },
      { type: "feat", text: "Premier console UI — redesigned status bar, navigation, cards" },
      { type: "feat", text: "GA4 analytics (G-7LZLG0D79N)" },
      { type: "feat", text: "Resend email integration — welcome emails from hello@regulator.ai" },
    ],
  },
  {
    version: "0.8.0",
    date: "March 24, 2026",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feat", text: "Marketing site rebrand to Vienna OS" },
      { type: "feat", text: "Agent Intent Layer — Phase 1 deployed to production" },
      { type: "feat", text: "Monolithic deployment (frontend + backend) on Fly.io" },
      { type: "fix", text: "Auth schema: accept both string and object source formats" },
      { type: "fix", text: "IntentGateway StateGraph wiring" },
      { type: "feat", text: "10 new intent types added to Intent Gateway" },
      { type: "feat", text: "Rate limiting and security headers" },
      { type: "feat", text: "Error boundaries and toast notifications" },
    ],
  },
  {
    version: "0.7.0",
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
  fix: { bg: "bg-blue-500/10", text: "text-blue-400", label: "FIX" },
  breaking: { bg: "bg-red-500/10", text: "text-red-400", label: "BREAKING" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-6 h-6 text-purple-400" />
            <span className="font-bold text-white">Vienna<span className="text-purple-400">OS</span></span>
          </a>
          <a href="/signup" className="text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition font-medium">
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
          <span className="text-xs text-slate-600">© 2026 ai.ventures. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
