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
  FileText,
} from "lucide-react";
import { analytics } from "@/lib/analytics";

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
          HERO - Enhanced with aurora background
          ============================================ */}
      <header className="relative overflow-hidden">
        {/* Aurora mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-navy-900 to-blue-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.1),transparent)]" />
        
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100px_100px]" />
        
        {/* Network particle background */}
        <NetworkBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy-900/30 to-navy-900" />
        
        <div className="relative max-w-6xl mx-auto px-6 pt-8 pb-16" style={{ zIndex: 1 }}>
          {/* Nav */}
          <nav className="flex items-center justify-between mb-10" aria-label="Main navigation">
            <div className="flex items-center gap-3">
              <Shield className="w-7 h-7 text-purple-400" />
              <span className="text-lg font-bold text-white tracking-tight">
                Vienna<span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">OS</span>
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
                <a key={href} href={href} className="text-sm text-slate-400 hover:text-white transition font-medium tracking-wide">{label}</a>
              ))}
              <a href="https://console.regulator.ai" className="text-sm text-slate-400 hover:text-white transition font-medium tracking-wide">Console</a>
              <a 
                href="/signup" 
                onClick={() => analytics.ctaClick('navigation', 'get_started')}
                className="text-sm bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-5 py-2.5 rounded-lg transition font-semibold tracking-wide shadow-lg hover:shadow-purple-500/25"
              >
                Get Started
              </a>
            </div>
            <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>
          {mobileMenuOpen && (
            <div className="md:hidden bg-navy-800/90 backdrop-blur-xl border border-navy-700/50 rounded-xl px-5 py-4 mb-8 space-y-3 shadow-2xl">
              <a href="#platform" className="block text-sm text-slate-300 hover:text-white transition" onClick={() => setMobileMenuOpen(false)}>Platform</a>
              <a href="#industries" className="block text-sm text-slate-300 hover:text-white transition" onClick={() => setMobileMenuOpen(false)}>Industries</a>
              <a href="#pricing" className="block text-sm text-slate-300 hover:text-white transition" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="/demo" className="block text-sm text-slate-300 hover:text-white transition">Demo</a>
              <a href="/docs" className="block text-sm text-slate-300 hover:text-white transition">Docs</a>
              <a href="/blog" className="block text-sm text-slate-300 hover:text-white transition">Blog</a>
              <a 
                href="/signup" 
                onClick={() => analytics.ctaClick('mobile_menu', 'get_started')}
                className="block text-sm bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-lg text-center font-semibold mt-2 shadow-lg min-h-[44px] flex items-center justify-center"
              >
                Get Started
              </a>
            </div>
          )}

          {/* Hero content — two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div id="main-content">
              <div className="animate-fade-up" style={{ animationDelay: "0s" }}>
                <div className="flex items-center gap-3 mb-8">
                  <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 hover:bg-emerald-500/15 transition-all duration-300 hover:scale-105">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-semibold tracking-wider">Live in Production</span>
                  </span>
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-[1.05] mb-8 tracking-tight animate-fade-up" style={{ animationDelay: "0.1s" }}>
                Control what AI{" "}
                <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">can do</span> —{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                  not just what it says
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed mb-12 max-w-2xl animate-fade-up" style={{ animationDelay: "0.2s" }}>
                The execution control layer for autonomous AI systems.
                Every agent action requires a cryptographic <span className="text-amber-400 font-medium">warrant</span> — signed, scoped,
                and time-limited. No warrant, no execution.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap animate-fade-up mb-8" style={{ animationDelay: "0.3s" }}>
                <a 
                  href="/signup" 
                  onClick={() => analytics.ctaClick('hero', 'start_free')}
                  className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 hover:from-purple-500 hover:via-purple-400 hover:to-blue-400 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold text-sm shadow-2xl hover:shadow-purple-500/30 transform hover:scale-105 hover:-translate-y-1 w-full sm:w-auto min-h-[44px]"
                >
                  Start Free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a 
                  href="/try" 
                  onClick={() => analytics.ctaClick('hero', 'try_live_api')}
                  className="inline-flex items-center justify-center gap-2 bg-navy-800/60 backdrop-blur-sm hover:bg-navy-700/80 text-white px-8 py-4 rounded-xl transition-all duration-300 font-medium text-sm border border-navy-600/50 hover:border-purple-500/50 shadow-xl w-full sm:w-auto min-h-[44px]"
                >
                  Try Live API →
                </a>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 animate-fade-up" style={{ animationDelay: "0.4s" }}>
                <a 
                  href="/demo" 
                  onClick={() => analytics.ctaClick('hero', 'watch_demo')}
                  className="text-sm text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-2 group"
                >
                  <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </a>
                <a 
                  href="/docs" 
                  onClick={() => analytics.ctaClick('hero', 'read_docs')}
                  className="text-sm text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-2 group"
                >
                  <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Read Docs
                </a>
              </div>
            </div>

            {/* Right column — Enhanced warrant card with floating animation */}
            <div className="hidden lg:block animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <div className="relative group warrant-float">
                {/* Multi-layer glow effects */}
                <div className="absolute -inset-8 bg-gradient-to-r from-purple-500/20 via-blue-500/10 to-purple-500/20 rounded-3xl blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-amber-500/10 rounded-3xl blur-xl opacity-80" />
                
                {/* Warrant card with enhanced styling and scan line animation */}
                <div className="relative bg-gradient-to-br from-navy-800/95 to-navy-900/95 border border-navy-600/60 rounded-2xl p-8 backdrop-blur-xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 hover:border-purple-500/40 warrant-scan-line">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse warrant-pulse"></div>
                      <span className="text-xs font-mono text-amber-400 tracking-wider font-bold uppercase">Execution Warrant</span>
                    </div>
                    <span className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1.5 verified-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold tracking-wider">VERIFIED</span>
                    </span>
                  </div>
                  
                  <div className="font-mono text-sm text-slate-300 mb-6 bg-navy-900/70 rounded-lg px-4 py-3 border border-navy-700/60 backdrop-blur-sm warrant-typing">
                    wrt-7f3a2b1c-e8d4-4a9f-b2c1
                  </div>

                  {/* Enhanced sections with better visual hierarchy */}
                  <div className="grid grid-cols-1 gap-6">
                    {/* Scope section */}
                    <div className="bg-gradient-to-br from-navy-900/50 to-navy-900/30 rounded-xl p-5 border border-navy-700/40 backdrop-blur-sm">
                      <div className="text-xs text-purple-400 uppercase tracking-wider mb-4 font-bold">Scope</div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">action</span>
                          <span className="text-white font-mono bg-navy-800/60 px-3 py-1 rounded font-semibold">deploy_service</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">target</span>
                          <span className="text-white font-mono bg-navy-800/60 px-3 py-1 rounded font-semibold">api-gateway</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">version</span>
                          <span className="text-white font-mono bg-navy-800/60 px-3 py-1 rounded font-semibold">v2.4.1</span>
                        </div>
                      </div>
                    </div>

                    {/* Authority section */}
                    <div className="bg-gradient-to-br from-navy-900/50 to-navy-900/30 rounded-xl p-5 border border-navy-700/40 backdrop-blur-sm">
                      <div className="text-xs text-purple-400 uppercase tracking-wider mb-4 font-bold">Authority</div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">issuer</span>
                          <span className="text-purple-300 font-mono bg-purple-500/15 px-3 py-1 rounded font-semibold">operator:jane</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">risk tier</span>
                          <span className="text-amber-400 font-mono bg-amber-500/15 px-3 py-1 rounded font-bold">T2</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">policy</span>
                          <span className="text-white font-mono bg-navy-800/60 px-3 py-1 rounded font-semibold">prod-deploy-v3</span>
                        </div>
                      </div>
                    </div>

                    {/* Constraints */}
                    <div className="bg-gradient-to-br from-navy-900/50 to-navy-900/30 rounded-xl p-5 border border-navy-700/40 backdrop-blur-sm">
                      <div className="text-xs text-purple-400 uppercase tracking-wider mb-4 font-bold">Constraints</div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">ttl</span>
                          <span className="text-white font-mono bg-navy-800/60 px-3 py-1 rounded font-semibold">300s</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">rollback</span>
                          <span className="text-emerald-400 font-mono bg-emerald-500/15 px-3 py-1 rounded font-semibold">enabled</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">max_replicas</span>
                          <span className="text-white font-mono bg-navy-800/60 px-3 py-1 rounded font-semibold">3</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced signature section */}
                  <div className="mt-6 pt-5 border-t border-gradient-to-r from-purple-500/30 via-transparent to-purple-500/30">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span className="font-mono bg-navy-900/70 px-3 py-1.5 rounded backdrop-blur-sm">sig: hmac-sha256:7f3a…b2c1</span>
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3" />
                        <span className="font-medium">tamper-evident</span>
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-mono text-center">
                      issued 14:32:07Z • expires 14:37:07Z
                    </div>
                  </div>
                </div>

                {/* Enhanced pipeline status with better visual flow */}
                <div className="mt-8 flex items-center justify-center gap-3 text-xs font-mono bg-navy-800/40 backdrop-blur-sm rounded-full px-6 py-3 border border-navy-700/60">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3" />
                    intent
                  </span>
                  <span className="text-purple-400">→</span>
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3" />
                    policy
                  </span>
                  <span className="text-purple-400">→</span>
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3" />
                    approved
                  </span>
                  <span className="text-purple-400">→</span>
                  <span className="text-amber-400 animate-pulse flex items-center gap-1.5 warrant-active">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    warrant
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================
          TRUST SIGNALS BAR — Replacing fake testimonials with real facts
          ============================================ */}
      <section className="relative bg-gradient-to-r from-slate-800 via-navy-700 to-slate-800 border-t border-slate-600/30 py-12">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-blue-900/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent)]" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            <div className="text-center trust-signal">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div className="text-sm font-semibold text-white mb-1">Built at Cornell Law × ai.ventures</div>
              <div className="text-xs text-slate-400">Legal tech expertise meets systems engineering</div>
            </div>
            
            <div className="text-center trust-signal">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div className="text-sm font-semibold text-white mb-1">USPTO Patent #64/018,152</div>
              <div className="text-xs text-slate-400">Intellectual property protection for governance methods</div>
            </div>
            
            <div className="text-center trust-signal">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="text-sm font-semibold text-white mb-1">Open Source Infrastructure</div>
              <div className="text-xs text-slate-400">Apache 2.0 — inspect every line of the control layer</div>
            </div>
            
            <div className="text-center trust-signal">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Server className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="text-sm font-semibold text-white mb-1">9 Governance Engines</div>
              <div className="text-xs text-slate-400">Policy • Verify • Watch • Reconcile • Circuit • Fleet • Integrations • Compliance • Policies</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          STATS BAR — Enhanced visual presentation
          ============================================ */}
      <section className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,69,19,0.1),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.1),transparent)]" />
        
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <AnimatedStat value={100} suffix="%" label="Enforcement Coverage" sub="Every action authorized" />
            <AnimatedStat value={4} label="Risk Tiers" sub="T0 auto → T3 multi-party" />
            <AnimatedStat value="∞" label="Action Types" sub="Any agent, any operation" />
            <AnimatedStat value={9} label="Control Engines" sub="Complete execution stack" />
          </div>
        </div>
      </section>

      {/* ============================================
          PLATFORM — Enhanced with gradient sections and better visual hierarchy
          ============================================ */}
      <section id="platform" aria-label="Platform features" className="relative bg-gradient-to-b from-transparent via-slate-900/20 to-transparent py-24">
        {/* Subtle dot pattern overlay */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        <div className="relative max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-500/30 rounded-full px-5 py-2.5 mb-6 backdrop-blur-sm">
                <span className="text-sm text-purple-300 font-bold uppercase tracking-wider">Platform</span>
              </div>
              <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                Execution <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">Control</span> Infrastructure
              </h2>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                System primitives for controlling what AI agents can do.
                Not monitoring. Not documentation. Enforcement.
              </p>
            </div>
          </ScrollReveal>

          {/* Enhanced two-column feature grid with better visual hierarchy */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {[
              { icon: Workflow, title: "Intent Normalization Layer", desc: "Single entry point for all agent requests. Every proposal is normalized, validated, and routed into the enforcement pipeline.", color: "text-blue-400", bg: "bg-gradient-to-br from-blue-500/10 to-blue-600/5", border: "border-blue-500/20" },
              { icon: FileCheck, title: "Deterministic Policy Engine", desc: "Policy-as-code rule evaluation. Rules execute deterministically — no ambiguity, no exceptions, no manual review for low-risk.", color: "text-emerald-400", bg: "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5", border: "border-emerald-500/20" },
              { icon: Lock, title: "Cryptographic Warrants", desc: "HMAC-SHA256 signed, time-limited, scope-constrained execution authorization. Tamper with any field and it invalidates. No warrant, no execution.", color: "text-amber-400", bg: "bg-gradient-to-br from-amber-500/10 to-amber-600/5", border: "border-amber-500/20" },
              { icon: Eye, title: "Post-Execution Verification", desc: "Did the agent do exactly what the warrant authorized? Scope drift detection, timing verification, constraint enforcement. Mismatches trigger alerts.", color: "text-rose-400", bg: "bg-gradient-to-br from-rose-500/10 to-rose-600/5", border: "border-rose-500/20" },
              { icon: BookOpen, title: "Immutable Audit Ledger", desc: "Append-only, tamper-evident record. Every intent, policy decision, warrant, execution, and verification — permanently and cryptographically recorded.", color: "text-orange-400", bg: "bg-gradient-to-br from-orange-500/10 to-orange-600/5", border: "border-orange-500/20" },
              { icon: BarChart3, title: "Blast Radius Classification", desc: "T0 auto-approves. T1 needs one operator. T2 needs multi-party. T3 needs justification + rollback plan. Actions classified by impact.", color: "text-purple-400", bg: "bg-gradient-to-br from-purple-500/10 to-purple-600/5", border: "border-purple-500/20" },
            ].map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.08}>
                <div className={`${f.bg} border ${f.border} rounded-xl p-6 card-hover flex gap-5 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300`}>
                  <f.icon className={`w-7 h-7 ${f.color} shrink-0 mt-1`} />
                  <div>
                    <h3 className="text-white font-bold text-base mb-2 tracking-wide">{f.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Animated pipeline visualization with enhanced styling */}
          <ScrollReveal>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent rounded-3xl blur-xl" />
              <AnimatedPipeline />
            </div>
          </ScrollReveal>

          {/* Warrant specimen — paper-unfold effect */}
          <WarrantSpecimen />
        </div>
      </section>

      {/* ============================================
          INDUSTRIES — Enhanced with dramatic visual contrast
          ============================================ */}
      <section id="industries" aria-label="Industries served" className="relative bg-gradient-to-b from-navy-800 via-slate-800 to-navy-800 py-24 border-y border-slate-600/20">
        {/* Mesh gradient backgrounds */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(168,85,247,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05),transparent)]" />
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.02)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,0.02)_25%,transparent_25%)] bg-[size:60px_60px]" />
        
        <div className="relative max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/30 rounded-full px-5 py-2.5 mb-6 backdrop-blur-sm">
                <span className="text-sm text-blue-300 font-bold uppercase tracking-wider">Industries</span>
              </div>
              <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                Without governance, AI <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">cannot operate</span>
              </h2>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Regulated industries require proof of control. Vienna OS makes autonomous AI deployable
                where compliance isn&apos;t optional.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🏦", title: "Financial Services", desc: "Wire transfers, trading, underwriting. SEC compliance, SOX audit trails. T2 multi-party approval for high-value transactions.", reg: "SEC · SOX · FINRA", gradient: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20", accentBar: "bg-gradient-to-r from-blue-500 to-blue-400" },
              { icon: "🏥", title: "Healthcare", desc: "Patient record updates, clinical decisions, billing. HIPAA-scoped warrants with PHI constraints and 7-year retention.", reg: "HIPAA · HITECH", gradient: "from-emerald-500/10 to-emerald-600/5", border: "border-emerald-500/20", accentBar: "bg-gradient-to-r from-emerald-500 to-emerald-400" },
              { icon: "⚖️", title: "Legal", desc: "Court filings, document review, client communications. Attorney-supervisor dual approval for external submissions.", reg: "ABA Rules · Court reqs", gradient: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/20", accentBar: "bg-gradient-to-r from-purple-500 to-purple-400" },
              { icon: "🏛️", title: "Government", desc: "Federal AI mandates, classified system governance. Air-gapped deployment option. FedRAMP path.", reg: "NIST AI RMF · FedRAMP", gradient: "from-amber-500/10 to-amber-600/5", border: "border-amber-500/20", accentBar: "bg-gradient-to-r from-amber-500 to-amber-400" },
            ].map((ind, i) => (
              <ScrollReveal key={ind.title} delay={i * 0.1}>
                <div className={`bg-gradient-to-br ${ind.gradient} border ${ind.border} rounded-xl p-6 card-hover relative overflow-hidden backdrop-blur-sm group hover:scale-105 hover:shadow-2xl transition-all duration-300`}>
                  {/* Colored accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${ind.accentBar}`} />
                  
                  <div className="text-3xl mb-4">{ind.icon}</div>
                  <h3 className="text-white font-bold text-lg mb-3 tracking-wide">{ind.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-4">{ind.desc}</p>
                  <div className="text-xs font-mono font-semibold opacity-75 text-current">{ind.reg}</div>
                  
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Enhanced platform breadth with better visual separation */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Frameworks", value: "OpenClaw · LangChain · CrewAI · AutoGen · REST", color: "purple" },
              { label: "Deploy", value: "Cloud · On-prem · Hybrid · Air-gapped", color: "blue" },
              { label: "Compliance", value: "EU AI Act · SEC · HIPAA · SOX · NIST", color: "emerald" },
              { label: "Stack", value: "Node 22 · SQLite · Express · React · Fly.io", color: "amber" },
            ].map((c, i) => (
              <ScrollReveal key={c.label} delay={i * 0.08}>
                <div className={`bg-gradient-to-br from-${c.color}-500/10 to-${c.color}-600/5 border border-${c.color}-500/20 rounded-xl p-5 backdrop-blur-sm hover:scale-105 transition-all duration-300`}>
                  <div className={`text-xs text-${c.color}-300 font-bold uppercase tracking-wider mb-3`}>{c.label}</div>
                  <div className="text-sm text-slate-300 font-mono leading-relaxed">{c.value}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          INDUSTRY SOLUTIONS
          ============================================ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">
              Industry Solutions
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              See how Vienna OS enables AI agent governance across regulated industries 
              while maintaining compliance and operational efficiency.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            {
              industry: "Financial Services",
              icon: "🏦",
              title: "Trading & Risk Management",
              details: "Algorithmic trading agents operating under strict regulatory oversight. Multi-party approval workflows for high-value transactions, complete SOX audit trails, and automated risk tier classification based on trade size and market conditions.",
              capabilities: [
                "T3 multi-party approval for trades >$100K",
                "Real-time risk assessment and tier assignment",
                "SEC/FINRA compliance built into policy engine"
              ],
              scenarios: [
                { label: "Trade Governance", desc: "Designed for high-frequency trading compliance" },
                { label: "Risk Controls", desc: "Real-time monitoring and circuit breakers" },
                { label: "Audit Ready", desc: "Immutable trails for regulatory review" }
              ],
              tier: "T0-T3",
              tierDesc: "Risk-based tiering"
            },
            {
              industry: "Healthcare",
              icon: "🏥",
              title: "Patient Care & Records",
              details: "HIPAA-compliant AI agent operations for patient record updates, insurance processing, and clinical decision support. PHI-scoped warrants ensure data access is limited and auditable for 7-year retention requirements.",
              capabilities: [
                "PHI-scoped warrant constraints for data protection",
                "Role-based approvals (physician, nurse, admin)",
                "7-year immutable audit retention for compliance"
              ],
              scenarios: [
                { label: "Record Processing", desc: "Designed for secure patient data handling" },
                { label: "HIPAA Compliance", desc: "Built-in privacy protection controls" },
                { label: "Clinical Workflows", desc: "Support for care team approvals" }
              ],
              tier: "T1",
              tierDesc: "HIPAA-scoped approvals"
            },
            {
              industry: "Legal",
              icon: "⚖️",
              title: "Document Review & Filing",
              details: "Attorney-supervised AI paralegal operations for document review, legal research, and client communications. Bar association compliance through mandatory attorney oversight for all external communications and filings.",
              capabilities: [
                "Mandatory attorney review for external communications",
                "Client privilege protection constraints",
                "Automated blocking of unauthorized filings"
              ],
              scenarios: [
                { label: "Document Review", desc: "Designed for attorney-supervised workflows" },
                { label: "Client Communications", desc: "Protected privilege and compliance" },
                { label: "Bar Standards", desc: "Meets professional responsibility rules" }
              ],
              tier: "T1-T2",
              tierDesc: "Attorney supervision required"
            },
            {
              industry: "DevOps",
              icon: "🚀",
              title: "Deployment & Infrastructure",
              details: "Zero-trust deployment pipeline with warrant-based releases. Environment-tiered approvals ensure production safety while maintaining deployment velocity. Automatic rollback capabilities and canary deployment controls.",
              capabilities: [
                "Environment-based risk tiers (T0 staging, T2 prod)",
                "Cryptographic deployment warrants",
                "Automated rollback and canary controls"
              ],
              scenarios: [
                { label: "CI/CD Pipeline", desc: "Designed for rapid, secure deployments" },
                { label: "Infrastructure Changes", desc: "Governed database and system updates" },
                { label: "Zero Trust", desc: "Every deployment requires authorization" }
              ],
              tier: "T0-T2",
              tierDesc: "Environment-based tiers"
            }
          ].map((solution, i) => (
            <ScrollReveal key={solution.industry} delay={i * 0.1}>
              <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 h-full">
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center text-2xl">
                    {solution.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg">{solution.industry}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">{solution.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                        solution.tier.includes("T3") ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        solution.tier.includes("T2") ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        solution.tier.includes("T1") ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {solution.tier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  {solution.details}
                </p>

                {/* Capabilities */}
                <div className="mb-6">
                  <h4 className="text-white font-medium text-sm mb-3">Key Capabilities</h4>
                  <ul className="space-y-2">
                    {solution.capabilities.map((capability, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        {capability}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Use Case Scenarios */}
                <div className="grid grid-cols-1 gap-2 mb-6">
                  {solution.scenarios.map((scenario) => (
                    <div key={scenario.label} className="bg-navy-900/50 rounded-lg p-3">
                      <div className="text-sm font-medium text-white mb-1">{scenario.label}</div>
                      <div className="text-xs text-slate-400">{scenario.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Implementation Note */}
                <div className="pt-4 border-t border-navy-700/50">
                  <div className="text-xs text-slate-500 mt-0.5">
                    {solution.tierDesc}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* CTA */}
        <ScrollReveal delay={0.3}>
          <div className="mt-12 text-center bg-navy-800/50 border border-navy-700/50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-3">Ready to govern your AI agents?</h3>
            <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
              Vienna OS provides the governance framework your regulated industry needs 
              to deploy AI agents safely and compliantly.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a 
                href="/signup" 
                onClick={() => analytics.ctaClick('industry_cta', 'start_free_trial')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-semibold text-sm"
              >
                Start Free Trial
              </a>
              <a 
                href="/contact" 
                onClick={() => analytics.ctaClick('industry_cta', 'schedule_demo')}
                className="bg-navy-700 hover:bg-navy-600 text-white px-8 py-3 rounded-xl transition font-medium text-sm border border-navy-600"
              >
                Schedule Demo
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ============================================
          WHY THIS MUST EXIST — Without/With contrast
          ============================================ */}
      <section className="relative bg-gradient-to-b from-transparent via-red-900/5 to-transparent py-20">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                The current state is <span className="text-red-400">unsafe</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                AI agents are taking real-world actions. The question isn&apos;t whether they need governance — it&apos;s whether you can prove it.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-6">
            <ScrollReveal>
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8">
                <div className="text-xs text-red-400 font-bold uppercase tracking-wider mb-4">❌ Without Vienna OS</div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="text-red-400">→</span>
                    <span>LLM decides → tool call → action executes</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="text-red-400">→</span>
                    <span>No pre-execution validation</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="text-red-400">→</span>
                    <span>No authorization proof</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="text-red-400">→</span>
                    <span>No audit trail for regulators</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="text-red-400">→</span>
                    <span>Damage discovered after the fact</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8">
                <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-4">✓ With Vienna OS</div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="text-emerald-400">→</span>
                    <span>LLM decides → intent → policy → <span className="text-amber-400 font-bold">warrant</span> → action</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="text-emerald-400">→</span>
                    <span>Cryptographic enforcement at runtime</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="text-emerald-400">→</span>
                    <span>Signed, scoped, time-limited authorization</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="text-emerald-400">→</span>
                    <span>Immutable audit trail, regulator-ready</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="text-emerald-400">→</span>
                    <span>Damage prevented before it happens</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ============================================
          HOW IT WORKS — Enhanced with timeline flow and better terminal styling
          ============================================ */}
      <section className="relative bg-gradient-to-br from-transparent via-navy-800/30 to-transparent py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent)]" />
        
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
              <div>
                <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                  How it <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">works</span>
                </h2>
                <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                  Vienna OS is the execution control layer between agent intent and real-world action. Agents stay autonomous — within enforced boundaries.
                </p>
                
                {/* Enhanced timeline with numbered steps and connecting lines */}
                <div className="space-y-4 relative">
                  {/* Connecting line */}
                  <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple-500/50 via-blue-500/50 to-emerald-500/50" />
                  
                  {[
                    { icon: Fingerprint, text: "Agent submits intent to the Gateway", color: "text-purple-400" },
                    { icon: FileCheck, text: "Policy Engine evaluates against rules", color: "text-blue-400" },
                    { icon: Scale, text: "Risk tier assigned — T0/T1/T2", color: "text-indigo-400" },
                    { icon: Users, text: "Operator approves if T1/T2", color: "text-violet-400" },
                    { icon: Lock, text: "Warrant issued — signed, scoped, time-limited", color: "text-amber-400" },
                    { icon: Zap, text: "Execution router runs the action", color: "text-green-400" },
                    { icon: Eye, text: "Verification confirms scope compliance", color: "text-emerald-400" },
                    { icon: BookOpen, text: "Audit trail records everything", color: "text-cyan-400" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-4 relative">
                      {/* Step number */}
                      <div className="w-10 h-10 rounded-full bg-navy-800 border-2 border-current flex items-center justify-center text-xs font-bold shrink-0 relative z-10">
                        {i + 1}
                      </div>
                      <step.icon className={`w-5 h-5 ${step.color} mt-2.5 shrink-0`} />
                      <span className="text-slate-300 leading-relaxed pt-2">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            
            {/* Enhanced typewriter code with better terminal styling */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-slate-800/50 to-navy-800/50 rounded-2xl blur-xl" />
              <div className="relative">
                {/* Terminal header */}
                <div className="bg-slate-800 border border-slate-700 rounded-t-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-slate-400 font-mono">Vienna OS Terminal</span>
                  </div>
                </div>
                <TypewriterCode />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          HOW IT WORKS - Interactive Demo
          ============================================ */}
      <HowItWorksDemo />

      {/* ============================================
          PRICING — Enhanced with better spacing and premium styling
          ============================================ */}
      <section id="pricing" aria-label="Pricing plans" className="relative bg-gradient-to-b from-slate-900/50 via-navy-800/70 to-slate-900/50 py-24">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.1),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.08),transparent)]" />
        
        <div className="relative max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-5 py-2.5 mb-6 backdrop-blur-sm">
                <span className="text-sm text-emerald-300 font-bold uppercase tracking-wider">Pricing</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                Start <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">free</span>. Scale as your agent fleet grows.
              </h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">Simple, transparent pricing that grows with your governance needs</p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { name: "Community", price: "Free", period: "", desc: "Open-source core", features: ["5 agents", "Full pipeline", "Sandbox console", "Community support"], cta: "Get Started", href: "/signup?plan=community", pop: false },
              { name: "Team", price: "$49", period: "/agent/mo", desc: "Cloud-hosted teams", features: ["25 agents", "Cloud console", "Policy templates", "Email support"], cta: "Get Started", href: "/signup?plan=team", pop: false },
              { name: "Business", price: "$99", period: "/agent/mo", desc: "Governance at scale", features: ["100 agents", "Custom policies", "SSO / SAML", "Priority support"], cta: "Get Started", href: "/signup?plan=business", pop: true },
              { name: "Enterprise", price: "Custom", period: "", desc: "On-prem, unlimited", features: ["Unlimited agents", "On-premise deploy", "SLA + CSM", "SOC 2 cert"], cta: "Contact Sales", href: "/signup?plan=enterprise", pop: false, premium: true },
            ].map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 0.08}>
                <div className={`rounded-2xl p-7 flex flex-col h-full relative backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                  t.pop 
                    ? "bg-gradient-to-br from-purple-500/15 to-purple-600/10 border-2 border-purple-500/40 shadow-2xl shadow-purple-500/20" 
                    : t.premium
                    ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-2 border-amber-500/30 shadow-xl shadow-amber-500/10"
                    : "bg-gradient-to-br from-navy-900/80 to-navy-800/60 border border-navy-700/60"
                }`}>
                  {t.pop && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      Most Popular
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-white font-bold text-lg mb-2 tracking-wide">{t.name}</h3>
                    <div className="mb-3">
                      <span className="text-3xl font-bold text-white">{t.price}</span>
                      {t.period && <span className="text-sm text-slate-400 ml-1">{t.period}</span>}
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{t.desc}</p>
                  </div>
                  
                  <ul className="space-y-3 mb-8 flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-slate-200">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  
                  <a 
                    href={t.href} 
                    onClick={() => analytics.pricingPlanClick(t.name.toLowerCase())}
                    className={`text-center text-sm font-semibold px-6 py-3.5 rounded-xl transition-all duration-300 ${
                      t.pop 
                        ? "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg hover:shadow-purple-500/30" 
                        : t.premium
                        ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg hover:shadow-amber-500/30"
                        : "bg-navy-800/80 hover:bg-navy-700 text-white border border-navy-600/60 hover:border-navy-500"
                    }`}
                  >
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Shield, color: "text-purple-400", title: "Cornell Law × ai.ventures", desc: "Built by a legal technologist who understands both compliance frameworks and distributed systems. Patent-protected (USPTO #64/018,152)." },
            { icon: Server, color: "text-blue-400", title: "Running in Production", desc: "Live at console.regulator.ai. 9 execution control engines, cryptographic warrant issuance, immutable audit ledger. Not a whitepaper." },
            { icon: Zap, color: "text-emerald-400", title: "Framework Agnostic", desc: "One API. Works with OpenClaw, LangChain, CrewAI, AutoGen — any system that makes HTTP requests. 5 lines to integrate." },
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
              <a 
                href="/signup" 
                onClick={() => analytics.ctaClick('final_cta', 'start_free')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-7 py-3 rounded-xl transition font-semibold text-sm"
              >
                Start Free
              </a>
              <a 
                href="/try" 
                onClick={() => analytics.ctaClick('final_cta', 'try_live_api')}
                className="bg-navy-800 hover:bg-navy-700 text-white px-7 py-3 rounded-xl transition text-sm border border-navy-700"
              >
                Try Live API
              </a>
              <a 
                href="/contact" 
                onClick={() => analytics.ctaClick('final_cta', 'contact_sales')}
                className="text-sm text-slate-400 hover:text-white transition"
              >
                Contact Sales →
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ============================================
          FOOTER — Enhanced with gradient line and better spacing
          ============================================ */}
      <footer className="relative">
        {/* Gradient divider line */}
        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        
        <div className="bg-gradient-to-b from-navy-800/50 to-navy-900 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-purple-400" />
                  <span className="font-bold text-white text-lg tracking-tight">
                    Vienna<span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">OS</span>
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  The execution control layer for AI systems.
                </p>
                <div className="flex items-center gap-4">
                  <a href="https://github.com/risk-ai/regulator.ai" className="text-slate-500 hover:text-white transition">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </a>
                  <a href="mailto:admin@ai.ventures" className="text-slate-500 hover:text-white transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </a>
                </div>
              </div>
              
              {[
                { title: "Product", links: [["Console", "https://console.regulator.ai"], ["Live Demo", "/demo"], ["Try Live", "/try"], ["Docs", "/docs"], ["Integrations", "/integrations"], ["Status", "/status"]] },
                { title: "Company", links: [["About", "/about"], ["Blog", "/blog"], ["Changelog", "/changelog"], ["Contact", "/contact"], ["Security", "/security"]] },
                { title: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"], ["FAQ", "/faq"]] },
                { title: "Connect", links: [["GitHub", "https://github.com/risk-ai/regulator.ai"], ["Twitter", "https://twitter.com/ViennaOS"], ["LinkedIn", "https://linkedin.com/company/vienna-os"], ["Discord", "https://discord.gg/vienna-os"]] },
              ].map((col) => (
                <div key={col.title}>
                  <h4 className="text-sm font-bold text-white mb-4 tracking-wide">{col.title}</h4>
                  <div className="space-y-3">
                    {col.links.map(([label, href]) => (
                      <a key={label} href={href} className="block text-sm text-slate-400 hover:text-white transition-colors duration-200">{label}</a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-8 border-t border-slate-700/50 text-center">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  © 2026 Technetwork 2 LLC dba ai.ventures. All rights reserved.
                </span>
                <div className="flex items-center gap-6 text-sm text-slate-500">
                  <span>Built with ❤️ for AI governance</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    All systems operational
                  </span>
                </div>
              </div>
            </div>
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
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white px-4 py-3 rounded-lg transition text-sm font-medium min-h-[44px]"
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
            onClick={() => analytics.ctaClick('demo_section', 'try_interactive_demo')}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
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
