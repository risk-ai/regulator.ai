import { Shield, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Vienna OS, AI governance, and enterprise deployment.",
};

const faqs = [
  {
    category: "Product",
    questions: [
      {
        q: "What is Vienna OS?",
        a: "Vienna OS is an enterprise governance control plane for autonomous AI agent systems. It sits between agent intent and real-world execution, enforcing policy, requiring approvals for high-risk actions, and maintaining an immutable audit trail.",
      },
      {
        q: "How is this different from AI guardrails?",
        a: "Guardrails filter what AI says (content safety). Vienna OS governs what AI does (execution authority). When an agent proposes to deploy code, send an email campaign, or execute a transaction, content filtering is irrelevant — the question is: who authorized this, under what policy, with what constraints?",
      },
      {
        q: "What are execution warrants?",
        a: "Warrants are cryptographically signed, time-limited, scope-constrained authorization tokens. Every approved agent action receives one before execution. Post-execution, the Verification Engine confirms the action matched the warrant scope. No warrant = no execution.",
      },
      {
        q: "What agent frameworks does Vienna OS work with?",
        a: "Vienna OS is runtime-agnostic. It works with OpenClaw, LangChain, CrewAI, AutoGen, and any framework that can make HTTP requests. Agents submit intents via the Intent Gateway API, and Vienna handles governance regardless of the calling runtime.",
      },
      {
        q: "Is this open source?",
        a: "The core governance pipeline is open source (GitHub: risk-ai/regulator.ai). The Community tier is free for up to 5 agents. Cloud-hosted and enterprise tiers add managed infrastructure, SSO, compliance certifications, and dedicated support.",
      },
    ],
  },
  {
    category: "Deployment",
    questions: [
      {
        q: "How do I get started?",
        a: (
          <>
            Sign up for the free Community plan at{" "}
            <a href="https://regulator.ai/signup" className="text-purple-400 hover:text-purple-300">
              regulator.ai/signup
            </a>
            . You'll get instant access to the sandbox console at{" "}
            <a href="https://console.regulator.ai" className="text-purple-400 hover:text-purple-300">
              console.regulator.ai
            </a>
            . You can submit your first governed intent in under 60 seconds.
          </>
        ),
      },
      {
        q: "Can I self-host Vienna OS?",
        a: "Yes. The Community tier supports self-hosted deployment. Clone the repo, configure your environment, and deploy. The Enterprise tier adds on-premise deployment with SLA, dedicated CSM, and compliance certifications.",
      },
      {
        q: "What infrastructure does it require?",
        a: "Minimal. Vienna OS runs as a Node.js application with SQLite for the state graph. The production deployment runs on 2 vCPU / 2GB RAM. For enterprise deployments, we support PostgreSQL and horizontal scaling.",
      },
    ],
  },
  {
    category: "Security & Compliance",
    questions: [
      {
        q: "Is data isolated between tenants?",
        a: "Yes. Each tenant's data (proposals, warrants, executions, audit logs) is logically isolated by tenant_id. No cross-tenant data access is possible through the API.",
      },
      {
        q: "What compliance certifications do you have?",
        a: "We're currently operational with rate limiting, encryption in transit, session management, and append-only audit trails. SOC 2 Type I audit is planned for Q4 2026, HIPAA BAA for H1 2027, and FedRAMP assessment in 2027 contingent on government sector demand.",
      },
      {
        q: "How long is audit data retained?",
        a: "7 years by default, configurable per tenant. The audit trail is append-only — events cannot be modified or deleted. This satisfies requirements for SEC, HIPAA, SOX, and EU AI Act record-keeping.",
      },
    ],
  },
  {
    category: "Pricing",
    questions: [
      {
        q: "What does 'per agent' mean?",
        a: "An agent is any autonomous system that submits intents through the governance pipeline. One AI coding assistant = one agent. A fleet of 20 DevOps agents = 20 agents. Each gets its own identity, permissions, and audit history.",
      },
      {
        q: "Is there a free tier?",
        a: "Yes. The Community tier is free for up to 5 agents with full governance pipeline access. No credit card required.",
      },
      {
        q: "Can I try before I buy?",
        a: (
          <>
            Absolutely. Visit{" "}
            <a href="https://regulator.ai/try" className="text-purple-400 hover:text-purple-300">
              regulator.ai/try
            </a>
            {" "}to test the governance API live — no signup required. The Community tier gives you full sandbox console access for free.
          </>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  // Structured data for FAQ page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Vienna OS?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Vienna OS is an enterprise governance control plane for autonomous AI agent systems. It sits between agent intent and real-world execution, enforcing policy, requiring approvals for high-risk actions, and maintaining an immutable audit trail."
        }
      },
      {
        "@type": "Question",
        "name": "How is this different from AI guardrails?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Guardrails filter what AI says (content safety). Vienna OS governs what AI does (execution authority). When an agent proposes to deploy code, send an email campaign, or execute a transaction, content filtering is irrelevant — the question is: who authorized this, under what policy, with what constraints?"
        }
      },
      {
        "@type": "Question",
        "name": "What are execution warrants?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Warrants are cryptographically signed, time-limited, scope-constrained authorization tokens. Every approved agent action receives one before execution. Post-execution, the Verification Engine confirms the action matched the warrant scope. No warrant = no execution."
        }
      },
      {
        "@type": "Question",
        "name": "What agent frameworks does Vienna OS work with?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Vienna OS is runtime-agnostic. It works with OpenClaw, LangChain, CrewAI, AutoGen, and any framework that can make HTTP requests. Agents submit intents via the Intent Gateway API, and Vienna handles governance regardless of the calling runtime."
        }
      },
      {
        "@type": "Question",
        "name": "Is this open source?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The core governance pipeline is open source (GitHub: risk-ai/regulator.ai). The Community tier is free for up to 5 agents. Cloud-hosted and enterprise tiers add managed infrastructure, SSO, compliance certifications, and dedicated support."
        }
      },
      {
        "@type": "Question",
        "name": "How do I get started?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sign up for the free Community plan at regulator.ai/signup. You'll get instant access to the sandbox console at console.regulator.ai. You can submit your first governed intent in under 60 seconds."
        }
      },
      {
        "@type": "Question",
        "name": "Can I self-host Vienna OS?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. The Community tier supports self-hosted deployment. Clone the repo, configure your environment, and deploy. The Enterprise tier adds on-premise deployment with SLA, dedicated CSM, and compliance certifications."
        }
      },
      {
        "@type": "Question",
        "name": "Is data isolated between tenants?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Each tenant's data (proposals, warrants, executions, audit logs) is logically isolated by tenant_id. No cross-tenant data access is possible through the API."
        }
      },
      {
        "@type": "Question",
        "name": "What does 'per agent' mean?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An agent is any autonomous system that submits intents through the governance pipeline. One AI coding assistant = one agent. A fleet of 20 DevOps agents = 20 agents. Each gets its own identity, permissions, and audit history."
        }
      },
      {
        "@type": "Question",
        "name": "Is there a free tier?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. The Community tier is free for up to 5 agents with full governance pipeline access. No credit card required."
        }
      },
      {
        "@type": "Question",
        "name": "What compliance certifications do you have?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We're currently operational with rate limiting, encryption in transit, session management, and append-only audit trails. SOC 2 Type I audit is planned for Q4 2026, HIPAA BAA for H1 2027, and FedRAMP assessment in 2027 contingent on government sector demand."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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
        <h1 className="text-3xl font-bold text-white mb-2">FAQ</h1>
        <p className="text-slate-400 mb-12">
          Everything you need to know about Vienna OS.
        </p>

        <div className="space-y-12">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-4">
                {section.category}
              </h2>
              <div className="space-y-4">
                {section.questions.map((faq) => (
                  <div key={faq.q} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                    <h3 className="text-white font-semibold text-sm mb-2">{faq.q}</h3>
                    <div className="text-slate-400 text-sm leading-relaxed">{faq.a}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm mb-4">Still have questions?</p>
          <a href="/contact" className="text-sm text-purple-400 hover:text-purple-300 font-medium">
            Contact us →
          </a>
        </div>
      </main>
    </div>
  );
}
