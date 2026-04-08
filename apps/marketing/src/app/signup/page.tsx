"use client";

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
    <div className="min-h-screen bg-[#0a0e14]">
      {/* Nav */}
      <nav className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-7 h-7 text-amber-500" />
            <span className="font-bold text-white">
              Vienna<span className="bg-gradient-to-r from-gold-400 to-cyan-400 bg-clip-text text-transparent">OS</span>
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
            <p className="text-zinc-400 mb-10">
              Choose a plan. Free tier includes full sandbox console access — no
              credit card required.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`text-left p-5 transition border-2 ${
                    selectedPlan === plan.id
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-zinc-800 bg-black hover:border-amber-500/20"
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
                      <span className="text-xs text-zinc-500">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{plan.desc}</p>
                  <ul className="space-y-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-1.5 text-xs text-zinc-400"
                      >
                        <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("details")}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-8 py-3 transition font-medium"
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
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-6 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to plans
            </button>

            <h1 className="text-3xl font-bold text-white mb-2">
              Set up your account
            </h1>
            <p className="text-zinc-400 mb-8">
              Plan:{" "}
              <span className="text-amber-500 font-medium">
                {currentPlan.name}{" "}
                {currentPlan.price !== "Free" &&
                  currentPlan.price !== "Custom" &&
                  `(${currentPlan.price}${currentPlan.period})`}
              </span>
              {selectedPlan === "community" && (
                <span className="text-green-500 text-sm ml-2">
                  — No credit card required
                </span>
              )}
            </p>

            <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
              <div>
                <label htmlFor="signup-email" className="block text-sm text-zinc-400 mb-1.5">
                  Work Email *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onFocus={handleFormStart}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  className="w-full bg-black border border-zinc-800 px-4 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none transition"
                  placeholder="jane@company.com"
                />
              </div>

              <div>
                <label htmlFor="signup-name" className="block text-sm text-zinc-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full bg-black border border-zinc-800 px-4 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none transition"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label htmlFor="signup-company" className="block text-sm text-zinc-400 mb-1.5">
                  Company (optional)
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  className="w-full bg-black border border-zinc-800 px-4 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none transition"
                  placeholder="Acme Corp"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-8 py-3 transition font-medium disabled:opacity-50"
              >
                {submitting ? "Setting up..." : "Create Account"}
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-xs text-zinc-500">
                We&apos;ll never share your email. Unsubscribe anytime.
              </p>
            </form>
          </>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="max-w-lg">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <Zap className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              You&apos;re in!
            </h1>

            {selectedPlan === "community" ? (
              <>
                <p className="text-zinc-400 mb-6">
                  Your account is ready. Log in to the console to create your first API key and start governing your agents.
                </p>

                {/* Step 1: Console access */}
                <div className="bg-black border border-zinc-800 p-6 mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold flex items-center justify-center">1</span>
                    Log in to the Console
                  </h3>
                  <p className="text-sm text-zinc-400 mb-3">
                    Use the email and password you just created to sign in.
                  </p>
                  <a
                    href="https://console.regulator.ai"
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-6 py-2.5 transition font-medium text-sm"
                  >
                    Open Console <ArrowRight className="w-4 h-4" />
                  </a>
                </div>

                {/* Step 2: Create API key */}
                <div className="bg-black border border-zinc-800 p-6 mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold flex items-center justify-center">2</span>
                    Create an API Key
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Go to <span className="text-amber-500 font-medium">API Keys</span> in the console sidebar and create your first key. You&apos;ll get a <code className="text-xs bg-[#0a0e14] px-1.5 py-0.5 rounded text-green-500">vos_</code> prefixed token.
                  </p>
                </div>

                {/* Step 3: Make your first call */}
                <div className="bg-black border border-zinc-800 p-6 mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold flex items-center justify-center">3</span>
                    Make Your First API Call
                  </h3>
                  <pre className="font-mono text-xs text-zinc-400 mt-2 overflow-x-auto bg-[#0a0e14] p-4 border border-zinc-800">
{`curl -X POST https://console.regulator.ai/api/v1/intents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "my-agent",
    "action": "deploy",
    "params": {"environment": "staging"},
    "objective": "Deploy v2.4.1 to staging"
  }'`}
                  </pre>
                </div>

                <div className="flex items-center gap-4">
                  <a
                    href="/docs/getting-started"
                    className="text-sm text-zinc-400 hover:text-white transition"
                  >
                    Full getting started guide →
                  </a>
                  <a
                    href="/try"
                    className="text-sm text-zinc-400 hover:text-white transition"
                  >
                    Try the live playground →
                  </a>
                </div>
              </>
            ) : selectedPlan === "enterprise" ? (
              <>
                <p className="text-zinc-400 mb-6">
                  Thanks, {form.name.split(" ")[0] || "there"}! Our team will
                  reach out within 24 hours to discuss your enterprise
                  deployment. In the meantime, you can explore the sandbox
                  console.
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href="https://console.regulator.ai"
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-8 py-3 transition font-medium"
                  >
                    Explore Sandbox
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="/docs"
                    className="text-sm text-zinc-400 hover:text-white transition"
                  >
                    Read the docs →
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="text-zinc-400 mb-6">
                  Thanks, {form.name.split(" ")[0] || "there"}! We&apos;re
                  provisioning your {currentPlan.name} environment. You&apos;ll
                  receive setup instructions at{" "}
                  <span className="text-white">{form.email}</span> within the
                  hour. Meanwhile, explore the sandbox console.
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href="https://console.regulator.ai"
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-8 py-3 transition font-medium"
                  >
                    Explore Sandbox
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="/docs"
                    className="text-sm text-zinc-400 hover:text-white transition"
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
