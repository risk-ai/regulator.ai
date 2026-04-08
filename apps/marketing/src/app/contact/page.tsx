"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, ArrowLeft, Send, CheckCircle, Mail, MessageCircle, Building, Github, Clock } from "lucide-react";

/* ============================================================
   SCROLL REVEAL ANIMATION
   ============================================================ */

function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay * 1000);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return <div ref={ref}>{children}</div>;
}

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", type: "general", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Handle URL parameters for subject
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    if (subject && subject === 'enterprise') {
      setForm(prev => ({ ...prev, type: 'enterprise' }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch {}
    setSending(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      {/* Navigation */}
      <nav className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-7 h-7 text-amber-500" />
            <span className="font-bold text-white">Vienna<span className="bg-gradient-to-r from-gold-400 to-cyan-400 bg-clip-text text-transparent">OS</span></span>
          </a>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-sm text-zinc-400 hover:text-white transition">Docs</a>
            <a href="/signup" className="text-sm bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 px-4 py-2 transition font-medium">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {sent ? (
          <ScrollReveal>
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Message sent successfully</h1>
              <p className="text-zinc-400 text-lg mb-8 max-w-lg mx-auto">
                Thank you for reaching out. We&apos;ll get back to you within 24 hours.
              </p>
              <div className="flex items-center justify-center gap-4">
                <a href="/" className="text-amber-500 hover:text-gold-300 font-medium transition">
                  ← Back to home
                </a>
                <a href="/docs" className="bg-amber-500 hover:bg-amber-400 text-white px-6 py-2.5 transition font-medium">
                  Explore Docs
                </a>
              </div>
            </div>
          </ScrollReveal>
        ) : (
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left Column - Info */}
            <ScrollReveal>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                    Let&apos;s talk
                  </span>
                </h1>
                <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
                  Whether you&apos;re evaluating Vienna OS for your enterprise, 
                  interested in a partnership, or have technical questions — we&apos;d love to hear from you.
                </p>

                {/* Contact Methods */}
                <div className="space-y-4 mb-12">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">General Inquiries</h3>
                      <p className="text-zinc-400 text-sm mb-1">Questions, partnerships, media</p>
                      <a href="mailto:admin@ai.ventures" className="text-amber-500 hover:text-gold-300 font-medium transition">
                        admin@ai.ventures
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Security Issues</h3>
                      <p className="text-zinc-400 text-sm mb-1">Vulnerabilities, compliance concerns</p>
                      <a href="mailto:security@ai.ventures" className="text-red-400 hover:text-red-300 font-medium transition">
                        security@ai.ventures
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-500/20 border border-slate-500/30 flex items-center justify-center">
                      <Github className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Open Source</h3>
                      <p className="text-zinc-400 text-sm mb-1">Issues, contributions, discussions</p>
                      <a 
                        href="https://github.com/risk-ai/regulator.ai" 
                        className="text-zinc-400 hover:text-zinc-300 font-medium transition"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        risk-ai/regulator.ai
                      </a>
                    </div>
                  </div>
                </div>

                {/* Response Time */}
                <div className="bg-black border border-zinc-800 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <h3 className="text-white font-semibold">Response Time</h3>
                  </div>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <p>• General inquiries: Within 24 hours</p>
                    <p>• Enterprise/sales: Within 4 hours</p>
                    <p>• Security issues: Within 2 hours</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Right Column - Contact Form */}
            <ScrollReveal delay={0.2}>
              <div className="bg-black border border-zinc-800 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <MessageCircle className="w-6 h-6 text-amber-500" />
                  <h2 className="text-2xl font-bold text-white">Send us a message</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Name *</label>
                      <input 
                        required 
                        type="text" 
                        value={form.name} 
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-[#0a0e14] border border-amber-500/20 px-4 py-3 text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-gold-400/50 transition-colors" 
                        placeholder="Jane Smith" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Email *</label>
                      <input 
                        required 
                        type="email" 
                        value={form.email} 
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full bg-[#0a0e14] border border-amber-500/20 px-4 py-3 text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-gold-400/50 transition-colors" 
                        placeholder="jane@company.com" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Company</label>
                    <input 
                      type="text" 
                      value={form.company} 
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      className="w-full bg-[#0a0e14] border border-amber-500/20 px-4 py-3 text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-gold-400/50 transition-colors" 
                      placeholder="Acme Corp" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">What can we help with?</label>
                    <select 
                      value={form.type} 
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full bg-[#0a0e14] border border-amber-500/20 px-4 py-3 text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-gold-400/50 transition-colors"
                    >
                      <option value="general">General inquiry</option>
                      <option value="enterprise">Enterprise plan</option>
                      <option value="partnership">Partnership opportunity</option>
                      <option value="technical">Technical question</option>
                      <option value="investment">Investment discussion</option>
                      <option value="security">Security concern</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Message *</label>
                    <textarea 
                      required 
                      value={form.message} 
                      onChange={(e) => setForm({ ...form, message: e.target.value })} 
                      rows={6}
                      className="w-full bg-[#0a0e14] border border-amber-500/20 px-4 py-3 text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-gold-400/50 transition-colors resize-none"
                      placeholder="Tell us about your use case, requirements, or question..."
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 transition font-semibold shadow-lg hover:shadow-gold-400/25"
                  >
                    <Send className="w-5 h-5" />
                    {sending ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </div>
            </ScrollReveal>
          </div>
        )}
      </main>
    </div>
  );
}
