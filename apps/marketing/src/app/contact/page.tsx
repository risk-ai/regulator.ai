"use client";

import { useState } from "react";
import { Shield, ArrowLeft, Send, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", type: "general", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

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
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-6 h-6 text-purple-400" />
            <span className="font-bold text-white">Vienna<span className="text-purple-400">OS</span></span>
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {sent ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Message sent</h1>
            <p className="text-slate-400 mb-6">We&apos;ll get back to you within 24 hours.</p>
            <a href="/" className="text-sm text-purple-400 hover:text-purple-300">← Back to home</a>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white mb-2">Contact us</h1>
            <p className="text-slate-400 mb-10">
              Enterprise inquiry, partnership, technical question, or just want to chat about AI governance.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Name *</label>
                  <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none" placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none" placeholder="jane@company.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Company</label>
                <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none" placeholder="Acme Corp" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">What can we help with?</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none">
                  <option value="general">General inquiry</option>
                  <option value="enterprise">Enterprise plan</option>
                  <option value="partnership">Partnership</option>
                  <option value="technical">Technical question</option>
                  <option value="investment">Investment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Message *</label>
                <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none resize-none"
                  placeholder="Tell us about your use case..." />
              </div>

              <button type="submit" disabled={sending}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl transition font-medium text-sm">
                <Send className="w-4 h-4" />
                {sending ? "Sending..." : "Send Message"}
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-navy-700">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Or reach us directly</h3>
              <div className="space-y-2 text-sm text-slate-400">
                <p>General: <a href="mailto:admin@ai.ventures" className="text-purple-400 hover:text-purple-300">admin@ai.ventures</a></p>
                <p>Security: <a href="mailto:security@ai.ventures" className="text-purple-400 hover:text-purple-300">security@ai.ventures</a></p>
                <p>GitHub: <a href="https://github.com/risk-ai/regulator.ai" className="text-purple-400 hover:text-purple-300">risk-ai/regulator.ai</a></p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
