import { Shield, ArrowLeft, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const posts: Record<
  string,
  {
    title: string;
    date: string;
    readTime: string;
    category: string;
    categoryColor: string;
    content: string;
  }
> = {
  "why-ai-agents-need-governance": {
    title:
      "Why AI Agents Need a Governance Layer (And Why Guardrails Aren't Enough)",
    date: "March 25, 2026",
    readTime: "8 min",
    category: "Governance",
    categoryColor: "text-purple-400 bg-purple-500/10",
    content: `
## The Agent Explosion

Every major AI lab shipped agent frameworks in 2025-2026. OpenAI Swarm, Google ADK, Anthropic Claude Code, Microsoft AutoGen — the message is clear: AI agents that can take real-world actions are the next platform shift.

But there's a problem nobody wants to talk about: **who controls what agents actually do?**

## Guardrails ≠ Governance

The current approach to AI safety focuses on *guardrails* — input/output filtering that prevents models from saying harmful things. Companies like Guardrails AI and NeMo Guardrails do this well.

But guardrails are content filters. They answer: "Should the model say this?"

Governance answers a fundamentally different question: **"Should the agent do this?"**

When an AI agent proposes to restart a production service, send an email campaign to 10,000 customers, or execute a wire transfer — content filtering is irrelevant. The question is authority, approval, and accountability.

## The Governance Gap

Here's what enterprises face today:

| Problem | Impact |
|---|---|
| No approval workflow | Agents execute freely — hope for the best |
| No audit trail | Can't prove compliance to regulators |
| No policy enforcement | Agents violate business rules nobody encoded |
| No risk tiering | File reads treated the same as database deletes |
| No warrant system | No cryptographic proof of who authorized what |

The result? Enterprises either don't deploy agents (missing value) or deploy them ungoverned (accepting unknown risk).

## What Governance Actually Looks Like

A governance layer sits between agent intent and real-world execution. It doesn't replace agents — it governs them.

Every agent action flows through a pipeline:

**Intent → Policy Check → Risk Assessment → Approval (if needed) → Warrant → Execution → Verification → Audit**

Low-risk actions (reading a file, checking status) flow through automatically. High-risk actions (deploying code, sending money) require operator approval. Every action — regardless of risk tier — gets a cryptographically signed warrant and an entry in the immutable audit trail.

## The Warrant Primitive

This is the key innovation. Every approved execution receives a **warrant** — a signed, time-limited, scope-constrained authorization token. Think of it like a judicial warrant: specific in scope, limited in time, and provably issued by an authority.

No warrant, no execution. It's that simple.

Post-execution, a Verification Engine confirms the agent actually did what the warrant authorized — nothing more, nothing less. Any deviation triggers alerts and automatic revocation.

## Why Now?

Three forces are converging:

1. **Agent adoption is accelerating.** 60%+ of Fortune 500 are experimenting with AI agents. The governance gap becomes visible at scale.

2. **Regulation is arriving.** The EU AI Act (2026 enforcement), SEC AI guidance, and NIST AI RMF all demand transparency, human oversight, and audit trails for AI systems.

3. **Insurance pressure.** Cyber insurers are starting to ask: "How do you govern your AI agents?" Companies without answers face higher premiums or coverage denials.

## The Path Forward

We built Vienna OS because we believe governed AI execution is an inevitable infrastructure layer — like authentication, logging, or observability. Every enterprise deploying agents at scale will need it.

The question isn't whether AI agents need governance. It's whether you build it yourself or adopt a purpose-built control plane.

---

*Vienna OS is the governance layer agents answer to. [Get started free →](/signup)*
    `,
  },
  "cryptographic-warrants-explained": {
    title:
      "Cryptographic Execution Warrants: The Missing Primitive for AI Agent Security",
    date: "March 25, 2026",
    readTime: "10 min",
    category: "Architecture",
    categoryColor: "text-blue-400 bg-blue-500/10",
    content: `
## The Authorization Problem

When a human clicks "Deploy" in a CI/CD pipeline, there's an implicit authorization chain: they logged in (authentication), they have the right role (authorization), and the action is logged (audit). If something goes wrong, you know who did what and when.

When an AI agent deploys code, that entire chain breaks. The agent authenticated as... itself? Who authorized the deployment? Where's the proof?

## Introducing Execution Warrants

A warrant is a cryptographically signed authorization token with four properties:

1. **Scope** — exactly what the agent is allowed to do
2. **Time-to-live** — when the warrant expires
3. **Issuer** — who or what approved the action
4. **Constraints** — parameter bounds the execution must respect

Here's what one looks like:

\`\`\`json
{
  "warrant_id": "wrt-7f3a2b1c-...",
  "scope": {
    "action": "deploy_service",
    "target": "api-gateway-prod",
    "parameters": {
      "version": "2.4.1",
      "strategy": "rolling"
    }
  },
  "ttl": 300,
  "issued_at": "2026-03-25T14:00:00Z",
  "expires_at": "2026-03-25T14:05:00Z",
  "issuer": {
    "type": "operator",
    "id": "jane.smith"
  },
  "constraints": {
    "max_retries": 1,
    "rollback_on_failure": true,
    "affected_services": ["api-gateway"]
  },
  "signature": "0x7f3a...b2c1"
}
\`\`\`

## How It Works in Practice

**Step 1: Agent proposes an action.** The agent submits an intent (e.g., "restart the API gateway") to the Intent Gateway.

**Step 2: Policy Engine evaluates.** Is this action allowed? What risk tier is it? Does it require approval?

**Step 3: Approval (if required).** T1/T2 actions wait for operator approval. T0 actions auto-approve.

**Step 4: Warrant issued.** The Warrant Authority creates a signed warrant with specific scope and TTL.

**Step 5: Execution.** The Execution Router uses the warrant to authorize the action. No valid warrant = no execution.

**Step 6: Verification.** Post-execution, the Verification Engine confirms the actual execution matched the warrant scope. Did the agent restart *only* the API gateway? Did it use rolling deployment? Any deviation flags an alert.

**Step 7: Audit.** Everything — the intent, policy decision, warrant, execution result, and verification — is recorded in the append-only ledger.

## Why Not Just Use RBAC?

Role-based access control (RBAC) tells you *what an agent can do in general*. Warrants tell you *what an agent is authorized to do right now, for this specific action*.

An agent might have the *capability* to restart services (RBAC). But for each restart, it still needs a *warrant* — a specific, time-limited, auditable authorization. This is the difference between "you have a driver's license" and "you are authorized to drive this specific car, on this route, for the next 30 minutes."

## The Legal Analogy

This isn't accidental. The warrant concept borrows from legal systems intentionally. A police warrant must be:
- Specific (what can be searched)
- Time-limited (when it's valid)
- Issued by an authority (a judge)
- Documented (on record)

AI execution warrants follow the same principles. This isn't just good engineering — it's the kind of framework regulators understand and trust.

## What This Enables

- **Compliance proof.** Show auditors exactly who authorized what, when, and why.
- **Forensic analysis.** When something goes wrong, trace the full chain from intent to execution.
- **Automatic containment.** Expired or scope-violated warrants automatically halt execution.
- **Insurance evidence.** Demonstrate to cyber insurers that AI actions are governed.

---

*Learn more about Vienna OS warrants in our [documentation →](/docs#warrants)*
    `,
  },
  "eu-ai-act-agent-compliance": {
    title:
      "EU AI Act 2026: What It Means for Autonomous Agent Deployments",
    date: "March 25, 2026",
    readTime: "6 min",
    category: "Compliance",
    categoryColor: "text-emerald-400 bg-emerald-500/10",
    content: `
## The EU AI Act Is Here

As of 2026, the EU AI Act is in enforcement. It's the world's first comprehensive AI regulation, and it has teeth — fines up to €35 million or 7% of global revenue.

For enterprises deploying autonomous AI agents, three requirements stand out:

## 1. Transparency

**Article 13:** High-risk AI systems must be designed to ensure their operation is sufficiently transparent to enable users to interpret the system's output and use it appropriately.

**What this means for agents:** Every agent action must be explainable. Why did the agent do this? What policy allowed it? Who approved it?

**How Vienna OS addresses it:** The governance pipeline records the full decision chain — intent, policy evaluation, risk tier assignment, approval status, and warrant issuance. Every action has a provable explanation.

## 2. Human Oversight

**Article 14:** High-risk AI systems shall be designed and developed so that they can be effectively overseen by natural persons.

**What this means for agents:** Humans must be able to intervene, approve, or reject agent actions before they execute — especially for high-risk actions.

**How Vienna OS addresses it:** Risk-tiered approval workflows. T0 actions auto-approve (low risk). T1/T2 actions require explicit operator approval before a warrant is issued. Operators can intervene at any point in the pipeline.

## 3. Record-Keeping

**Article 12:** High-risk AI systems shall be designed with capabilities enabling the automatic recording of events (logs) over the lifetime of the system.

**What this means for agents:** Complete, immutable audit trails of every agent action, decision, and outcome.

**How Vienna OS addresses it:** Append-only audit ledger. Every event is permanently recorded — proposals, policy decisions, warrants, executions, verifications, and anomalies. Data is retained for 7+ years.

## Beyond Compliance

The EU AI Act sets a floor, not a ceiling. Enterprises that adopt governed AI execution don't just satisfy regulators — they build operational confidence.

When your board asks "how do we control our AI agents?", the answer shouldn't be "we hope the guardrails work." It should be "every action is governed, warranted, verified, and audited."

## Getting Started

Vienna OS maps directly to EU AI Act requirements. If you're deploying agents in or serving the EU market, governance isn't optional — it's the law.

---

*Start governing your agents today. [Free tier available →](/signup)*
    `,
  },
  "risk-tiering-framework": {
    title:
      "Designing a Risk Tiering Framework for AI Agent Actions",
    date: "March 25, 2026",
    readTime: "7 min",
    category: "Framework",
    categoryColor: "text-amber-400 bg-amber-500/10",
    content: `
## Not All Actions Are Equal

A file read and a wire transfer are both "agent actions." But treating them the same is either dangerously permissive or uselessly restrictive.

Risk tiering solves this by classifying every agent action into tiers that determine the governance process. Here's a practical framework.

## The Three-Tier Model

### T0 — Reversible / Low-Stakes
**Auto-approved. No operator intervention.**

Examples:
- Reading a file or database
- Checking service status
- Internal logging or reasoning
- Querying an API (GET requests)

Why auto-approve? These actions are read-only or easily reversible. Requiring approval would create bottlenecks without adding safety. The governance pipeline still records them in the audit trail.

### T1 — Moderate Stakes
**Requires operator approval. Single-party.**

Examples:
- Restarting a service
- Updating configuration
- Writing to a database
- Sending an internal notification
- Creating a support ticket

Why require approval? These actions have real-world effects that could cause disruption if wrong, but a single informed operator can assess the risk.

### T2 — Irreversible / High-Impact
**Requires multi-party approval. Time-limited warrants.**

Examples:
- Production deployments
- Financial transactions
- Deleting data
- Sending external communications (emails, campaigns)
- Legal filings
- Infrastructure changes (scaling, region migration)

Why multi-party? The blast radius of errors is high and consequences may be irreversible. Multiple reviewers reduce single-point-of-failure in approval.

## Implementing Risk Tiers

### Step 1: Classify your agent actions
List every action your agents can perform. For each one, ask:
- Is it read-only or does it change state?
- Is it reversible?
- What's the blast radius if it goes wrong?
- Are there regulatory implications?

### Step 2: Map actions to tiers
Use the answers above to assign each action to T0, T1, or T2. When in doubt, tier up — you can always relax later.

### Step 3: Define approval workflows
- T0: Auto-approve, log only
- T1: Single operator approval, 15-minute warrant TTL
- T2: Multi-party approval, 5-minute warrant TTL, mandatory rollback plan

### Step 4: Monitor and iterate
Review your tier assignments quarterly. Actions that consistently auto-approve without issues can potentially move down a tier. Actions that cause incidents should move up.

## Common Mistakes

**Over-tiering everything.** If every action requires approval, operators get alert fatigue and start rubber-stamping. Be disciplined about what's actually T1/T2.

**Under-tiering financial actions.** Money movements should always be T2, regardless of amount. The reputational risk of an unauthorized transfer outweighs the friction cost.

**Ignoring the compound effect.** A single T0 action might be safe, but 1,000 T0 actions in rapid succession could be an attack. Consider rate limiting and anomaly detection alongside tiering.

## In Vienna OS

Vienna OS implements this framework natively. The Policy Engine assigns risk tiers based on configurable rules. The Intent Gateway routes actions through the appropriate approval workflow. And the Verification Engine confirms execution stayed within the warranted scope.

---

*Set up your risk tiers in under 5 minutes. [Read the docs →](/docs)*
    `,
  },
};

export async function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) return {};
  return {
    title: post.title,
    description: post.content.slice(0, 160).replace(/[#\n*`]/g, "").trim(),
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) notFound();

  // Simple markdown-ish rendering
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      if (trimmed.startsWith("## "))
        return (
          <h2
            key={i}
            className="text-xl font-bold text-white mt-10 mb-4"
          >
            {trimmed.slice(3)}
          </h2>
        );
      if (trimmed.startsWith("### "))
        return (
          <h3
            key={i}
            className="text-lg font-semibold text-white mt-8 mb-3"
          >
            {trimmed.slice(4)}
          </h3>
        );
      if (trimmed.startsWith("- "))
        return (
          <li key={i} className="text-slate-300 ml-4 text-sm">
            {trimmed.slice(2)}
          </li>
        );
      if (trimmed.startsWith("| "))
        return (
          <div key={i} className="font-mono text-xs text-slate-400">
            {trimmed}
          </div>
        );
      if (trimmed.startsWith("```"))
        return (
          <div
            key={i}
            className="bg-navy-800 border border-navy-700 rounded-lg p-4 my-4 font-mono text-sm text-slate-300 overflow-x-auto"
          >
            {trimmed.slice(3)}
          </div>
        );
      if (trimmed.startsWith("*") && trimmed.endsWith("*"))
        return (
          <p key={i} className="text-slate-400 italic text-sm mt-6">
            {trimmed.slice(1, -1).replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")}
          </p>
        );
      if (trimmed.startsWith("---"))
        return <hr key={i} className="border-navy-700 my-8" />;

      // Bold handling
      const parts = trimmed.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-slate-300 text-sm leading-relaxed my-2">
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="text-white font-semibold">
                {part}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <a
            href="/blog"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="text-sm">Back to Blog</span>
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${post.categoryColor}`}
          >
            {post.category}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {post.readTime}
          </div>
          <span className="text-xs text-slate-600">{post.date}</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-8 leading-tight">
          {post.title}
        </h1>

        <article className="prose-vienna">{renderContent(post.content)}</article>

        <div className="mt-12 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-3">
            Ready to govern your agents?
          </h3>
          <p className="text-slate-400 mb-6 text-sm">
            Start with the free tier. No credit card required.
          </p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl transition font-medium text-sm"
          >
            Get Started Free
          </a>
        </div>
      </main>

      <footer className="border-t border-navy-700 py-8 mt-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <span className="text-xs text-slate-600">
            © 2026 ai.ventures. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
