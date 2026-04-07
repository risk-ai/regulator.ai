import { Shield, ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Governance Glossary — Vienna OS",
  description: "Key terms for the governance kernel of autonomous AI: execution warrants, warrants-based governance, cryptographic execution authority, risk tiering, policy engines, and audit trails.",
  openGraph: {
    title: "AI Governance Glossary — Vienna OS",
    description: "Learn the vocabulary of AI governance. From cryptographic execution authority to warrants-based governance.",
  },
};

const terms = [
  {
    term: "Execution Warrant",
    definition: "A cryptographic authorization token (HMAC-SHA256 signed) that grants an AI agent permission to perform a specific action within defined scope, time, and resource constraints. Without a valid warrant, the agent cannot execute. Warrants are time-limited, scope-constrained, and tamper-evident.",
    related: ["Cryptographic Warrant", "Warrant Scope", "Warrant TTL"],
    link: "/blog/how-execution-warrants-work",
  },
  {
    term: "Risk Tiering",
    definition: "A classification system that assigns every agent action a risk level from T0 (minimal risk, auto-approved) to T3 (critical risk, requires multi-party human approval with justification and rollback plan). Risk tiers determine the approval workflow required before execution.",
    related: ["T0", "T1", "T2", "T3", "Risk Assessment"],
    link: "/blog/risk-tiering-framework",
  },
  {
    term: "Intent",
    definition: "A structured declaration of what an AI agent wants to do, submitted before execution. An intent includes the action type, target resource, parameters, and the requesting agent's identity. Intents are evaluated by the policy engine before any action is taken.",
    related: ["Intent Gateway", "Intent Submission", "Intent Evaluation"],
    link: "/docs",
  },
  {
    term: "Policy Engine",
    definition: "The rule evaluation system that determines whether an agent's intent should be approved, denied, or escalated. Policies are defined as code (JSON/YAML) and can include conditions, scopes, time windows, and escalation rules.",
    related: ["Policy-as-Code", "Policy Evaluation", "Rule Engine"],
    link: "/docs",
  },
  {
    term: "Audit Trail",
    definition: "An immutable, chronological record of every agent action, including the intent, policy evaluation, risk assessment, approval decision, warrant issuance, execution result, and verification. Audit trails in Vienna OS are cryptographically linked and compliance-ready for SOC 2, HIPAA, and SOX.",
    related: ["Immutable Log", "Compliance Audit", "Forensic Trail"],
    link: "/security",
  },
  {
    term: "Agent Fleet Management",
    definition: "Centralized monitoring and governance of multiple AI agents across an organization. Fleet management includes agent registration, health monitoring, policy assignment, and activity dashboards.",
    related: ["Fleet Dashboard", "Agent Registry", "Multi-Agent Governance"],
    link: "/use-cases",
  },
  {
    term: "Human-in-the-Loop (HITL)",
    definition: "A governance pattern where certain agent actions require explicit human approval before execution. In Vienna OS, T2 and T3 risk-tiered actions require one or more human approvers in the approval chain.",
    related: ["Approval Chain", "Multi-Party Approval", "Human Oversight"],
    link: null,
  },
  {
    term: "T0 (Tier Zero)",
    definition: "The lowest risk tier. Actions classified as T0 are auto-approved without human intervention. Examples: read-only queries, analytics lookups, status checks. T0 actions still generate audit trail entries.",
    related: ["Risk Tiering", "Auto-Approval"],
    link: null,
  },
  {
    term: "T1 (Tier One)",
    definition: "Low-risk actions that require policy evaluation but not human approval. If the action matches an approved policy, it proceeds automatically. Examples: deploying to staging, sending notifications to internal teams.",
    related: ["Risk Tiering", "Policy-Approved"],
    link: null,
  },
  {
    term: "T2 (Tier Two)",
    definition: "Medium-risk actions requiring at least one human approver. Examples: deploying to production, processing payments, modifying customer records. T2 warrants include approval timestamps and approver identity.",
    related: ["Risk Tiering", "Human Approval"],
    link: null,
  },
  {
    term: "T3 (Tier Three)",
    definition: "Critical-risk actions requiring multi-party human approval, a written justification, and a rollback plan. Examples: wire transfers over $50K, bulk data deletion, infrastructure changes affecting multiple services. T3 is the highest governance tier.",
    related: ["Risk Tiering", "Multi-Party Approval", "Rollback Plan"],
    link: null,
  },
  {
    term: "Rollback Plan",
    definition: "A required component of T3 warrant requests that specifies how to reverse the action if something goes wrong. The rollback plan is cryptographically linked to the warrant and can be triggered automatically or manually.",
    related: ["T3", "Disaster Recovery", "Undo"],
    link: null,
  },
  {
    term: "Policy-as-Code",
    definition: "The practice of defining governance rules in machine-readable formats (JSON, YAML, or code) rather than human-written documents. Policy-as-code enables automated evaluation, version control, and audit trails for governance decisions.",
    related: ["Policy Engine", "Governance Automation"],
    link: null,
  },
  {
    term: "Warrant Scope",
    definition: "The boundaries defining what a warrant authorizes. Scope includes the action type, target resource, allowed parameters, maximum values, and geographic constraints. Any action outside the warrant scope is denied.",
    related: ["Execution Warrant", "Scope Verification"],
    link: null,
  },
  {
    term: "Warrant TTL (Time to Live)",
    definition: "The maximum duration a warrant remains valid after issuance. After the TTL expires, the warrant is automatically invalidated and the agent must request a new one. Default TTLs range from 60 seconds (T3) to 3600 seconds (T0).",
    related: ["Execution Warrant", "Time-Limited Authorization"],
    link: null,
  },
  {
    term: "Truth Snapshot",
    definition: "A cryptographic hash of the system state at the moment a warrant is issued. During post-execution verification, the truth snapshot is compared to the current state to detect unauthorized modifications.",
    related: ["Verification", "Tamper Detection", "State Hash"],
    link: null,
  },
  {
    term: "BSL 1.1 (Business Source License)",
    definition: "A source-available license that allows free use for evaluation, development, and non-production purposes. Production use requires a commercial license. After a specified date (2030 for Vienna OS), the license automatically converts to Apache 2.0.",
    related: ["Open Source", "Licensing", "Apache 2.0"],
    link: null,
  },
  {
    term: "EU AI Act",
    definition: "European Union regulation establishing a legal framework for artificial intelligence. The EU AI Act classifies AI systems by risk level and imposes requirements for transparency, human oversight, and accountability. Vienna OS helps organizations comply with high-risk AI system requirements.",
    related: ["Compliance", "Regulation", "AI Governance"],
    link: "/blog/eu-ai-act-agent-compliance",
  },
];

export default function GlossaryPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-navy-950 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-12">
        <Link href="/" className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-8 transition">
          <Shield className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl md:text-4xl font-bold">AI Governance Glossary</h1>
        </div>
        <p className="text-xl text-slate-300 max-w-3xl">
          The vocabulary of responsible AI agent deployment. From execution warrants to risk tiering.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="space-y-6">
          {terms.map((t, i) => (
            <div key={i} id={t.term.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6 scroll-mt-24">
              <h2 className="text-xl font-bold text-white mb-3">{t.term}</h2>
              <p className="text-slate-300 leading-relaxed mb-4">{t.definition}</p>
              <div className="flex flex-wrap gap-2">
                {t.related.map((r, j) => (
                  <span key={j} className="text-xs bg-slate-800 border border-slate-700/50 rounded-full px-3 py-1 text-slate-400">
                    {r}
                  </span>
                ))}
              </div>
              {t.link && (
                <Link href={t.link} className="inline-flex items-center text-sm text-amber-500 hover:underline mt-3">
                  Learn more &rarr;
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
