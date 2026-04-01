import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Vienna Manifesto — Principles for Governed AI Execution",
  description: "Our beliefs about governance for autonomous AI. 7 principles about warrants-based governance and cryptographic execution authority for responsible AI systems.",
  openGraph: {
    title: "The Vienna Manifesto — Principles for Governed AI Execution",
    description: "7 principles for the governance kernel of autonomous AI. No agent should execute what no human authorized through warrants-based governance.",
  },
};

const principles = [
  {
    number: "I",
    title: "No execution without authorization",
    body: "Every autonomous action must be explicitly authorized before it happens. The default for any AI agent should be denial, not permission. This isn't a limitation — it's the foundation of trust between humans and machines.",
  },
  {
    number: "II",
    title: "Authorization must be cryptographic, not cosmetic",
    body: "A log entry is not authorization. A permissions matrix is not authorization. True authorization means a verifiable, tamper-evident, time-limited token that binds intent to approval to execution. If you can't prove it mathematically, you can't prove it.",
  },
  {
    number: "III",
    title: "Risk must be classified, not assumed",
    body: "Not all actions are equal. A health check and a wire transfer have fundamentally different risk profiles and deserve fundamentally different governance. Systems that treat all actions identically are either too restrictive to be useful or too permissive to be safe.",
  },
  {
    number: "IV",
    title: "Humans must remain in the loop — but not in the way",
    body: "Human oversight is non-negotiable for high-risk actions. But requiring human approval for every read query is a system that will be circumvented. The art is knowing which actions need human judgment and which don't. Risk tiering solves this.",
  },
  {
    number: "V",
    title: "Audit trails must be immutable and complete",
    body: "When something goes wrong — and it will — you need an unimpeachable record of what happened, who authorized it, and why. Mutable logs are fiction. Only cryptographically linked, append-only records can be trusted as evidence.",
  },
  {
    number: "VI",
    title: "Governance must be infrastructure, not afterthought",
    body: "Security bolted on after deployment is theater. Governance must be in the execution path — not watching from the sidelines. The agent doesn't decide whether to ask permission; the system won't execute without it.",
  },
  {
    number: "VII",
    title: "The cost of governance must be less than the cost of failure",
    body: "If your governance system is slower than your agents, people will route around it. If it's more expensive than the risks it prevents, no one will use it. Governance that works is governance that's fast enough to be invisible and cheap enough to be default.",
  },
];

export default function ManifestoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-navy-950 to-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-12">
        <Link href="/" className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-12 transition">
          <Shield className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          The Vienna Manifesto
        </h1>
        <p className="text-xl text-slate-300 italic mb-2">
          Principles for governed AI execution
        </p>
        <div className="w-16 h-1 bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full mb-12" />
        
        <div className="prose prose-lg prose-invert max-w-none mb-12">
          <p className="text-slate-300 leading-relaxed text-lg">
            We are building a world where AI agents act autonomously on behalf of humans and organizations. 
            They will deploy code, move money, manage infrastructure, make business decisions, and interact 
            with the physical world. This is not a future scenario — it is happening now.
          </p>
          <p className="text-slate-300 leading-relaxed text-lg mt-4">
            The question is not whether AI agents will be autonomous. The question is whether 
            that autonomy will be governed. These are our beliefs about what governed means.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-24">
        <div className="space-y-12">
          {principles.map((p, i) => (
            <div key={i} className="border-l-2 border-violet-500/30 pl-8">
              <div className="text-sm text-violet-400 font-medium mb-2">Principle {p.number}</div>
              <h2 className="text-2xl font-bold mb-4">{p.title}</h2>
              <p className="text-slate-300 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        {/* Closing */}
        <div className="mt-16 border-t border-slate-800 pt-12">
          <p className="text-slate-300 leading-relaxed text-lg">
            These principles are not aspirational. They are implemented in code. Vienna OS exists because 
            we believe the gap between &ldquo;AI agents should be governed&rdquo; and &ldquo;AI agents are 
            governed&rdquo; must be closed with infrastructure, not intentions.
          </p>
          <p className="text-slate-300 leading-relaxed text-lg mt-4">
            If you believe the same, <Link href="/signup" className="text-violet-400 hover:underline">join us</Link>.
          </p>
          <div className="mt-8 text-sm text-slate-500">
            — The Vienna OS Team, March 2026
          </div>
        </div>
      </div>
    </main>
  );
}
