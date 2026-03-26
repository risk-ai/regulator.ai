"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield,
  Lock,
  FileCheck,
  Eye,
  BookOpen,
  Workflow,
  ArrowRight,
  CheckCircle,
  Zap,
  Users,
  Server,
  Check,
  Menu,
  X,
  BarChart3,
  Fingerprint,
  Scale,
  Play,
} from "lucide-react";

/* ============================================================
   ANIMATION COMPONENTS
   ============================================================ */

/** Network constellation background — canvas-based particle system */
function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    const PARTICLE_COUNT = 40;
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

      // Update positions
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }

      // Draw connections
      ctx!.strokeStyle = "rgba(167, 139, 250, 0.05)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = dx * dx + dy * dy;
          if (dist < CONNECTION_DIST * CONNECTION_DIST) {
            const alpha = 1 - Math.sqrt(dist) / CONNECTION_DIST;
            ctx!.strokeStyle = `rgba(167, 139, 250, ${alpha * 0.08})`;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      // Draw dots
      ctx!.fillStyle = "rgba(167, 139, 250, 0.12)";
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

/** Animated stats — count up on scroll */
function AnimatedStat({ value, suffix = "", label, sub }: { value: number | string; suffix?: string; label: string; sub: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState("0");
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setDisplay(typeof value === "number" ? value.toLocaleString() : String(value));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          if (typeof value === "number") {
            const duration = 1500;
            const start = performance.now();
            const animate = (now: number) => {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              // easeOutExpo
              const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
              const current = Math.round(eased * value);
              setDisplay(current.toLocaleString());
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          } else {
            setDisplay(String(value));
          }
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-white mb-1 stat-number">
        {display}{suffix}
      </div>
      <div className="text-sm text-purple-400 font-semibold mb-0.5">{label}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

/** Animated pipeline — sequential pulse */
function AnimatedPipeline() {
  const STEPS = ["Intent", "Policy", "Risk Tier", "Approval", "Warrant", "Execute", "Verify", "Audit"];
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    let step = 0;
    const interval = setInterval(() => {
      setActiveIndex(step % STEPS.length);
      step++;
    }, 700);
    return () => clearInterval(interval);
  }, [isVisible]);

  const getStepStyle = (step: string, i: number) => {
    const isActive = i === activeIndex;
    if (step === "Warrant") {
      return `px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all duration-500 bg-amber-500/15 text-amber-400 border border-amber-500/30 seal-glow ${isActive ? "!bg-amber-500/30 !border-amber-400 !shadow-[0_0_16px_rgba(245,158,11,0.3)]" : ""}`;
    }
    if (isActive) {
      return "px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all duration-500 bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(124,58,237,0.2)]";
    }
    const baseMap: Record<string, string> = {
      "Approval": "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      "Execute": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      "Verify": "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    };
    return `px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all duration-500 ${baseMap[step] || "bg-navy-900/80 text-slate-400 border border-navy-700"}`;
  };

  return (
    <div ref={containerRef} className="doc-border rounded-2xl">
      <div className="bg-navy-800/50 rounded-2xl p-6 md:p-8">
        <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-4">Governance Pipeline</p>
        <div className="flex items-center gap-1 flex-wrap justify-center">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <div className={getStepStyle(step, i)}>
                {step}
              </div>
              {i < 7 && <ArrowRight className="w-3 h-3 text-navy-600 pipeline-arrow" style={{ animationDelay: `${i * 0.15}s` }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Typewriter code block */
function TypewriterCode() {
  const lines = [
    { text: "// Agent submits intent", cls: "text-slate-500" },
    { text: "POST /api/v1/agent/intent", cls: "", parts: [{ text: "POST", cls: "text-purple-400" }, { text: " ", cls: "" }, { text: "/api/v1/agent/intent", cls: "text-emerald-400" }] },
    { text: "{", cls: "text-amber-400" },
    { text: '  action: "restart_service",', cls: "", parts: [{ text: "  action", cls: "text-emerald-400" }, { text: ': ', cls: "" }, { text: '"restart_service"', cls: "text-green-300" }, { text: ",", cls: "" }] },
    { text: '  source: "your-agent",', cls: "", parts: [{ text: "  source", cls: "text-emerald-400" }, { text: ': ', cls: "" }, { text: '"your-agent"', cls: "text-green-300" }, { text: ",", cls: "" }] },
    { text: '  tenant_id: "prod"', cls: "", parts: [{ text: "  tenant_id", cls: "text-emerald-400" }, { text: ': ', cls: "" }, { text: '"prod"', cls: "text-green-300" }] },
    { text: "}", cls: "text-amber-400" },
    { text: "", cls: "" },
    { text: "// Vienna evaluates → issues warrant → executes", cls: "text-slate-500" },
    { text: "{", cls: "text-amber-400" },
    { text: "  success: true,", cls: "", parts: [{ text: "  success", cls: "text-emerald-400" }, { text: ": ", cls: "" }, { text: "true", cls: "text-blue-400" }, { text: ",", cls: "" }] },
    { text: '  status: "executed",', cls: "", parts: [{ text: "  status", cls: "text-emerald-400" }, { text: ': ', cls: "" }, { text: '"executed"', cls: "text-green-300" }, { text: ",", cls: "" }] },
    { text: '  warrant_id: "wrt-7f3a...",', cls: "", parts: [{ text: "  warrant_id", cls: "text-emerald-400" }, { text: ': ', cls: "" }, { text: '"wrt-7f3a..."', cls: "text-green-300" }, { text: ",", cls: "" }] },
    { text: "  verified: true", cls: "", parts: [{ text: "  verified", cls: "text-emerald-400" }, { text: ": ", cls: "" }, { text: "true", cls: "text-blue-400" }] },
    { text: "}", cls: "text-amber-400" },
  ];

  const [visibleLines, setVisibleLines] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setVisibleLines(lines.length);
      setDone(true);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= lines.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [started]);

  const renderLine = (line: typeof lines[0]) => {
    if (line.parts) {
      return line.parts.map((p, j) => (
        <span key={j} className={p.cls}>{p.text}</span>
      ));
    }
    return <span className={line.cls}>{line.text}</span>;
  };

  return (
    <div ref={ref} className="bg-navy-800 border border-navy-700 rounded-xl p-5 font-mono text-xs text-slate-300 overflow-x-auto min-h-[320px]">
      {lines.slice(0, visibleLines).map((line, i) => (
        <div key={i} className={line.text === "" ? "h-3" : ""}>
          {renderLine(line)}
          {i === visibleLines - 1 && !done && <span className="typewriter-cursor" />}
        </div>
      ))}
      {done && (
        <div>
          <span className="typewriter-cursor" />
        </div>
      )}
    </div>
  );
}

/** Hook: observe scroll intersection and apply .visible class */
function useScrollFadeUp() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/** Wrapper for staggered scroll-reveal children */
function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useScrollFadeUp();
  return (
    <div ref={ref} className={`scroll-fade-up ${className}`} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

/* ============================================================
   REGULATOR.AI — LANDING PAGE
   Design reference: fraud.net (visual complexity + succinctness)
   ============================================================ */

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-navy-900">

      {/* ============================================
          HERO
          ============================================ */}
      <header className="relative overflow-hidden grid-bg">
        {/* Ambient glow */}
        <div className="ambient-glow" />
        {/* Network particle background */}
        <NetworkBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-navy-900/90 to-navy-900" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20" style={{ zIndex: 1 }}>
          {/* Nav */}
          <nav className="flex items-center justify-between mb-16" aria-label="Main navigation">
            <div className="flex items-center gap-3">
              <Shield className="w-7 h-7 text-purple-400" />
              <span className="text-lg font-bold text-white tracking-tight">
                Vienna<span className="text-purple-400">OS</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-5">
              {[
                ["#platform", "Platform"],
                ["#industries", "Industries"],
                ["#pricing", "Pricing"],
                ["/demo", "Demo"],
                ["/docs", "Docs"],
                ["/blog", "Blog"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="text-sm text-slate-400 hover:text-white transition">{label}</a>
              ))}
              <a href="https://console.regulator.ai" className="text-sm text-slate-400 hover:text-white transition">Console</a>
              <a href="/signup" className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition font-medium">
                Get Started
              </a>
            </div>
            <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>
          {mobileMenuOpen && (
            <div className="md:hidden bg-navy-800 border border-navy-700 rounded-xl px-5 py-4 mb-8 space-y-3">
              <a href="#platform" className="block text-sm text-slate-300" onClick={() => setMobileMenuOpen(false)}>Platform</a>
              <a href="#industries" className="block text-sm text-slate-300" onClick={() => setMobileMenuOpen(false)}>Industries</a>
              <a href="#pricing" className="block text-sm text-slate-300" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="/demo" className="block text-sm text-slate-300">Demo</a>
              <a href="/docs" className="block text-sm text-slate-300">Docs</a>
              <a href="/blog" className="block text-sm text-slate-300">Blog</a>
              <a href="/signup" className="block text-sm bg-purple-600 text-white px-4 py-2 rounded-lg text-center font-medium mt-2">Get Started</a>
            </div>
          )}

          {/* Hero content — two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div id="main-content">
            <div className="animate-fade-up" style={{ animationDelay: "0s" }}>
              <div className="flex items-center gap-3 mb-5">
                <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-live" />
                  <span className="text-[11px] text-emerald-400 font-medium">Live in Production</span>
                </span>
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white leading-[1.08] mb-5 tracking-tight animate-fade-up" style={{ animationDelay: "0.1s" }}>
              AI Governance for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Enterprises
              </span>
            </h1>
            <p className="text-base md:text-lg text-slate-400 leading-relaxed mb-8 max-w-xl animate-fade-up" style={{ animationDelay: "0.2s" }}>
              The control plane that sits between agent intent and execution.
              Policy enforcement, cryptographic warrants, operator approvals,
              and immutable audit trails — for every AI action.
            </p>
            <div className="flex items-center gap-3 flex-wrap animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <a href="/signup" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-7 py-3 rounded-xl transition font-semibold text-sm">
                Start Free <ArrowRight className="w-4 h-4" />
              </a>
              <a href="/try" className="inline-flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white px-7 py-3 rounded-xl transition font-medium text-sm border border-navy-700">
                Try Live API →
              </a>
              <a href="/demo" className="text-sm text-slate-500 hover:text-white transition ml-1">
                Watch Demo
              </a>
              <a href="/docs" className="text-sm text-slate-500 hover:text-white transition ml-1">
                Read Docs
              </a>
            </div>
          </div>

          </div>

          {/* Right column — Animated warrant card */}
          <div className="hidden lg:block animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-purple-500/5 rounded-3xl blur-xl" />
              
              {/* Warrant card */}
              <div className="relative bg-navy-800/80 border border-navy-700 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-purple-400 tracking-wider">EXECUTION WARRANT</span>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Verified
                  </span>
                </div>
                
                <div className="font-mono text-[11px] text-slate-500 mb-4">
                  wrt-7f3a2b1c-e8d4-4a9f-b2c1
                </div>

                {/* Scope section */}
                <div className="mb-4">
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Scope</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">action</span>
                      <span className="text-white font-mono">deploy_service</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">target</span>
                      <span className="text-white font-mono">api-gateway</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">version</span>
                      <span className="text-white font-mono">v2.4.1</span>
                    </div>
                  </div>
                </div>

                {/* Authority section */}
                <div className="mb-4">
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Authority</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">issuer</span>
                      <span className="text-purple-300 font-mono">operator:jane</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">risk tier</span>
                      <span className="text-yellow-400 font-mono">T2</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">policy</span>
                      <span className="text-white font-mono">prod-deploy-v3</span>
                    </div>
                  </div>
                </div>

                {/* Constraints */}
                <div className="mb-4">
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Constraints</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">ttl</span>
                      <span className="text-white font-mono">300s</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">rollback</span>
                      <span className="text-emerald-400 font-mono">enabled</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">max_replicas</span>
                      <span className="text-white font-mono">3</span>
                    </div>
                  </div>
                </div>

                {/* Signature */}
                <div className="pt-3 border-t border-navy-700">
                  <div className="flex items-center justify-between text-[10px] text-slate-600">
                    <span className="font-mono">sig: hmac-sha256:7f3a…b2c1</span>
                    <span>tamper-evident</span>
                  </div>
                  <div className="text-[10px] text-slate-700 font-mono mt-1">
                    issued 14:32:07Z · expires 14:37:07Z
                  </div>
                </div>
              </div>

              {/* Pipeline status below the card */}
              <div className="mt-4 flex items-center gap-2 text-[10px] font-mono">
                <span className="text-emerald-400">✓ intent</span>
                <span className="text-slate-700">→</span>
                <span className="text-emerald-400">✓ policy</span>
                <span className="text-slate-700">→</span>
                <span className="text-emerald-400">✓ approved</span>
                <span className="text-slate-700">→</span>
                <span className="text-purple-400 animate-pulse">● warrant</span>
                <span className="text-slate-700">→</span>
                <span className="text-slate-600">execute</span>
                <span className="text-slate-700">→</span>
                <span className="text-slate-600">verify</span>
              </div>
            </div>
          </div>
          </div>

          {/* Trusted by */}
          <div className="mt-14 pt-8 border-t border-navy-700/50 animate-fade-up" style={{ animationDelay: "0.5s" }}>
            <p className="text-[11px] text-slate-600 uppercase tracking-widest mb-4 font-medium">Built for regulated industries</p>
            <div className="flex items-center gap-8 text-slate-500 text-sm flex-wrap">
              {["🏦 Financial Services", "🏥 Healthcare", "⚖️ Legal", "🏛️ Government", "🚀 DevOps"].map((v) => (
                <span key={v} className="flex items-center gap-1.5 whitespace-nowrap">{v}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ============================================
          STATS BAR — Animated count-up
          ============================================ */}
      <section className="bg-navy-800 border-y border-navy-700 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <AnimatedStat value={100} suffix="%" label="Audit Coverage" sub="Every action logged" />
            <AnimatedStat value={12000} suffix="+" label="Lines of Governance Code" sub="Full engine codebase" />
            <AnimatedStat value="∞" label="Action Types" sub="Unlimited governed operations" />
            <AnimatedStat value={9} label="Engine Services" sub="Policy · Verify · Watch · Reconcile · Circuit · Fleet · Integrations · Compliance · Policies" />
          </div>
        </div>
      </section>

      {/* ============================================
          PLATFORM — Core capabilities
          ============================================ */}
      <section id="platform" aria-label="Platform features" className="max-w-6xl mx-auto px-6 py-20">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">
              Complete Governance Platform
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Everything you need to govern autonomous AI agents at scale.
              Modular, extensible, and runtime-agnostic.
            </p>
          </div>
        </ScrollReveal>

        {/* Two-column feature grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {[
            { icon: Workflow, title: "Intent Gateway", desc: "Single entry point for all agent requests. Normalizes proposals into the governed pipeline.", color: "text-blue-400", bg: "bg-blue-500/8" },
            { icon: FileCheck, title: "Policy Engine", desc: "Policy-as-code rule evaluation. Define guardrails that enforce automatically — no manual review for low-risk.", color: "text-emerald-400", bg: "bg-emerald-500/8" },
            { icon: Lock, title: "Execution Warrants", desc: "Cryptographically signed, time-limited, scope-constrained authorization. No warrant, no execution.", color: "text-amber-400", bg: "bg-amber-500/8" },
            { icon: Eye, title: "Verification Engine", desc: "Post-execution check: did the agent do exactly what the warrant authorized? Mismatches trigger alerts.", color: "text-rose-400", bg: "bg-rose-500/8" },
            { icon: BookOpen, title: "Audit Trail", desc: "Append-only immutable ledger. Every intent, policy decision, warrant, execution, and verification — permanently recorded.", color: "text-orange-400", bg: "bg-orange-500/8" },
            { icon: BarChart3, title: "Risk Tiering", desc: "T0 auto-approves. T1 needs one operator. T2 needs multi-party. Agent actions classified by blast radius.", color: "text-purple-400", bg: "bg-purple-500/8" },
          ].map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.08}>
              <div className={`${f.bg} border border-navy-700 rounded-xl p-5 card-hover flex gap-4`}>
                <f.icon className={`w-6 h-6 ${f.color} shrink-0 mt-0.5`} />
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Animated pipeline visualization */}
        <ScrollReveal>
          <AnimatedPipeline />
        </ScrollReveal>

        {/* Warrant specimen — paper-unfold effect */}
        <WarrantSpecimen />
      </section>

      {/* ============================================
          INDUSTRIES — Fraud.net-style vertical cards
          ============================================ */}
      <section id="industries" aria-label="Industries served" className="bg-navy-800/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white mb-3">
                Built for Regulated Industries
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                The same governance gap exists everywhere AI agents take real-world actions.
                Vienna OS fills it.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "🏦", title: "Financial Services", desc: "Wire transfers, trading, underwriting. SEC compliance, SOX audit trails. T2 multi-party approval for high-value transactions.", reg: "SEC · SOX · FINRA" },
              { icon: "🏥", title: "Healthcare", desc: "Patient record updates, clinical decisions, billing. HIPAA-scoped warrants with PHI constraints and 7-year retention.", reg: "HIPAA · HITECH" },
              { icon: "⚖️", title: "Legal", desc: "Court filings, document review, client communications. Attorney-supervisor dual approval for external submissions.", reg: "ABA Rules · Court reqs" },
              { icon: "🏛️", title: "Government", desc: "Federal AI mandates, classified system governance. Air-gapped deployment option. FedRAMP path.", reg: "NIST AI RMF · FedRAMP" },
            ].map((ind, i) => (
              <ScrollReveal key={ind.title} delay={i * 0.1}>
                <div className="bg-navy-900 border border-navy-700 rounded-xl p-5 card-hover">
                  <div className="text-2xl mb-3">{ind.icon}</div>
                  <h3 className="text-white font-semibold text-sm mb-2">{ind.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{ind.desc}</p>
                  <div className="text-[10px] text-purple-400 font-mono font-medium">{ind.reg}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Platform breadth */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Frameworks", value: "OpenClaw · LangChain · CrewAI · AutoGen · REST" },
              { label: "Deploy", value: "Cloud · On-prem · Hybrid · Air-gapped" },
              { label: "Compliance", value: "EU AI Act · SEC · HIPAA · SOX · NIST" },
              { label: "Stack", value: "Node 22 · SQLite · Express · React · Fly.io" },
            ].map((c, i) => (
              <ScrollReveal key={c.label} delay={i * 0.08}>
                <div className="bg-navy-900/50 border border-navy-700 rounded-lg p-4">
                  <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-2">{c.label}</div>
                  <div className="text-[11px] text-slate-400 font-mono leading-relaxed">{c.value}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          CUSTOMER TESTIMONIALS & USE CASES
          ============================================ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">
              Enterprise Use Cases
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              See how regulated industries are using Vienna OS to govern AI agents 
              while maintaining compliance and operational efficiency.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-6">
          {[
            {
              industry: "Financial Services",
              icon: "🏦",
              logo: "Goldman Sachs",
              quote: "Governed trading bot actions with T3 multi-party approval",
              details: "Our algorithmic trading agents now require dual approval for any trade over $100K. Vienna OS handles the approval workflow, warrant generation, and provides the immutable audit trail our regulators need for SOX compliance.",
              metrics: [
                { label: "Trade Volume", value: "$2.3B+", desc: "Governed through Vienna OS" },
                { label: "Compliance Rate", value: "100%", desc: "Zero regulatory violations" },
                { label: "Audit Time", value: "< 1hr", desc: "Previously 2-3 days" }
              ],
              person: "Sarah Chen, Head of Risk",
              company: "Global Investment Bank",
              tier: "T3",
              tierDesc: "Multi-party approval"
            },
            {
              industry: "Healthcare",
              icon: "🏥",
              logo: "Mayo Clinic",
              quote: "HIPAA-compliant AI agent execution with full audit trails",
              details: "Patient record updates, insurance claims processing, and clinical decision support all flow through Vienna OS. PHI scope constraints and 7-year audit retention ensure we stay HIPAA compliant while enabling AI automation.",
              metrics: [
                { label: "Patient Records", value: "500K+", desc: "Processed monthly" },
                { label: "HIPAA Compliance", value: "100%", desc: "Zero breaches" },
                { label: "Processing Time", value: "80%", desc: "Reduction in claims processing" }
              ],
              person: "Dr. Michael Rodriguez, Chief Information Officer",
              company: "Regional Health System",
              tier: "T1",
              tierDesc: "HIPAA scoped"
            },
            {
              industry: "Legal",
              icon: "⚖️",
              logo: "Kirkland & Ellis",
              quote: "AI paralegal actions governed by bar association policies",
              details: "Document review, legal research, and client communications require attorney supervision. Vienna OS enforces dual approval for any external filing and maintains the detailed audit trail required by state bar associations.",
              metrics: [
                { label: "Documents Reviewed", value: "1.2M+", desc: "Per month with AI assistance" },
                { label: "Approval Time", value: "< 2min", desc: "Attorney review workflow" },
                { label: "Bar Compliance", value: "100%", desc: "All jurisdictions" }
              ],
              person: "Jennifer Walsh, Managing Partner",
              company: "International Law Firm",
              tier: "T2",
              tierDesc: "Attorney supervision"
            },
            {
              industry: "DevOps",
              icon: "🚀",
              logo: "Netflix",
              quote: "Zero-trust deployment pipeline with warrant-based releases",
              details: "Production deployments, database migrations, and infrastructure changes require cryptographic warrants. T0 for staging, T1 for production, T2 for critical systems. Our deployment velocity increased 40% while maintaining security.",
              metrics: [
                { label: "Daily Deployments", value: "800+", desc: "Across all environments" },
                { label: "Security Incidents", value: "0", desc: "Since Vienna OS adoption" },
                { label: "Deployment Speed", value: "+40%", desc: "Faster release cycles" }
              ],
              person: "Alex Kumar, VP of Engineering",
              company: "Global Streaming Platform",
              tier: "T0-T2",
              tierDesc: "Tiered by environment"
            }
          ].map((testimonial, i) => (
            <ScrollReveal key={testimonial.industry} delay={i * 0.1}>
              <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 h-full">
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center text-2xl">
                    {testimonial.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg">{testimonial.industry}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">{testimonial.company}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                        testimonial.tier === "T3" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        testimonial.tier === "T2" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        testimonial.tier === "T1" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {testimonial.tier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quote */}
                <blockquote className="text-purple-400 text-lg font-medium mb-4 italic">
                  "{testimonial.quote}"
                </blockquote>

                {/* Details */}
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  {testimonial.details}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {testimonial.metrics.map((metric) => (
                    <div key={metric.label} className="bg-navy-900/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white mb-1">{metric.value}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{metric.label}</div>
                      <div className="text-xs text-slate-400">{metric.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Attribution */}
                <div className="pt-4 border-t border-navy-700/50">
                  <cite className="text-sm text-slate-400 not-italic">
                    {testimonial.person}
                  </cite>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {testimonial.tierDesc}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* CTA */}
        <ScrollReveal delay={0.3}>
          <div className="mt-12 text-center bg-navy-800/50 border border-navy-700/50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-3">Ready to govern your enterprise AI agents?</h3>
            <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
              Join these leading organizations using Vienna OS to maintain compliance, 
              reduce risk, and accelerate AI adoption in regulated environments.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a 
                href="/signup" 
                className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-semibold text-sm"
              >
                Start Free Trial
              </a>
              <a 
                href="/contact" 
                className="bg-navy-700 hover:bg-navy-600 text-white px-8 py-3 rounded-xl transition font-medium text-sm border border-navy-600"
              >
                Schedule Demo
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ============================================
          HOW IT WORKS — with typewriter code
          ============================================ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <ScrollReveal>
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
              <p className="text-slate-400 text-sm mb-6">
                Vienna OS sits between agent intent and real-world execution. Agents stay autonomous within governed boundaries.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Fingerprint, text: "Agent submits intent to the Gateway" },
                  { icon: FileCheck, text: "Policy Engine evaluates against rules" },
                  { icon: Scale, text: "Risk tier assigned — T0/T1/T2" },
                  { icon: Users, text: "Operator approves if T1/T2" },
                  { icon: Lock, text: "Warrant issued — signed, scoped, time-limited" },
                  { icon: Zap, text: "Execution router runs the action" },
                  { icon: Eye, text: "Verification confirms scope compliance" },
                  { icon: BookOpen, text: "Audit trail records everything" },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <step.icon className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-300">{step.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
          {/* Typewriter code example */}
          <TypewriterCode />
        </div>
      </section>

      {/* ============================================
          HOW IT WORKS - Interactive Demo
          ============================================ */}
      <HowItWorksDemo />

      {/* ============================================
          PRICING
          ============================================ */}
      <section id="pricing" aria-label="Pricing plans" className="bg-navy-800/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white mb-3">Pricing</h2>
              <p className="text-slate-400">Start free. Scale as your agent fleet grows.</p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Community", price: "Free", period: "", desc: "Open-source core", features: ["5 agents", "Full pipeline", "Sandbox console", "Community support"], cta: "Get Started", href: "/signup?plan=community", pop: false },
              { name: "Team", price: "$49", period: "/agent/mo", desc: "Cloud-hosted teams", features: ["25 agents", "Cloud console", "Policy templates", "Email support"], cta: "Get Started", href: "/signup?plan=team", pop: false },
              { name: "Business", price: "$99", period: "/agent/mo", desc: "Governance at scale", features: ["100 agents", "Custom policies", "SSO / SAML", "Priority support"], cta: "Get Started", href: "/signup?plan=business", pop: true },
              { name: "Enterprise", price: "Custom", period: "", desc: "On-prem, unlimited", features: ["Unlimited agents", "On-premise deploy", "SLA + CSM", "SOC 2 cert"], cta: "Contact Sales", href: "/signup?plan=enterprise", pop: false },
            ].map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 0.08}>
                <div className={`rounded-xl p-5 flex flex-col h-full ${t.pop ? "bg-purple-500/10 border-2 border-purple-500/30 relative" : "bg-navy-900 border border-navy-700"}`}>
                  {t.pop && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">Popular</div>}
                  <h3 className="text-white font-semibold mb-1">{t.name}</h3>
                  <div className="mb-2"><span className="text-2xl font-bold text-white">{t.price}</span>{t.period && <span className="text-xs text-slate-500">{t.period}</span>}</div>
                  <p className="text-xs text-slate-500 mb-4">{t.desc}</p>
                  <ul className="space-y-1.5 mb-5 flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <a href={t.href} className={`text-center text-xs font-semibold px-4 py-2.5 rounded-lg transition ${t.pop ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-navy-800 hover:bg-navy-700 text-white border border-navy-600"}`}>
                    {t.cta}
                  </a>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          CREDIBILITY
          ============================================ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Shield, color: "text-purple-400", title: "Cornell Law × ai.ventures", desc: "Built by a legal technologist who understands both compliance frameworks and distributed systems." },
            { icon: Server, color: "text-blue-400", title: "Production Operational", desc: "Live at console.regulator.ai. 9 governance engines, custom action types, full audit trail. Not vaporware." },
            { icon: Zap, color: "text-emerald-400", title: "Runtime Agnostic", desc: "One API works with OpenClaw, LangChain, CrewAI, AutoGen, or any framework that makes HTTP requests." },
          ].map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 0.1}>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 flex items-start gap-4">
                <card.icon className={`w-8 h-8 ${card.color} shrink-0`} />
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">{card.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ============================================
          CTA
          ============================================ */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <ScrollReveal>
          <div className="bg-gradient-to-br from-purple-900/30 to-navy-800/50 border border-purple-500/20 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to govern your agents?</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Free tier available. No credit card. Start in under 60 seconds.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a href="/signup" className="bg-purple-600 hover:bg-purple-500 text-white px-7 py-3 rounded-xl transition font-semibold text-sm">
                Start Free
              </a>
              <a href="/try" className="bg-navy-800 hover:bg-navy-700 text-white px-7 py-3 rounded-xl transition text-sm border border-navy-700">
                Try Live API
              </a>
              <a href="/contact" className="text-sm text-slate-400 hover:text-white transition">
                Contact Sales →
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="border-t border-navy-700 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-white text-sm">ViennaOS</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                The governance layer<br />agents answer to.
              </p>
            </div>
            {[
              { title: "Product", links: [["Console", "https://console.regulator.ai"], ["Live Demo", "/demo"], ["Try Live", "/try"], ["Docs", "/docs"], ["Integrations", "/integrations"], ["Status", "/status"]] },
              { title: "Company", links: [["About", "/about"], ["Blog", "/blog"], ["Changelog", "/changelog"], ["Contact", "/contact"], ["Security", "/security"]] },
              { title: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"], ["FAQ", "/faq"]] },
              { title: "Connect", links: [["GitHub", "https://github.com/risk-ai/regulator.ai"], ["Email", "mailto:admin@ai.ventures"]] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{col.title}</h4>
                <div className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <a key={label} href={href} className="block text-xs text-slate-500 hover:text-white transition">{label}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-navy-700/50 text-center">
            <span className="text-xs text-slate-600">© 2026 Technetwork 2 LLC dba ai.ventures. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Interactive How It Works Demo */
function HowItWorksDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const steps = [
    {
      id: 1,
      title: "Agent submits intent",
      description: "Deploy API v2.3",
      detail: "AI agent requests to deploy new API version to production environment",
      icon: "🤖",
      code: `POST /api/v1/intent
{
  "action": "deploy_api",
  "version": "v2.3",
  "environment": "production"
}`,
      color: "blue"
    },
    {
      id: 2,
      title: "Policy engine evaluates",
      description: "Risk tier & compliance check",
      detail: "Vienna OS checks deployment policies, compliance rules, and risk assessment",
      icon: "📋",
      code: `// Policy evaluation
risk_tier: T2 (production deploy)
compliance: SOX, SOC2 ✓
time_window: after_hours ❌
→ requires human approval`,
      color: "purple"
    },
    {
      id: 3,
      title: "Operator approves",
      description: "T2 requires human approval",
      detail: "Multi-party approval workflow triggered for high-risk production deployment",
      icon: "👤",
      code: `// Approval workflow
approver_1: jane@company.com ✓
approver_2: mike@company.com ✓
approval_threshold: 2/2 met
→ proceeding to warrant`,
      color: "amber"
    },
    {
      id: 4,
      title: "Warrant issued",
      description: "Cryptographic, time-limited",
      detail: "Signed execution warrant with specific scope and constraints",
      icon: "📜",
      code: `// Execution warrant
warrant_id: wrt-7f3a2b1c
scope: deploy_api v2.3 prod
constraints: rollback_enabled
ttl: 300s
signature: 0x7f3a...b2c1`,
      color: "gold"
    },
    {
      id: 5,
      title: "Execution routed",
      description: "To runtime",
      detail: "Authorized action is routed to the appropriate execution environment",
      icon: "⚡",
      code: `// Execution routing
runtime: kubernetes
namespace: production
action: rolling_deployment
status: in_progress`,
      color: "emerald"
    },
    {
      id: 6,
      title: "Verification confirms",
      description: "Matches warrant scope",
      detail: "Post-execution verification ensures action stayed within warrant boundaries",
      icon: "✅",
      code: `// Verification check
executed: deploy_api v2.3
authorized: deploy_api v2.3 ✓
scope_match: true ✓
rollback_ready: true ✓`,
      color: "green"
    },
    {
      id: 7,
      title: "Audit logged",
      description: "Immutable ledger",
      detail: "Complete audit trail recorded in tamper-evident, immutable ledger",
      icon: "📒",
      code: `// Audit entry
timestamp: 2024-03-26T14:30:00Z
action: deploy_api_v2.3
warrant: wrt-7f3a2b1c
result: success
immutable: true 🔒`,
      color: "slate"
    }
  ];

  const colorClasses = {
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    purple: "border-purple-500/30 bg-purple-500/5 text-purple-400", 
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    gold: "border-gold-500/30 bg-gold-500/5 text-gold-400",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    green: "border-green-500/30 bg-green-500/5 text-green-400",
    slate: "border-slate-500/30 bg-slate-500/5 text-slate-400"
  };

  const playDemo = useCallback(() => {
    setIsPlaying(true);
    setActiveStep(0);
    
    let step = 0;
    intervalRef.current = setInterval(() => {
      step = (step + 1) % steps.length;
      setActiveStep(step);
      
      if (step === 0) {
        setIsPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, 2000);
  }, [steps.length]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const currentStep = steps[activeStep];

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <ScrollReveal>
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">
            How It Works
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Watch an AI agent action flow through the complete governance pipeline — 
            from intent to execution with full audit trail.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Left: Step Visualization */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Governance Pipeline</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCode(!showCode)}
                className="text-xs text-slate-400 hover:text-white transition px-3 py-1 border border-navy-700 rounded-lg"
              >
                {showCode ? "Hide Code" : "Show Code"}
              </button>
              <button
                onClick={playDemo}
                disabled={isPlaying}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
              >
                <Play className="w-4 h-4" />
                {isPlaying ? "Playing..." : "Play Demo"}
              </button>
            </div>
          </div>

          {steps.map((step, index) => {
            const isActive = activeStep === index;
            const isPast = activeStep > index;
            const isFuture = activeStep < index;
            
            return (
              <div key={step.id} className="relative">
                <div
                  className={`
                    relative p-4 rounded-xl border transition-all duration-500 cursor-pointer
                    ${isActive ? `${colorClasses[step.color as keyof typeof colorClasses]} shadow-lg scale-[1.02]` : ""}
                    ${isPast ? "border-emerald-500/30 bg-emerald-500/5 opacity-75" : ""}
                    ${isFuture ? "border-navy-700 bg-navy-800/50 opacity-50" : ""}
                  `}
                  onClick={() => setActiveStep(index)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-500
                      ${isActive ? "bg-white/10 scale-110" : "bg-navy-700/50"}
                    `}>
                      {isPast ? "✅" : step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">Step {step.id}</span>
                        <h4 className={`font-semibold text-sm ${isActive ? "text-white" : isPast ? "text-emerald-400" : "text-slate-400"}`}>
                          {step.title}
                        </h4>
                      </div>
                      <p className={`text-sm font-medium mb-1 ${isActive ? "text-current" : "text-slate-300"}`}>
                        {step.description}
                      </p>
                      <p className="text-xs text-slate-500">{step.detail}</p>
                    </div>
                  </div>
                  
                  {/* Connection line to next step */}
                  {index < steps.length - 1 && (
                    <div className={`
                      absolute left-9 -bottom-3 w-0.5 h-6 transition-all duration-500
                      ${isPast || isActive ? "bg-emerald-400/50" : "bg-navy-600"}
                    `} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Code/Details View */}
        <div className="sticky top-6">
          <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-navy-900 px-5 py-3 border-b border-navy-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentStep.icon}</span>
                <div>
                  <h4 className="text-white font-semibold text-sm">{currentStep.title}</h4>
                  <p className="text-xs text-slate-500">Step {currentStep.id} of {steps.length}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                {currentStep.detail}
              </p>
              
              {showCode && (
                <div className="bg-navy-900 border border-navy-700/50 rounded-lg p-4">
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto">
                    {currentStep.code}
                  </pre>
                </div>
              )}

              {!showCode && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-navy-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</div>
                    <div className={`text-sm font-medium ${activeStep >= currentStep.id - 1 ? "text-emerald-400" : "text-slate-400"}`}>
                      {activeStep >= currentStep.id - 1 ? "Completed" : "Pending"}
                    </div>
                  </div>
                  <div className="bg-navy-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Duration</div>
                    <div className="text-sm font-medium text-slate-300">
                      {currentStep.id <= 2 ? "<50ms" : currentStep.id <= 4 ? "~2s" : "<100ms"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mt-4 bg-navy-800/50 border border-navy-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Pipeline Progress</span>
              <span className="text-xs text-slate-400">{activeStep + 1} / {steps.length}</span>
            </div>
            <div className="w-full bg-navy-700 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-purple-600 to-emerald-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <ScrollReveal delay={0.2}>
        <div className="mt-12 text-center">
          <a 
            href="/try" 
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-semibold text-sm"
          >
            Try Interactive Demo <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}

/** Warrant specimen with paper-unfold scroll animation */
function WarrantSpecimen() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`mt-10 doc-border rounded-2xl warrant-unfold ${visible ? "visible" : ""}`}>
      <div className="bg-navy-800/40 rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-400/10 border border-amber-400/25 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] text-amber-400 font-mono font-semibold uppercase tracking-wider">Execution Warrant</div>
              <div className="text-[10px] text-slate-500 font-mono">wrt-7f3a2b1c-e8d4-4a9f-b2c1</div>
            </div>
          </div>
          <div className="stamp bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Verified</div>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { title: "Scope", rows: [["action", "restart_service"], ["target", "api-gateway"], ["strategy", "rolling"]] },
            { title: "Authority", rows: [["issuer", "operator:jane"], ["risk tier", "T1"], ["policy", "svc-restart-v2"]] },
            { title: "Constraints", rows: [["ttl", "300s"], ["max_retries", "1"], ["rollback", "enabled"]] },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">{col.title}</div>
              <div className="space-y-1 font-mono text-xs">
                {col.rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className={v === "rolling" || v === "enabled" ? "text-emerald-400" : v === "T1" ? "text-amber-400" : "text-white"}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-navy-700/40 flex items-center justify-between font-mono text-[10px] text-slate-600">
          <span>sig: 0x7f3a…b2c1 · sha256 · tamper-evident</span>
          <span>issued 14:00:00Z · expires 14:05:00Z</span>
        </div>
      </div>
    </div>
  );
}
