"use client";
import Image from "next/image";

import { useState, useEffect } from "react";
import { Shield, ArrowRight, ArrowLeft, Check, Zap } from "lucide-react";
import { analytics } from "@/lib/analytics";

const plans = [
  {
    id: "community",
    name: "Community",
    price: "Free",
    period: "",
    desc: "Open-source core, self-hosted or use our sandbox",
    features: [
      "Up to 5 agents",
      "Full governance pipeline",
      "Sandbox console access",
      "Community support",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$49",
    period: "/agent/mo",
    desc: "Cloud-hosted for growing teams",
    features: [
      "Up to 25 agents",
      "Cloud-hosted console",
      "Basic policy templates",
      "Email support",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "$99",
    period: "/agent/mo",
    desc: "Advanced governance at scale",
    features: [
      "Up to 100 agents",
      "Custom policy rules",
      "SSO / SAML",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "On-prem, unlimited, dedicated CSM",
    features: [
      "Unlimited agents",
      "On-premise deployment",
      "SLA & dedicated CSM",
      "Compliance certs",
    ],
  },
];

export default function SignupPage() {
  const [selectedPlan, setSelectedPlan] = useState("community");
  const [step, setStep] = useState<"plan" | "details" | "done">("plan");
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    agentCount: "",
    useCase: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Track page view
  useEffect(() => {
    analytics.signupPageView();
  }, []);

  // Track when form is started (first input interaction)
  const [formStarted, setFormStarted] = useState(false);
  const handleFormStart = () => {
    if (!formStarted) {
      setFormStarted(true);
      analytics.signupFormStart();
    }
  };

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Track form submit
    analytics.signupFormSubmit(selectedPlan);

    try {
      // Always capture the signup
      await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plan: selectedPlan }),
      });

      // For paid plans, redirect to Stripe checkout
      if (selectedPlan === "team" || selectedPlan === "business") {
        const checkoutRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: selectedPlan,
            email: form.email,
            name: form.name,
          }),
        });
        const checkout = await checkoutRes.json();
        if (checkout.url) {
          window.location.href = checkout.url;
          return;
        }
        // If Stripe fails, still show the success page
      }
    } catch {
      // Still proceed — show console access
    }

    setSubmitting(false);
    setStep("done");
    
    // Track signup success
    analytics.signupSuccess(selectedPlan);
  };

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Nav */}
      <nav className="border-b border-navy-700">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <Image src="/logo-mark.png" alt="Vienna OS" width={28} height={28} className="w-7 h-7" />
            <span className="font-bold text-white">
              Vienna<span className="text-purple-400">OS</span>
            </span>
          </a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Step 1: Choose Plan */}
        {step === "plan" && (
          <>
            <h1 className="text-3xl font-bold text-white mb-2">
              Get started with Vienna OS
            </h1>
            <p className="text-slate-400 mb-10">
              Choose a plan. Free tier includes full sandbox console access — no
              credit card required.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`text-left rounded-xl p-5 transition border-2 ${
                    selectedPlan === plan.id
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-navy-700 bg-navy-800 hover:border-navy-600"
                  }`}
                >
                  <h3 className="text-white font-semibold mb-1">
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <span className="text-2xl font-bold text-white">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-xs text-slate-500">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{plan.desc}</p>
                  <ul className="space-y-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-1.5 text-xs text-slate-400"
                      >
                        <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("details")}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-medium"
            >
              Continue with {currentPlan.name}
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Step 2: Your Details */}
        {step === "details" && (
          <>
            <button
              onClick={() => setStep("plan")}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to plans
            </button>

            <h1 className="text-3xl font-bold text-white mb-2">
              Set up your account
            </h1>
            <p className="text-slate-400 mb-8">
              Plan:{" "}
              <span className="text-purple-400 font-medium">
                {currentPlan.name}{" "}
                {currentPlan.price !== "Free" &&
                  currentPlan.price !== "Custom" &&
                  `(${currentPlan.price}${currentPlan.period})`}
              </span>
              {selectedPlan === "community" && (
                <span className="text-emerald-400 text-sm ml-2">
                  — No credit card required
                </span>
              )}
            </p>

            <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
              <div>
                <label htmlFor="signup-name" className="block text-sm text-slate-400 mb-1.5">
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onFocus={handleFormStart}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none transition"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-sm text-slate-400 mb-1.5">
                  Work Email *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none transition"
                  placeholder="jane@company.com"
                />
              </div>

              <div>
                <label htmlFor="signup-company" className="block text-sm text-slate-400 mb-1.5">
                  Company
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none transition"
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label htmlFor="signup-agents" className="block text-sm text-slate-400 mb-1.5">
                  How many AI agents are you running?
                </label>
                <select
                  value={form.agentCount}
                  onChange={(e) =>
                    setForm({ ...form, agentCount: e.target.value })
                  }
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none transition"
                >
                  <option value="">Select...</option>
                  <option value="1-5">1–5</option>
                  <option value="6-25">6–25</option>
                  <option value="26-100">26–100</option>
                  <option value="100+">100+</option>
                  <option value="exploring">Just exploring</option>
                </select>
              </div>

              <div>
                <label htmlFor="signup-usecase" className="block text-sm text-slate-400 mb-1.5">
                  Primary use case (optional)
                </label>
                <textarea
                  value={form.useCase}
                  onChange={(e) =>
                    setForm({ ...form, useCase: e.target.value })
                  }
                  rows={3}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none transition resize-none"
                  placeholder="e.g., Govern our DevOps agent fleet, enforce approval policies for financial transactions..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-medium disabled:opacity-50"
              >
                {submitting ? "Setting up..." : "Create Account"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="max-w-lg">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <Zap className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              You&apos;re in!
            </h1>

            {selectedPlan === "community" ? (
              <>
                <p className="text-slate-400 mb-6">
                  Your sandbox console is ready. Log in with the credentials
                  below and start governing your agents.
                </p>

                <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
                  <h3 className="text-white font-semibold mb-3">
                    Console Access
                  </h3>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 w-24">URL:</span>
                      <a
                        href="https://console.regulator.ai"
                        className="text-purple-400 hover:text-purple-300 transition"
                      >
                        console.regulator.ai
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 w-24">Username:</span>
                      <span className="text-white">vienna</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 w-24">Password:</span>
                      <span className="text-white">vienna2024</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    This is the shared sandbox. Your dedicated environment with individual credentials will be available soon.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <a
                    href="https://console.regulator.ai"
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-medium"
                  >
                    Open Console
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="/docs"
                    className="text-sm text-slate-400 hover:text-white transition"
                  >
                    Read the docs →
                  </a>
                </div>

                <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-blue-400">
                    <strong>Quick test:</strong> Try submitting an agent intent
                    via the API:
                  </p>
                  <pre className="font-mono text-xs text-slate-400 mt-2 overflow-x-auto">
{`curl -X POST https://console.regulator.ai/api/v1/agent/intent \\
  -H "Content-Type: application/json" \\
  -d '{"action":"check_health","source":"openclaw","tenant_id":"test"}'`}
                  </pre>
                </div>
              </>
            ) : selectedPlan === "enterprise" ? (
              <>
                <p className="text-slate-400 mb-6">
                  Thanks, {form.name.split(" ")[0] || "there"}! Our team will
                  reach out within 24 hours to discuss your enterprise
                  deployment. In the meantime, you can explore the sandbox
                  console.
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href="https://console.regulator.ai"
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-medium"
                  >
                    Explore Sandbox
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="/docs"
                    className="text-sm text-slate-400 hover:text-white transition"
                  >
                    Read the docs →
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-400 mb-6">
                  Thanks, {form.name.split(" ")[0] || "there"}! We&apos;re
                  provisioning your {currentPlan.name} environment. You&apos;ll
                  receive setup instructions at{" "}
                  <span className="text-white">{form.email}</span> within the
                  hour. Meanwhile, explore the sandbox console.
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href="https://console.regulator.ai"
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-medium"
                  >
                    Explore Sandbox
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="/docs"
                    className="text-sm text-slate-400 hover:text-white transition"
                  >
                    Read the docs →
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
