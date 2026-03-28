import { Shield, ArrowLeft, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BlogTracker from "./BlogTracker";
import BlogCTA from "./BlogCTA";

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
    title: "Why Your AI Agents Need a Governance Layer (Before Something Goes Wrong)",
    date: "March 27, 2026",
    readTime: "8 min",
    category: "Governance",
    categoryColor: "text-purple-400 bg-purple-500/10",
    content: `
## The 3 AM Wake-Up Call That Changed Everything

Picture this: It's 3:17 AM on a Tuesday, and your phone starts buzzing with alerts. Your AI agent, the one you've been so proud of for optimizing cloud infrastructure costs, just decided to scale your Kubernetes cluster to 500 nodes. The monthly cost? $60,000. The reason? A traffic spike that lasted all of 90 seconds.

This isn't a hypothetical scenario. It happened to us six months ago, and it's what inspired the creation of Vienna OS, the governance platform we're open-sourcing today.

## The Illusion of AI Safety

When most people think about AI safety, they picture guardrails: systems that filter outputs, detect harmful content, or prevent models from generating inappropriate responses. But it completely falls apart when AI agents can take autonomous actions in the physical world.

**Output-level safety (Guardrails):**
- AI generates a response → Safety filter reviews → Approved response displayed
- Timeline: Reactive (after generation)
- Stakes: Reputation, user experience

**Execution-level governance (What we actually need):**
- AI decides on action → Governance system evaluates → Action executed if approved
- Timeline: Proactive (before execution)
- Stakes: Business continuity, legal compliance, financial loss

## Enter Execution Warrants

We call it **execution warrants**—a concept borrowed from law enforcement and adapted for autonomous systems.

Instead of AI agents executing actions directly, they submit **execution intents** to a governance control plane. This system validates, evaluates, classifies risk, and issues cryptographically signed warrants for approved actions.

### The Four Risk Tiers

**T0 (Minimal Risk)** - Auto-approve
- Health checks, read operations, status queries

**T1 (Moderate Risk)** - Single operator approval  
- Routine deployments, configuration changes

**T2 (High Risk)** - Multi-party approval + MFA
- Financial transactions, data deletion, major infrastructure changes

**T3 (Critical Risk)** - Board-level approval
- Actions that could impact business continuity

## Real-World Impact: Six Months of Production Use

**Incidents Prevented:**
- 1 potential $60K infrastructure scaling error
- 3 unauthorized database modifications
- 5 financial transactions flagged for additional review

**Operational Metrics:**
- 99.7% uptime across all governed systems
- <50ms added latency for T0/T1 actions
- 100% audit trail completeness for SOC 2 examination

---

*Vienna OS is the governance layer agents answer to. [Get started free →](/signup)*
    `,
  },
  "warrants-vs-guardrails": {
    title: "Warrants vs Guardrails: A Better Model for AI Agent Control",
    date: "March 27, 2026",
    readTime: "8 min",
    category: "Architecture",
    categoryColor: "text-blue-400 bg-blue-500/10",
    content: `
## The Problem with Reactive AI Safety

Imagine you're designing security for a bank vault. Would you put the security system **after** people have already entered the vault and taken the money? Of course not. You'd require authorization **before** they can enter.

Yet this is exactly how most AI safety systems work today. They operate reactively—filtering outputs after AI models have already made decisions, rather than governing actions before they're executed.

## Guardrails: The Current Approach

Most AI safety implementations today follow the guardrails model:

\`\`\`
AI Model → Output Generation → Safety Filter → Approved Output
\`\`\`

This works well for content-focused applications, but has critical weaknesses when applied to autonomous agents:

### Timing Problems
Guardrails operate **after** the AI has already decided what to do. For autonomous agents, this is often too late.

### Execution vs. Content
Guardrails filter what AI systems can say. But autonomous agents need governance over what they can **do**.

## Execution Warrants: A Proactive Model

Instead of filtering outputs, execution warrants govern actions at the intent level:

\`\`\`
Agent Intent → Risk Assessment → Approval → Signed Warrant → Execution
\`\`\`

Every approved action receives a cryptographically signed warrant with:
- **Scope**: Exactly what the agent is authorized to do
- **Time limits**: When the warrant expires  
- **Constraints**: Parameter bounds the execution must respect
- **Audit trail**: Complete record of approval chain

## Real-World Example

**Scenario**: AI agent wants to scale database cluster

**Guardrails approach**:
- Agent executes scaling
- System monitors outputs
- Too late to prevent $20K/month cost impact

**Warrant approach**:
- Agent submits scaling intent
- System evaluates cost impact ($20K/month)
- Routes to DevOps team for approval
- Team reviews and denies (temporary traffic spike)
- No scaling, no unnecessary cost

## Why Warrants Work

1. **Proactive control**: Stop problems before they happen
2. **Risk-aware**: Different approval flows for different risk levels
3. **Cryptographically verifiable**: Tamper-evident audit trails
4. **Time-limited**: Warrants expire, preventing stale authorizations
5. **Scope-constrained**: Agents can only do exactly what's approved

---

*Learn how to implement execution warrants in your systems. [Read the docs →](/docs)*
    `,
  },
  "soc2-for-ai-systems": {
    title: "SOC 2 Compliance for AI Agent Systems: What Auditors Want to See",
    date: "March 27, 2026",
    readTime: "12 min", 
    category: "Compliance",
    categoryColor: "text-emerald-400 bg-emerald-500/10",
    content: `
## The AI Compliance Gap

"Your AI agents are out of scope for this SOC 2 audit."

That's what our auditor told us six months ago when we first attempted SOC 2 certification. The problem? Traditional SOC 2 frameworks weren't designed for systems that make real-time decisions without human oversight.

Fast-forward to today: Vienna OS has become the first AI agent governance platform to achieve SOC 2 Type I compliance. Here's what we learned.

## Where Traditional SOC 2 Falls Short

**Problem 1: Decision Speed vs. Human Oversight**
Traditional controls assume human involvement in critical decisions. AI agents can execute thousands of actions per second.

**Problem 2: Dynamic Risk Assessment**  
Standard security controls are binary: allowed or blocked. AI agents need risk-aware controls.

**Problem 3: Audit Trail Complexity**
AI agents make complex decisions requiring audit trails that capture intent, reasoning, and risk evaluation.

## Trust Services Criteria for AI Agents

### Security: Protecting Against Unauthorized Access
**What Auditors Want:**
- Cryptographic authentication of AI agent identities
- Scoped permissions that limit blast radius
- Real-time monitoring of agent behavior
- Secure credential management

**Vienna OS Implementation:**
- Every agent action requires cryptographic warrant
- Risk-tiered permission system (T0-T3)
- Continuous behavioral monitoring
- Zero-trust credential architecture

### Availability: System Operation and Accessibility
**What Auditors Want:**
- Defined uptime requirements for AI governance
- Monitoring of AI system performance
- Incident response procedures for AI failures

### Processing Integrity: Complete, Valid, Accurate Processing
**What Auditors Want:**
- Verification that AI agents do exactly what they're authorized to do
- Controls preventing unauthorized modifications
- Data validation at input and output

### Confidentiality: Protection of Sensitive Information
**What Auditors Want:**
- Data classification for AI training and inference
- Controls preventing data leakage between tenants
- Encryption of AI model weights and training data

### Privacy: Collection, Use, and Disposal of Personal Information
**What Auditors Want:**
- Privacy controls for AI systems processing personal data
- Data retention policies for AI-generated insights
- User consent mechanisms for AI processing

## The Audit Evidence That Actually Works

### 1. Warrant-Based Audit Trails
Instead of hoping agents behave, prove they're governed:

\`\`\`
Execution Intent → Risk Assessment → Warrant → Verified Execution → Audit Log
\`\`\`

### 2. Cryptographic Proof of Approval
Every high-risk action has tamper-evident proof of authorization.

### 3. Real-Time Policy Enforcement
Demonstrate that policies are enforced automatically, not retrospectively.

### 4. Segregation of Duties
Multi-party approval for high-risk actions, preventing single points of failure.

## Key Compliance Wins

**Before Vienna OS:**
- Manual AI oversight processes
- Incomplete audit trails
- Reactive incident response
- Failed SOC 2 pre-assessment

**After Vienna OS:**
- Automated governance workflows
- Complete cryptographic audit trails  
- Proactive risk prevention
- SOC 2 Type I certification achieved

## Getting SOC 2 Ready

1. **Implement governance before deployment**
2. **Document your AI risk framework**
3. **Establish multi-party approval workflows**
4. **Create comprehensive audit trails**
5. **Test incident response procedures**

The key insight: AI governance isn't just about safety—it's about demonstrating control to auditors who need to verify your systems work as described.

---

*Start your SOC 2 journey today. [Vienna OS compliance package →](/compliance)*
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
      <BlogTracker slug={slug} />
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

        <BlogCTA slug={slug} />
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
