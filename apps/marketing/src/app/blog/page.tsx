"use client";

import { Shield, ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { useEffect } from "react";
import Link from "next/link";
import { analytics } from "@/lib/analytics";

// Note: metadata moved to metadata.ts for client components

const posts = [
  {
    slug: "execution-gap-warrants-not-guardrails",
    title: "The Execution Gap: Why AI Governance Needs Warrants, Not Just Guardrails",
    excerpt:
      "Current AI safety focuses on model outputs, not agent actions. Learn why warrant-based authorization is the missing piece in the DIR framework: deliberate scope, intentional authorization, responsible audit.",
    date: "March 30, 2026",
    readTime: "9 min",
    category: "Governance",
    categoryColor: "text-purple-400 bg-purple-500/10",
    author: "Max Anderson",
  },
  {
    slug: "rbac-to-warrants-access-control-evolution",
    title: "From RBAC to Warrants: Rethinking Access Control for Autonomous Agents",
    excerpt:
      "Traditional access control fails for autonomous agents. See concrete examples where RBAC/ABAC breaks down and how warrant-based governance provides the evolution enterprises need.",
    date: "March 30, 2026",
    readTime: "8 min",
    category: "Architecture",
    categoryColor: "text-blue-400 bg-blue-500/10",
    author: "Max Anderson",
  },
  {
    slug: "immutable-audit-trail-financial-compliance",
    title: "Building an Immutable Audit Trail for AI: Lessons from Financial Compliance",
    excerpt:
      "SOX and Basel III requirements meet AI governance. Learn how Vienna OS's cryptographic logging satisfies financial compliance and provides a practical roadmap for audit trails.",
    date: "March 30, 2026",
    readTime: "10 min",
    category: "Compliance",
    categoryColor: "text-emerald-400 bg-emerald-500/10",
    author: "Max Anderson",
  },
  {
    slug: "zero-trust-ai-agent-pipeline",
    title: "Building a Zero-Trust AI Agent Pipeline",
    excerpt:
      "Zero trust isn't just for networks — it applies to AI agents too. Learn how to implement zero-trust security with Vienna OS: never trust, always verify, every action, every time.",
    date: "March 28, 2026",
    readTime: "8 min",
    category: "Security",
    categoryColor: "text-blue-400 bg-blue-500/10",
    author: "Vienna OS Team",
  },
  {
    slug: "ai-agent-disasters-prevented",
    title: "5 AI Agent Disasters That Could Have Been Prevented with Execution Control",
    excerpt:
      "Real stories of AI incidents: a $60K overnight cloud bill, PHI exposed to public buckets, unauthorized trading losses. Learn how Vienna OS prevents these disasters through governance.",
    date: "March 28, 2026",
    readTime: "9 min",
    category: "Risk Management",
    categoryColor: "text-red-400 bg-red-500/10",
    author: "ai.ventures",
  },
  {
    slug: "hipaa-compliance-ai-agents",
    title: "HIPAA Compliance for AI Agents: A Practical Guide",
    excerpt:
      "Healthcare AI agents need more than content filtering—they need PHI-scoped governance. Complete guide to HIPAA-compliant AI with execution warrants and audit trails.",
    date: "March 28, 2026",
    readTime: "8 min",
    category: "Healthcare",
    categoryColor: "text-green-400 bg-green-500/10",
    author: "ai.ventures",
  },
  {
    slug: "how-execution-warrants-work",
    title: "How Execution Warrants Work: The Core of Vienna OS",
    excerpt:
      "Every action in Vienna OS requires a cryptographic warrant — signed, scoped, and time-limited. Walk through the complete warrant lifecycle from intent to audit, with code examples.",
    date: "March 28, 2026",
    readTime: "8 min",
    category: "Deep Dive",
    categoryColor: "text-amber-400 bg-amber-500/10",
    author: "ai.ventures",
  },
  {
    slug: "vienna-os-vs-guardrails-ai",
    title: "Vienna OS vs Guardrails AI: Execution Control vs Prompt Filtering",
    excerpt:
      "There are four layers of AI governance. Only one controls execution. See how Vienna OS compares to Guardrails AI, Arthur, and Credo AI across the full governance stack.",
    date: "March 28, 2026",
    readTime: "7 min",
    category: "Comparison",
    categoryColor: "text-purple-400 bg-purple-500/10",
    author: "ai.ventures",
  },
  {
    slug: "governing-langchain-agents",
    title: "Governing LangChain Agents in Production with Vienna OS",
    excerpt:
      "LangChain agents are powerful but ungoverned in production. Add execution control in 5 lines of Python — risk tiering, cryptographic warrants, and immutable audit trails.",
    date: "March 28, 2026",
    readTime: "10 min",
    category: "Integration",
    categoryColor: "text-blue-400 bg-blue-500/10",
    author: "ai.ventures",
  },
  {
    slug: "why-ai-agents-need-governance",
    title: "Why Your AI Agents Need a Governance Layer (Before Something Goes Wrong)",
    excerpt:
      "Picture this: 3:17 AM, your phone buzzes with alerts. Your AI agent just scaled your cluster to 500 nodes. Monthly cost? $60,000. This actually happened to us, and it's why we built Vienna OS.",
    date: "March 27, 2026",
    readTime: "8 min",
    category: "Governance",
    categoryColor: "text-purple-400 bg-purple-500/10",
    author: "Max Anderson",
  },
  {
    slug: "warrants-vs-guardrails",
    title: "Warrants vs Guardrails: A Better Model for AI Agent Control",
    excerpt:
      "Guardrails react to outputs after AI models decide. Warrants govern actions before they execute. Here's why the distinction matters for autonomous agents with real-world consequences.",
    date: "March 27, 2026",
    readTime: "8 min",
    category: "Architecture",
    categoryColor: "text-blue-400 bg-blue-500/10",
    author: "Max Anderson",
  },
  {
    slug: "soc2-for-ai-systems",
    title: "SOC 2 Compliance for AI Agent Systems: What Auditors Want to See",
    excerpt:
      "Vienna OS became the first AI agent governance platform to achieve SOC 2 Type I compliance. Here's what we learned about bridging traditional IT controls and autonomous AI systems.",
    date: "March 27, 2026",
    readTime: "12 min",
    category: "Compliance",
    categoryColor: "text-emerald-400 bg-emerald-500/10",
    author: "Max Anderson",
  },
  {
    slug: "cryptographic-warrants-explained",
    title: "Cryptographic Execution Warrants: The Missing Primitive for AI Agent Security",
    excerpt:
      "Every approved action in Vienna OS receives a signed warrant — a time-limited, scope-constrained, tamper-evident authorization. Here's how it works and why it matters.",
    date: "March 25, 2026",
    readTime: "10 min",
    category: "Architecture",
    categoryColor: "text-blue-400 bg-blue-500/10",
    author: "Team",
  },
  {
    slug: "eu-ai-act-agent-compliance",
    title: "EU AI Act 2026: What It Means for Autonomous Agent Deployments",
    excerpt:
      "The EU AI Act requires transparency, human oversight, and audit trails for high-risk AI systems. Here's how governed execution satisfies these requirements.",
    date: "March 25, 2026",
    readTime: "6 min",
    category: "Compliance",
    categoryColor: "text-emerald-400 bg-emerald-500/10",
    author: "Team",
  },
  {
    slug: "risk-tiering-framework",
    title: "Designing a Risk Tiering Framework for AI Agent Actions",
    excerpt:
      "Not all agent actions are equal. A file read shouldn't require the same approval as a wire transfer. Here's how to classify agent actions by risk level.",
    date: "March 25, 2026",
    readTime: "7 min",
    category: "Framework",
    categoryColor: "text-amber-400 bg-amber-500/10",
    author: "Team",
  },
  {
    slug: "execution-gap-warrants-not-guardrails",
    title: "The Execution Gap: Why AI Governance Needs Warrants, Not Just Guardrails",
    excerpt:
      "Current AI safety focuses on model outputs, not agent actions. The DIR framework — Deliberate scope, Intentional authorization, Responsible audit — closes the execution gap that guardrails leave wide open.",
    date: "March 30, 2026",
    readTime: "11 min",
    category: "Thought Leadership",
    categoryColor: "text-violet-400 bg-violet-500/10",
    author: "Max Anderson",
  },
  {
    slug: "rbac-to-warrants-access-control-evolution",
    title: "From RBAC to Warrants: Rethinking Access Control for Autonomous Agents",
    excerpt:
      "RBAC and ABAC were built for humans clicking buttons, not agents planning multi-step operations. Here's why warrant-based governance is the natural evolution — with concrete failure modes and fixes.",
    date: "March 30, 2026",
    readTime: "10 min",
    category: "Architecture",
    categoryColor: "text-blue-400 bg-blue-500/10",
    author: "Max Anderson",
  },
  {
    slug: "immutable-audit-trail-financial-compliance",
    title: "Building an Immutable Audit Trail for AI: Lessons from Financial Compliance",
    excerpt:
      "SOX, Basel III, and MiFID II demand provable records. AI governance needs the same rigor. Learn how Vienna OS's cryptographic logging meets financial-grade compliance requirements.",
    date: "March 30, 2026",
    readTime: "12 min",
    category: "Compliance",
    categoryColor: "text-emerald-400 bg-emerald-500/10",
    author: "Max Anderson",
  },
];

export default function BlogPage() {
  // Track blog page view
  useEffect(() => {
    analytics.blogView('index');
  }, []);

  const handlePostClick = (slug: string) => {
    analytics.blogView(slug);
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-7 h-7 text-violet-400" />
            <span className="font-bold text-white">
              Vienna<span className="text-purple-400">OS</span>
            </span>
          </a>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-sm text-slate-400 hover:text-white transition">Docs</a>
            <a
              href="/signup"
              className="text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition font-medium"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Blog</h1>
        <p className="text-slate-400 mb-12">
          Insights on AI governance, agent compliance, and building trustworthy
          autonomous systems.
        </p>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              onClick={() => handlePostClick(post.slug)}
              className="block bg-navy-800 border border-navy-700 rounded-xl p-6 hover:border-navy-600 transition group"
            >
              <div className="flex items-center gap-3 mb-3">
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
              <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition">
                {post.title}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-3">
                {post.excerpt}
              </p>
              <span className="inline-flex items-center gap-1 text-sm text-purple-400 font-medium">
                Read more <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-navy-700 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-xs text-slate-600">
            © 2026 Technetwork 2 LLC dba ai.ventures. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
