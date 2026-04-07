import { ArrowRight, CheckCircle, FileText } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <>
{/* HERO SECTION */}
<section className="pt-20 pb-32 px-6 relative z-10">
  <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
    {/* Left Column: Text */}
    <div className="space-y-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10">
        <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
          V1.2.0 GOVERNANCE PROTOCOL ACTIVE
        </span>
      </div>

      <h1 className="text-6xl md:text-7xl font-display font-bold tracking-tighter leading-[0.95]">
        Authorization at the <span className="text-zinc-500">Speed of Intelligence.</span>
      </h1>

      <p className="text-xl text-zinc-400 max-w-xl leading-relaxed">
        The governance operating system for autonomous AI agents. Issue tamper-proof cryptographic warrants to authorize high-stakes operations in real-time.
      </p>

      <div className="flex flex-wrap gap-4">
        <a 
          href="https://console.regulator.ai/signup" 
          className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all group" aria-label="Start free trial"
        >
          Start Free — No Credit Card
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </a>
        <Link 
          href="/docs"
          className="bg-zinc-900 border border-white/10 hover:border-white/20 text-white px-8 py-4 rounded-xl font-bold transition-all"
        >
          Read Technical Spec
        </Link>
      </div>

      <div className="flex items-center gap-8 pt-8 border-t border-white/5">
        <div>
          <div className="text-2xl font-display font-bold">100ms</div>
          <div className="text-xs text-zinc-500 uppercase font-mono">Policy Evaluation</div>
        </div>
        <div>
          <div className="text-2xl font-display font-bold">SHA-256</div>
          <div className="text-xs text-zinc-500 uppercase font-mono">Audit Integrity</div>
        </div>
        <div>
          <div className="text-2xl font-display font-bold">Zero-Trust</div>
          <div className="text-xs text-zinc-500 uppercase font-mono">Agent Architecture</div>
        </div>
      </div>
    </div>

    {/* Right Column: Warrant Card */}
    <div className="relative lg:block flex justify-center">
      <div className="w-full max-w-[520px] animate-float bg-zinc-950 border border-zinc-800 animate-pulse-glow rounded-2xl shadow-2xl p-1 overflow-hidden animate-float">
        <div 
          className="bg-zinc-900/50 rounded-xl p-8 relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}
        >
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl"></div>

          <div className="flex justify-between items-start mb-12">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-6 h-6 text-amber-500" />
                <span className="font-mono text-sm font-bold tracking-tighter">EXECUTION_WARRANT</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500">SERIAL: WRT-7F3A-82B1-4D9E</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-[10px] font-mono font-bold text-green-500">VERIFIED AUTH</span>
              </div>
              <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded">
                <span className="text-[10px] font-mono font-bold text-amber-500">TIER: T2</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Principal Agent</div>
                <div className="font-mono text-sm text-zinc-200">AGENT_SIGMA_V4</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Action Scope</div>
                <div className="font-mono text-sm text-zinc-200">DB_SCHEMA_MIGRATION</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Authorized By</div>
                <div className="font-mono text-sm text-zinc-200">S. CHEN (VP ENG)</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Target Env</div>
                <div className="font-mono text-sm text-amber-500 underline underline-offset-4 decoration-amber-500/30">
                  PRODUCTION_CLUSTER_01
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-dashed border-zinc-800">
            <div className="text-[10px] text-zinc-500 font-mono uppercase mb-3">
              Cryptographic Signature (SHA-256)
            </div>
            <div className="bg-black/40 p-4 rounded-lg font-mono text-[11px] leading-relaxed text-zinc-400 break-all border border-white/5">
              0x7f3a2b1c00918e77a2d1f4e5c8b9a0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f90
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="text-[9px] text-zinc-600 font-mono">
                ISSUED: 14:02:44 GMT • EXPIRES: +300S
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background accents */}
      <div className="absolute -bottom-6 -left-6 w-full h-full bg-violet-500/10 -z-10 rounded-2xl blur-2xl"></div>
      <div className="absolute top-1/2 -right-12 w-24 h-24 bg-amber-500/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
    </div>
  </div>
</section>

    </>
  );
}
