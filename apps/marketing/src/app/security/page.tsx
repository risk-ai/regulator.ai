import Image from "next/image";
import {
  Shield,
  ArrowLeft,
  Lock,
  Eye,
  FileCheck,
  Server,
  Users,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Vienna OS security architecture: encryption, tenant isolation, cryptographic warrants, audit trails, and compliance posture.",
};

const securityFeatures = [
  {
    icon: Lock,
    title: "Encryption",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    items: [
      "TLS 1.3 for all connections in transit",
      "Session tokens with secure, httpOnly, sameSite cookies",
      "Cryptographically signed execution warrants (HMAC-SHA256)",
      "Warrant signatures are tamper-evident — any modification invalidates the warrant",
    ],
  },
  {
    icon: Users,
    title: "Tenant Isolation",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    items: [
      "Logical tenant isolation — each tenant's data is partitioned by tenant_id",
      "Tenant-scoped API keys and session management",
      "Cost tracking and quota enforcement per tenant",
      "No cross-tenant data access possible through the API",
    ],
  },
  {
    icon: Eye,
    title: "Audit & Compliance",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    items: [
      "Append-only audit trail — events cannot be modified or deleted",
      "Every agent action logged with: who, what, when, warrant, result, verification",
      "Full execution lineage — trace any action back to its original intent",
      "Audit data retained for 7 years (configurable per tenant)",
    ],
  },
  {
    icon: Shield,
    title: "Governance Pipeline",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    items: [
      "Zero-trust agent model — agents never have direct execution authority",
      "Risk-tiered approval workflows (T0 auto-approve → T2 multi-party approval)",
      "Time-limited warrants with scope constraints and automatic expiration",
      "Verification Engine confirms execution matched warrant — mismatches trigger alerts",
    ],
  },
  {
    icon: Server,
    title: "Infrastructure",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    items: [
      "Hosted on Fly.io with dedicated compute (not shared containers)",
      "US East (iad) region — ITAR/sovereignty-compatible deployment options",
      "Health check monitoring with automatic restart on failure",
      "Rate limiting on all API endpoints (configurable per tenant)",
    ],
  },
  {
    icon: FileCheck,
    title: "Policy Enforcement",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    items: [
      "Policy-as-code — rules are version-controlled and auditable",
      "Circuit breakers — automatic shutdown on anomalous execution patterns",
      "Dead letter queue for failed/rejected proposals — nothing is silently dropped",
      "Reconciliation engine detects and resolves state inconsistencies",
    ],
  },
];

const complianceRoadmap = [
  {
    status: "active",
    label: "Cryptographic warrant architecture",
    detail: "Every execution provably authorized",
  },
  {
    status: "active",
    label: "Append-only audit trail",
    detail: "Immutable record of all governance decisions",
  },
  {
    status: "active",
    label: "Risk-tiered approval workflows",
    detail: "T0/T1/T2 with configurable policies",
  },
  {
    status: "active",
    label: "Rate limiting & security headers",
    detail: "CSRF, CSP, HSTS protection",
  },
  {
    status: "planned",
    label: "SOC 2 Type I",
    detail: "Q4 2026 — audit initiated",
  },
  {
    status: "planned",
    label: "SOC 2 Type II",
    detail: "H1 2027 — continuous compliance",
  },
  {
    status: "planned",
    label: "HIPAA BAA",
    detail: "H1 2027 — for healthcare deployments",
  },
  {
    status: "planned",
    label: "FedRAMP",
    detail: "2027 — contingent on government sector demand",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <Image src="/logo-mark.png" alt="Vienna OS" width={28} height={28} className="w-7 h-7" />
            <span className="font-bold text-white">
              Vienna<span className="text-purple-400">OS</span>
            </span>
          </a>
          <a
            href="/docs"
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Docs
          </a>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Security</h1>
        <p className="text-slate-400 mb-12 max-w-2xl">
          Vienna OS is built for enterprises that need provable AI governance.
          Security isn&apos;t a feature — it&apos;s the architecture.
        </p>

        {/* Security features grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {securityFeatures.map((feature) => (
            <div
              key={feature.title}
              className={`${feature.bg} border border-navy-700 rounded-xl p-6`}
            >
              <div className="flex items-center gap-3 mb-4">
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
                <h3 className="text-white font-semibold text-lg">
                  {feature.title}
                </h3>
              </div>
              <ul className="space-y-2">
                {feature.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Compliance roadmap */}
        <h2 className="text-2xl font-bold text-white mb-6">
          Compliance Roadmap
        </h2>
        <div className="space-y-3 mb-16">
          {complianceRoadmap.map((item) => (
            <div
              key={item.label}
              className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center gap-4"
            >
              {item.status === "active" ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div className="flex-1">
                <span className="text-white font-medium">{item.label}</span>
                <span className="text-slate-500 text-sm ml-3">
                  {item.detail}
                </span>
              </div>
              <span
                className={`text-xs font-mono px-2 py-1 rounded ${
                  item.status === "active"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {item.status === "active" ? "LIVE" : "PLANNED"}
              </span>
            </div>
          ))}
        </div>

        {/* Responsible disclosure */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-8">
          <h2 className="text-xl font-bold text-white mb-3">
            Responsible Disclosure
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            If you discover a security vulnerability in Vienna OS, please report
            it responsibly. We take all reports seriously and will respond within
            24 hours.
          </p>
          <a
            href="mailto:security@ai.ventures?subject=Vienna%20OS%20Security%20Report"
            className="inline-flex items-center gap-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <Shield className="w-4 h-4" />
            security@ai.ventures
          </a>
        </div>
      </main>

      <footer className="border-t border-navy-700 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-500">
              Vienna OS — Governed AI Execution Layer
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="/docs"
              className="text-xs text-slate-600 hover:text-slate-400 transition"
            >
              Docs
            </a>
            <a
              href="/terms"
              className="text-xs text-slate-600 hover:text-slate-400 transition"
            >
              Terms
            </a>
            <a
              href="/privacy"
              className="text-xs text-slate-600 hover:text-slate-400 transition"
            >
              Privacy
            </a>
            <span className="text-xs text-slate-600">
              © 2026 Technetwork 2 LLC dba ai.ventures
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
