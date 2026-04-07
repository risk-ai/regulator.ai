"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield,
  Lock,
  FileCheck,
  ArrowRight,
  CheckCircle,
  Menu,
  X,
  Zap,
  GitBranch,
  Users,
  Beaker,
  FileText,
  Clock,
  Github,
} from "lucide-react";
import Link from "next/link";
import { analytics } from "@/lib/analytics";

/* ============================================================
   NETWORK BACKGROUND (from SuperDesign - approved style)
   ============================================================ */

function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    const PARTICLE_COUNT = 25; // Reduced from SuperDesign draft
    const CONNECTION_DIST = 150;

    interface Particle { x: number; y: number; vx: number; vy: number; }
    let particles: Particle[] = [];

    function resize() {
      const rect = canvas!.parentElement!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = w * devicePixelRatio;
      canvas!.height = h * devicePixelRatio;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
        });
      }
    }

    function frame() {
      ctx!.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }

      ctx!.strokeStyle = "rgba(167, 139, 250, 0.04)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = dx * dx + dy * dy;
          if (dist < CONNECTION_DIST * CONNECTION_DIST) {
            const alpha = 1 - Math.sqrt(dist) / CONNECTION_DIST;
            ctx!.strokeStyle = `rgba(167, 139, 250, ${alpha * 0.06})`;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      ctx!.fillStyle = "rgba(167, 139, 250, 0.10)";
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx!.fill();
      }

      animRef.current = requestAnimationFrame(frame);
    }

    resize();
    initParticles();
    frame();

    const onResize = () => { resize(); initParticles(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    analytics.page("Homepage");
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100">
      {/* ============================================================
          NAVIGATION (Consistent header)
          ============================================================ */}
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-400" />
              <span>Vienna<span className="text-purple-400">OS</span></span>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/docs" className="text-gray-400 hover:text-white transition-colors">
                Docs
              </Link>
              <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/compare" className="text-gray-400 hover:text-white transition-colors">
                Compare
              </Link>
              <Link href="/try" className="text-gray-400 hover:text-white transition-colors">
                Try
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a
              href="https://github.com/risk-ai/vienna-os"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://console.regulator.ai"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </a>
            <a
              href="https://console.regulator.ai/signup"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Start Free Trial
            </a>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#09090b] border-t border-white/5 px-6 py-4 space-y-3">
            <Link href="/docs" className="block text-sm text-gray-400">Docs</Link>
            <Link href="/pricing" className="block text-sm text-gray-400">Pricing</Link>
            <Link href="/compare" className="block text-sm text-gray-400">Compare</Link>
            <Link href="/try" className="block text-sm text-gray-400">Try</Link>
            <a href="https://github.com/risk-ai/vienna-os" target="_blank" rel="noopener noreferrer" className="block text-sm text-gray-400">GitHub</a>
            <a href="https://console.regulator.ai" className="block text-sm text-gray-400">Sign In</a>
            <a href="https://console.regulator.ai/signup" className="block px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg text-center">
              Start Free Trial
            </a>
          </div>
        )}
      </nav>

      {/* ============================================================
          SECTION 1: HERO + WARRANT CARD
          ============================================================ */}
      <section className="relative overflow-hidden" style={{ minHeight: "80vh" }}>
        <NetworkBackground />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Open Governance Standard for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300 to-amber-400">
                Autonomous AI
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Cryptographic warrants + Merkle audit chain for safe, verifiable AI operations.
              The first open standard for AI governance.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a
                href="https://console.regulator.ai/signup"
                className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/50"
              >
                Start Free Trial
              </a>
              <Link
                href="/docs"
                className="px-8 py-4 border border-purple-500/30 hover:border-purple-500/60 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
              >
                View Docs <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="text-sm text-gray-500">
              <span className="inline-flex items-center gap-2 mr-4">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                USPTO Patent #64/018,152
              </span>
              <span className="inline-flex items-center gap-2 mr-4">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Open Source (BSL 1.1)
              </span>
              <span>30-day free trial</span>
            </div>
          </div>

          {/* Warrant Card (SuperDesign approved visual) */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="relative">
              <div className="bg-[#0D0F14] border border-amber-500/20 rounded-xl p-8 shadow-2xl hover:border-amber-500/40 transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-amber-500" />
                    <span className="font-mono text-sm font-semibold">Execution Warrant</span>
                  </div>
                  <span className="px-3 py-1 rounded text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ✓ Verified
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Scope</p>
                    <div className="space-y-1 font-mono text-sm">
                      <div><span className="text-gray-500">action:</span> restart_service</div>
                      <div><span className="text-gray-500">target:</span> api-gateway</div>
                      <div><span className="text-gray-500">strategy:</span> rolling</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Authority</p>
                    <div className="space-y-1 font-mono text-sm">
                      <div><span className="text-gray-500">issuer:</span> operator:jane</div>
                      <div><span className="text-gray-500">risk_tier:</span> <span className="text-amber-400">T1</span></div>
                      <div><span className="text-gray-500">policy:</span> svc-restart-v2</div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Constraints</p>
                  <div className="grid grid-cols-3 gap-4 font-mono text-sm">
                    <div><span className="text-gray-500">ttl:</span> 300s</div>
                    <div><span className="text-gray-500">max_retries:</span> 1</div>
                    <div><span className="text-gray-500">rollback:</span> enabled</div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-gray-500">sig:</span>{" "}
                      <span className="text-amber-400">0x7f3a2b1c...b2c1</span>
                    </div>
                    <div className="text-gray-600">sha256 · tamper-evident</div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      issued 14:00:00Z
                    </div>
                    <div>•</div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      expires 14:05:00Z
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: HOW IT WORKS
          ============================================================ */}
      <section className="py-20 bg-gradient-to-b from-transparent to-purple-950/10">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-gray-400 max-w-2xl mx-auto mb-16">
            Three steps from agent intent to verified execution
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="absolute top-0 left-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xl">
                1
              </div>
              <div className="ml-16">
                <h3 className="text-xl font-semibold mb-2">Define Policy</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Write governance rules in plain English. Vienna compiles them into formal policy logic.
                </p>
                <div className="bg-black/30 p-3 rounded font-mono text-xs text-gray-400">
                  "Require CFO approval for<br />
                  wire transfers over $50K"
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-0 left-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xl">
                2
              </div>
              <div className="ml-16">
                <h3 className="text-xl font-semibold mb-2">Issue Warrant</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Approved actions receive cryptographic warrants. Time-limited, scope-bound authorization tokens.
                </p>
                <div className="bg-black/30 p-3 rounded font-mono text-xs text-gray-400">
                  warrant_id: wrt_7f3a...<br />
                  ttl: 300s<br />
                  sig: 0x7f3a2b1c...
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-0 left-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xl">
                3
              </div>
              <div className="ml-16">
                <h3 className="text-xl font-semibold mb-2">Verify Execution</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Agent executes with warrant proof. Vienna verifies action stayed within bounds, logs to Merkle chain.
                </p>
                <div className="flex gap-2 flex-wrap mt-4">
                  <span className="px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ✓ Verified
                  </span>
                  <span className="px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    Merkle Chain
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: TIERED GOVERNANCE
          ============================================================ */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Risk-Based Governance</h2>
          <p className="text-center text-gray-400 max-w-2xl mx-auto mb-16">
            Four risk tiers determine approval requirements, from auto-approved reads to multi-party sign-off
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#1a1a28] border border-gray-700/30 rounded-lg p-6 hover:border-gray-600/50 transition-colors">
              <span className="inline-block px-3 py-1 rounded text-sm font-mono mb-3 bg-gray-700/20 text-gray-400 border border-gray-700/40">
                T0
              </span>
              <h3 className="text-lg font-semibold mb-2">Auto-Approve</h3>
              <p className="text-sm text-gray-400">
                Read-only operations. Zero-risk actions proceed immediately.
              </p>
            </div>

            <div className="bg-[#1a1a28] border border-emerald-700/30 rounded-lg p-6 hover:border-emerald-600/50 transition-colors">
              <span className="inline-block px-3 py-1 rounded text-sm font-mono mb-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                T1
              </span>
              <h3 className="text-lg font-semibold mb-2">Low Risk</h3>
              <p className="text-sm text-gray-400">
                Automated approval with audit trail. Safe, routine operations.
              </p>
            </div>

            <div className="bg-[#1a1a28] border border-amber-700/30 rounded-lg p-6 hover:border-amber-600/50 transition-colors">
              <span className="inline-block px-3 py-1 rounded text-sm font-mono mb-3 bg-amber-500/10 text-amber-400 border border-amber-500/30">
                T2
              </span>
              <h3 className="text-lg font-semibold mb-2">High Risk</h3>
              <p className="text-sm text-gray-400">
                Human approval required. Production deployments, financial transactions.
              </p>
            </div>

            <div className="bg-[#1a1a28] border border-red-700/30 rounded-lg p-6 hover:border-red-600/50 transition-colors">
              <span className="inline-block px-3 py-1 rounded text-sm font-mono mb-3 bg-red-500/10 text-red-400 border border-red-500/30">
                T3
              </span>
              <h3 className="text-lg font-semibold mb-2">Critical</h3>
              <p className="text-sm text-gray-400">
                Multi-party sign-off. Irreversible actions, regulatory compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: CORE CAPABILITIES
          ============================================================ */}
      <section className="py-20 bg-gradient-to-b from-purple-950/10 to-transparent">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Core Capabilities</h2>
          <p className="text-center text-gray-400 max-w-2xl mx-auto mb-16">
            Advanced features for production AI governance
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0D0F14] border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-all">
              <div className="flex items-start gap-4">
                <Zap className="w-8 h-8 text-purple-400 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Natural Language Policies</h3>
                  <p className="text-gray-400 text-sm">
                    Write governance rules in plain English. No code deployment required. Vienna compiles to formal policy logic automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0D0F14] border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-all">
              <div className="flex items-start gap-4">
                <GitBranch className="w-8 h-8 text-purple-400 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Merkle Warrant Chain</h3>
                  <p className="text-gray-400 text-sm">
                    Tamper-proof cryptographic audit trail. Every warrant is chained using Merkle trees for verifiable governance history.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0D0F14] border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-all">
              <div className="flex items-start gap-4">
                <Users className="w-8 h-8 text-purple-400 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Cross-Agent Delegation</h3>
                  <p className="text-gray-400 text-sm">
                    Agents can delegate execution authority to other agents with constraints. Enables complex multi-agent workflows.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0D0F14] border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-all">
              <div className="flex items-start gap-4">
                <Beaker className="w-8 h-8 text-purple-400 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Policy Simulation</h3>
                  <p className="text-gray-400 text-sm">
                    Dry-run policy evaluation before deploying changes. Test governance rules without production risk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5: INTEGRATION
          ============================================================ */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Easy Integration</h2>
          <p className="text-center text-gray-400 max-w-2xl mx-auto mb-16">
            Production-ready SDKs and framework integrations
          </p>

          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-8 mb-8 flex-wrap">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-purple-600/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-purple-400" />
                </div>
                <span className="text-sm text-gray-400">Node.js</span>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-purple-600/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-purple-400" />
                </div>
                <span className="text-sm text-gray-400">Python</span>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-purple-600/10 rounded-lg flex items-center justify-center">
                  <Github className="w-8 h-8 text-purple-400" />
                </div>
                <span className="text-sm text-gray-400">GitHub Actions</span>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-purple-600/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-purple-400" />
                </div>
                <span className="text-sm text-gray-400">Terraform</span>
              </div>
            </div>

            <div className="bg-black/40 border border-gray-700/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-2 text-xs text-gray-500 font-mono">install.sh</span>
              </div>
              <pre className="text-sm font-mono text-gray-300">
                <code>
{`# Install SDK
npm install @vienna-os/sdk
pip install vienna-os

# Submit an intent
import { ViennaClient } from '@vienna-os/sdk';

const vienna = new ViennaClient({
  endpoint: 'https://console.regulator.ai'
});

await vienna.submitIntent({
  action: 'deploy_service',
  payload: { service: 'api', version: 'v2.1.0' }
});`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 6: SOCIAL PROOF / OPEN SOURCE
          ============================================================ */}
      <section className="py-20 bg-gradient-to-b from-transparent to-purple-950/10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Open Warrant Standard</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-12">
            Vienna OS implements the Open Warrant Standard (OWS) v1.0 — a portable execution authorization protocol for AI systems
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-[#0D0F14] border border-purple-500/20 rounded-lg p-6">
              <div className="text-3xl font-bold text-purple-400 mb-2">100ms</div>
              <div className="text-sm text-gray-400">Policy evaluation</div>
            </div>
            <div className="bg-[#0D0F14] border border-purple-500/20 rounded-lg p-6">
              <div className="text-3xl font-bold text-purple-400 mb-2">SHA-256</div>
              <div className="text-sm text-gray-400">Cryptographic signatures</div>
            </div>
            <div className="bg-[#0D0F14] border border-purple-500/20 rounded-lg p-6">
              <div className="text-3xl font-bold text-purple-400 mb-2">Zero-Trust</div>
              <div className="text-sm text-gray-400">Every action verified</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 flex-wrap text-sm text-gray-500">
            <a
              href="https://github.com/risk-ai/vienna-os"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
              Open Source (BSL 1.1)
            </a>
            <span>•</span>
            <span>USPTO Patent #64/018,152</span>
            <span>•</span>
            <span>Built at Cornell Law × ai.ventures</span>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 7: FINAL CTA
          ============================================================ */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Start Governing Your AI Agents
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Deploy Vienna OS in minutes. Free 30-day trial, no credit card required.
          </p>
          <a
            href="https://console.regulator.ai/signup"
            className="inline-block px-10 py-5 bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/50"
          >
            Start Free Trial
          </a>
          <p className="mt-4 text-sm text-gray-500">
            30-day trial • No credit card • Cancel anytime
          </p>
        </div>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/try" className="hover:text-white transition-colors">Try</Link></li>
                <li><a href="https://console.regulator.ai" className="hover:text-white transition-colors">Console</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Compare</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/compare/guardrails-ai" className="hover:text-white transition-colors">vs Guardrails AI</Link></li>
                <li><Link href="/compare/arthur-ai" className="hover:text-white transition-colors">vs Arthur AI</Link></li>
                <li><Link href="/compare/credo-ai" className="hover:text-white transition-colors">vs Credo AI</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><a href="https://github.com/risk-ai/vienna-os" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Shield className="w-5 h-5 text-purple-400" />
              <span>© 2026 Vienna OS. BSL 1.1 License.</span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <a href="https://github.com/risk-ai/vienna-os" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">GitHub</a>
              <a href="https://discord.gg/vienna-os" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Discord</a>
              <a href="https://twitter.com/viennaos" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
