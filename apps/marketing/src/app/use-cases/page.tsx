import { Shield, Building2, Heart, DollarSign, Code, Truck, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Use Cases — Vienna OS",
  description: "How enterprises use Vienna OS as the governance kernel for autonomous AI - warrants-based governance across financial services, healthcare, DevOps, supply chain, and more.",
  openGraph: {
    title: "Use Cases — Vienna OS",
    description: "How enterprises use Vienna OS as the governance kernel for autonomous AI - warrants-based governance with cryptographic execution authority across industries.",
  },
};

const useCases = [
  {
    icon: DollarSign,
    title: "Financial Services",
    subtitle: "SOX, FINRA, PCI-DSS Compliance",
    color: "text-green-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    description: "AI agents handling trades, wire transfers, and portfolio management need governance that satisfies regulators. Vienna OS provides cryptographic proof that every financial action was authorized within approved parameters.",
    features: [
      "T2 multi-party approval for transactions over configurable thresholds",
      "Immutable audit trail satisfying SOX Section 404 requirements",
      "Warrant-scoped execution preventing unauthorized trading",
      "Real-time risk tier assessment for every financial operation",
    ],
    warrant: "Wire transfer $75,000 → T2 warrant → 2 human approvers → HMAC-SHA256 signed → executed → audit logged",
    blog: "/blog/how-execution-warrants-work",
  },
  {
    icon: Heart,
    title: "Healthcare & Life Sciences",
    subtitle: "HIPAA, FDA 21 CFR Part 11",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    description: "AI agents accessing patient records, updating treatment plans, or processing claims must comply with HIPAA. Vienna OS enforces minimum necessary access and maintains the audit trails required for compliance.",
    features: [
      "PHI-scoped warrants limiting access to specific patient records",
      "7-year audit retention meeting HIPAA requirements",
      "Role-based approval chains for sensitive data operations",
      "Automatic risk escalation for bulk data access patterns",
    ],
    warrant: "Access patient record #4821 → T1 warrant → policy: treating_physician_only → scoped to demographics + vitals → 300s TTL",
    blog: "/blog/hipaa-compliance-ai-agents",
  },
  {
    icon: Code,
    title: "DevOps & Platform Engineering",
    subtitle: "SOC 2, Change Management",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    description: "AI agents deploying code, scaling infrastructure, and managing configurations can cause catastrophic damage without proper controls. Vienna OS prevents runaway deployments and unauthorized changes.",
    features: [
      "T1 auto-approval for staging deploys, T2 human approval for production",
      "Blast radius limits preventing cluster over-scaling",
      "Rollback plan requirements for T3 infrastructure changes",
      "Integration with CI/CD pipelines (GitHub Actions, GitLab CI)",
    ],
    warrant: "Deploy v2.4.1 to production → T2 warrant → SRE approval → max 5 instances → rollback: v2.4.0 → 600s TTL",
    blog: "/blog/governing-langchain-agents",
  },
  {
    icon: Building2,
    title: "Enterprise AI Platforms",
    subtitle: "ISO 27001, EU AI Act",
    color: "text-amber-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    description: "Organizations deploying multiple AI agents across departments need centralized governance. Vienna OS provides a single control plane for fleet management, policy enforcement, and compliance reporting.",
    features: [
      "Centralized fleet dashboard for 100s of agents",
      "Department-scoped policies with inheritance",
      "EU AI Act risk classification mapping",
      "Automated compliance report generation",
    ],
    warrant: "Marketing agent → email 50K users → T3 warrant → VP Marketing + Legal approval → content review → rate limit 1K/hr",
    blog: "/blog/eu-ai-act-agent-compliance",
  },
  {
    icon: Truck,
    title: "Supply Chain & Logistics",
    subtitle: "Operational Safety",
    color: "text-gold-300",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    description: "AI agents optimizing routes, managing inventory, and coordinating shipments operate in high-stakes environments where errors have physical consequences. Vienna OS ensures human oversight for critical decisions.",
    features: [
      "T2 approval for route changes affecting delivery SLAs",
      "Inventory threshold alerts before agent-initiated reorders",
      "Supplier payment authorization with amount caps",
      "Integration with ERP systems (SAP, Oracle)",
    ],
    warrant: "Reorder 10K units from Supplier A → T1 warrant → policy: approved_suppliers + budget_under_50K → auto-approved → PO generated",
    blog: null,
  },
  {
    icon: Lock,
    title: "Security Operations",
    subtitle: "Incident Response, Threat Hunting",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    description: "AI agents in SOC environments can quarantine hosts, block IPs, and escalate incidents. Without governance, an overzealous agent could take down production systems during a false positive.",
    features: [
      "T0 auto-approval for read-only threat intelligence queries",
      "T1 policy approval for automated quarantine actions",
      "T2 human approval for network-wide blocking rules",
      "Tamper-proof audit trail for incident forensics",
    ],
    warrant: "Block IP 203.0.113.42 → T1 warrant → policy: known_malicious_source → auto-approved → firewall rule added → 3600s TTL",
    blog: null,
  },
];

export default function UseCasesPage() {
  return (
    <main className="min-h-screen bg-[#0a0e14] text-white">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        <Link href="/" className="inline-flex items-center text-sm text-zinc-400 hover:text-white mb-8 transition">
          <Shield className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Use Cases
        </h1>
        <p className="text-xl text-zinc-300 max-w-3xl">
          Vienna OS governs AI agents across every industry where autonomous actions need oversight, 
          compliance, and accountability.
        </p>
      </div>

      {/* Use Cases */}
      <div className="max-w-6xl mx-auto px-6 pb-24 space-y-12">
        {useCases.map((uc, i) => (
          <div key={i} className={`border ${uc.borderColor} bg-black p-8 md:p-10`}>
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-3 ${uc.bgColor}`}>
                <uc.icon className={`w-6 h-6 ${uc.color}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{uc.title}</h2>
                <p className="text-sm text-zinc-400 mt-1">{uc.subtitle}</p>
              </div>
            </div>

            <p className="text-zinc-300 mb-6 leading-relaxed">{uc.description}</p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {uc.features.map((feature, j) => (
                <div key={j} className="flex items-start gap-2">
                  <span className={`mt-1 ${uc.color}`}>&#x2713;</span>
                  <span className="text-sm text-zinc-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* Example Warrant Flow */}
            <div className="bg-slate-950/50 border border-zinc-800 p-4 mb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-medium">Example Warrant Flow</p>
              <p className="text-sm text-zinc-300 font-mono">{uc.warrant}</p>
            </div>

            {uc.blog && (
              <Link href={uc.blog} className={`inline-flex items-center text-sm ${uc.color} hover:underline`}>
                Read more <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            )}
          </div>
        ))}

        {/* CTA */}
        <div className="text-center py-12">
          <h2 className="text-3xl font-bold mb-4">Ready to govern your AI agents?</h2>
          <p className="text-zinc-300 mb-8 max-w-xl mx-auto">
            Start with 5 agents free. See the governance pipeline in action with your own use case.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/try"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-500 font-medium transition"
            >
              Try Interactive Demo
            </Link>
            <Link
              href="/signup"
              className="px-6 py-3 border border-zinc-800 hover:border-amber-500/30 font-medium transition"
            >
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
