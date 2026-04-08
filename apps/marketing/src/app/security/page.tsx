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
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Vienna OS security architecture - governance kernel security model with cryptographic warrants, warrants-based governance, tenant isolation, and cryptographic execution authority.",
};

const securityFeatures = [
  {
    icon: Lock,
    title: "ENCRYPTION",
    items: [
      "TLS 1.3 for all connections in transit",
      "Session tokens with secure, httpOnly, sameSite cookies",
      "Cryptographically signed execution warrants (HMAC-SHA256)",
      "Warrant signatures are tamper-evident — any modification invalidates the warrant",
    ],
  },
  {
    icon: Users,
    title: "TENANT_ISOLATION",
    items: [
      "Logical tenant isolation — each tenant's data is partitioned by tenant_id",
      "Tenant-scoped API keys and session management",
      "Cost tracking and quota enforcement per tenant",
      "No cross-tenant data access possible through the API",
    ],
  },
  {
    icon: Eye,
    title: "AUDIT_AND_COMPLIANCE",
    items: [
      "Append-only audit trail — events cannot be modified or deleted",
      "Every agent action logged with: who, what, when, warrant, result, verification",
      "Full execution lineage — trace any action back to its original intent",
      "Audit data retained for 7 years (configurable per tenant)",
    ],
  },
  {
    icon: Shield,
    title: "GOVERNANCE_PIPELINE",
    items: [
      "Zero-trust agent model — agents never have direct execution authority",
      "Risk-tiered approval workflows (T0 auto-approve → T2 multi-party approval)",
      "Time-limited warrants with scope constraints and automatic expiration",
      "Verification Engine confirms execution matched warrant — mismatches trigger alerts",
    ],
  },
  {
    icon: Server,
    title: "INFRASTRUCTURE",
    items: [
      "Hosted on Fly.io with dedicated compute (not shared containers)",
      "US East (iad) region — ITAR/sovereignty-compatible deployment options",
      "Health check monitoring with automatic restart on failure",
      "Rate limiting on all API endpoints (configurable per tenant)",
    ],
  },
  {
    icon: FileCheck,
    title: "POLICY_ENFORCEMENT",
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
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white font-mono">
      <SiteNav />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-amber-500 mb-2 font-mono uppercase tracking-wide">SECURITY</h1>
        <p className="text-zinc-400 mb-12 max-w-2xl font-mono">
          Vienna OS is built for enterprises that need provable AI governance.
          Security isn&apos;t a feature — it&apos;s the architecture.
        </p>

        {/* Security features grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {securityFeatures.map((feature) => (
            <div
              key={feature.title}
              className="bg-black border border-amber-500/10 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <feature.icon className="w-6 h-6 text-amber-500" />
                <h3 className="text-amber-500 font-mono font-bold text-lg uppercase tracking-wide">
                  {feature.title}
                </h3>
              </div>
              <ul className="space-y-2">
                {feature.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-zinc-400 font-mono"
                  >
                    <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Compliance roadmap */}
        <h2 className="text-2xl font-bold text-amber-500 mb-6 font-mono uppercase tracking-wide">
          COMPLIANCE_ROADMAP
        </h2>
        <div className="space-y-3 mb-16">
          {complianceRoadmap.map((item) => (
            <div
              key={item.label}
              className="bg-black border border-amber-500/10 p-4 flex items-center gap-4"
            >
              {item.status === "active" ? (
                <CheckCircle className="w-5 h-5 text-amber-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-zinc-400 shrink-0" />
              )}
              <div className="flex-1">
                <span className="text-white font-mono font-bold">{item.label}</span>
                <span className="text-zinc-600 text-sm ml-3 font-mono">
                  {item.detail}
                </span>
              </div>
              <span
                className={`text-xs font-mono px-2 py-1 ${
                  item.status === "active"
                    ? "bg-amber-500/20 text-amber-500"
                    : "bg-amber-500/10 text-zinc-400"
                }`}
              >
                {item.status === "active" ? "LIVE" : "PLANNED"}
              </span>
            </div>
          ))}
        </div>

        {/* Responsible disclosure */}
        <div className="bg-black border border-amber-500/30 p-8">
          <h2 className="text-xl font-bold text-amber-500 mb-3 font-mono uppercase tracking-wide">
            RESPONSIBLE_DISCLOSURE
          </h2>
          <p className="text-zinc-400 text-sm mb-4 font-mono">
            If you discover a security vulnerability in Vienna OS, please report
            it responsibly. We take all reports seriously and will respond within
            24 hours.
          </p>
          <a
            href="mailto:security@ai.ventures?subject=Vienna%20OS%20Security%20Report"
            className="inline-flex items-center gap-2 bg-amber-500 text-black px-4 py-2 transition text-sm font-mono font-bold uppercase"
          >
            <Shield className="w-4 h-4" />
            SECURITY@AI.VENTURES
          </a>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}