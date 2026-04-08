"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, Send, CheckCircle, Mail, MessageCircle, Github, Clock } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

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
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      <SiteNav />

      <main className="font-mono flex-1 max-w-6xl mx-auto px-6 py-16">
        {sent ? (
          <ScrollReveal>
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h1 className="text-3xl font-mono font-bold text-amber-500 mb-4">MESSAGE_SENT_SUCCESSFULLY</h1>
              <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto font-mono">
                Thank you for reaching out. We'll get back to you within 24 hours.
              </p>
              <div className="flex items-center justify-center gap-4">
                <a href="/" className="text-amber-500 hover:text-amber-400 font-mono font-bold uppercase transition">
                  ← BACK_TO_HOME
                </a>
                <a href="/docs" className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2.5 transition font-mono font-bold uppercase">
                  EXPLORE_DOCS
                </a>
              </div>
            </div>
          </ScrollReveal>
        ) : (
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left Column - Info */}
            <ScrollReveal>
              <div>
                <h1 className="text-4xl md:text-5xl font-mono font-bold mb-6 text-amber-500">
                  LETS_TALK
                </h1>
                <p className="text-xl text-gray-400 mb-8 leading-relaxed font-mono">
                  Whether you're evaluating Vienna OS for your enterprise, 
                  interested in a partnership, or have technical questions — we'd love to hear from you.
                </p>

                {/* Contact Methods */}
                <div className="space-y-4 mb-12">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-white font-mono font-bold mb-1">GENERAL_INQUIRIES</h3>
                      <p className="text-gray-500 text-sm mb-1 font-mono">Questions, partnerships, media</p>
                      <a href="mailto:admin@ai.ventures" className="text-amber-500 hover:text-amber-400 font-mono font-bold transition">
                        admin@ai.ventures
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-mono font-bold mb-1">SECURITY_ISSUES</h3>
                      <p className="text-gray-500 text-sm mb-1 font-mono">Vulnerabilities, compliance concerns</p>
                      <a href="mailto:security@ai.ventures" className="text-red-400 hover:text-red-300 font-mono font-bold transition">
                        security@ai.ventures
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-500/20 border border-gray-500/30 flex items-center justify-center">
                      <Github className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-mono font-bold mb-1">OPEN_SOURCE</h3>
                      <p className="text-gray-500 text-sm mb-1 font-mono">Issues, contributions, discussions</p>
                      <a 
                        href="https://github.com/risk-ai/regulator.ai" 
                        className="text-gray-400 hover:text-gray-300 font-mono font-bold transition"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        risk-ai/regulator.ai
                      </a>
                    </div>
                  </div>
                </div>

                {/* Response Time */}
                <div className="bg-black border border-amber-500/30 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <h3 className="text-white font-mono font-bold">RESPONSE_TIME</h3>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1 font-mono">
                    <p>• General inquiries: Within 24 hours</p>
                    <p>• Enterprise/sales: Within 4 hours</p>
                    <p>• Security issues: Within 2 hours</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Right Column - Contact Form */}
            <ScrollReveal delay={0.2}>
              <div className="bg-black border border-amber-500/30 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <MessageCircle className="w-6 h-6 text-amber-500" />
                  <h2 className="text-2xl font-mono font-bold text-amber-500">SEND_US_A_MESSAGE</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-mono font-bold text-gray-400 mb-2">NAME *</label>
                      <input 
                        required 
                        type="text" 
                        value={form.name} 
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-black border border-amber-500/30 px-4 py-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors" 
                        placeholder="Jane Smith" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-mono font-bold text-gray-400 mb-2">EMAIL *</label>
                      <input 
                        required 
                        type="email" 
                        value={form.email} 
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full bg-black border border-amber-500/30 px-4 py-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors" 
                        placeholder="jane@company.com" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-mono font-bold text-gray-400 mb-2">COMPANY</label>
                    <input 
                      type="text" 
                      value={form.company} 
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      className="w-full bg-black border border-amber-500/30 px-4 py-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors" 
                      placeholder="Acme Corp" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-mono font-bold text-gray-400 mb-2">WHAT_CAN_WE_HELP_WITH?</label>
                    <select 
                      value={form.type} 
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full bg-black border border-amber-500/30 px-4 py-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
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
                    <label className="block text-sm font-mono font-bold text-gray-400 mb-2">MESSAGE *</label>
                    <textarea 
                      required 
                      value={form.message} 
                      onChange={(e) => setForm({ ...form, message: e.target.value })} 
                      rows={6}
                      className="w-full bg-black border border-amber-500/30 px-4 py-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors resize-none"
                      placeholder="Tell us about your use case, requirements, or question..."
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black px-8 py-3 transition font-mono font-bold uppercase"
                  >
                    <Send className="w-5 h-5" />
                    {sending ? "SENDING..." : "SEND_MESSAGE"}
                  </button>
                </form>
              </div>
            </ScrollReveal>
          </div>
        )}
      </main>
      
      <SiteFooter />
    </div>
  );
}
