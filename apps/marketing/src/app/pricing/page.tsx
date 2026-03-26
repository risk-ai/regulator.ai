import { Metadata } from "next";
import { Check, X, Zap, Building2, Shield, Rocket } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — Vienna OS",
  description:
    "Simple per-agent pricing. Start free with Community, scale to Enterprise. No hidden fees.",
};

const tiers = [
  {
    name: "Community",
    price: "Free",
    period: "",
    description: "Open-source core. Self-hosted. Get started governing your agents today.",
    agents: "5 agents",
    icon: Rocket,
    cta: "Get Started",
    ctaHref: "https://github.com/risk-ai/regulator.ai",
    highlight: false,
    features: [
      { name: "Core governance pipeline", included: true },
      { name: "T0-T2 risk tiers", included: true },
      { name: "Policy engine", included: true },
      { name: "Cryptographic warrants", included: true },
      { name: "Audit trail", included: true },
      { name: "Community support (GitHub)", included: true },
      { name: "Self-hosted only", included: true },
      { name: "Cloud dashboard", included: false },
      { name: "SSO / SAML", included: false },
      { name: "Custom policies", included: false },
      { name: "SLA", included: false },
    ],
  },
  {
    name: "Team",
    price: "$49",
    period: "/agent/mo",
    description: "Cloud-hosted governance for growing teams. Everything in Community, plus managed infrastructure.",
    agents: "Up to 25 agents",
    icon: Zap,
    cta: "Start Free Trial",
    ctaHref: "/signup?plan=team",
    highlight: true,
    features: [
      { name: "Everything in Community", included: true },
      { name: "Cloud-hosted dashboard", included: true },
      { name: "T0-T3 risk tiers", included: true },
      { name: "Email + Slack integrations", included: true },
      { name: "Basic policy templates", included: true },
      { name: "Email support", included: true },
      { name: "7-day data retention", included: true },
      { name: "SSO / SAML", included: false },
      { name: "Custom policy builder", included: false },
      { name: "Dedicated CSM", included: false },
      { name: "On-premise deployment", included: false },
    ],
  },
  {
    name: "Business",
    price: "$99",
    period: "/agent/mo",
    description: "Advanced governance for enterprises. Custom policies, SSO, priority support.",
    agents: "Up to 100 agents",
    icon: Building2,
    cta: "Start Free Trial",
    ctaHref: "/signup?plan=business",
    highlight: false,
    features: [
      { name: "Everything in Team", included: true },
      { name: "SSO / SAML / OIDC", included: true },
      { name: "Custom policy builder", included: true },
      { name: "Policy versioning + rollback", included: true },
      { name: "GitHub + Webhook integrations", included: true },
      { name: "Compliance reports (PDF)", included: true },
      { name: "Priority support", included: true },
      { name: "30-day data retention", included: true },
      { name: "RBAC (role-based access)", included: true },
      { name: "On-premise deployment", included: false },
      { name: "Dedicated CSM", included: false },
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Unlimited governance. On-premise, SOC 2, dedicated support. Built for regulated industries.",
    agents: "Unlimited agents",
    icon: Shield,
    cta: "Contact Sales",
    ctaHref: "/contact?subject=enterprise",
    highlight: false,
    features: [
      { name: "Everything in Business", included: true },
      { name: "Unlimited agents", included: true },
      { name: "On-premise deployment", included: true },
      { name: "SOC 2 Type II report", included: true },
      { name: "HIPAA BAA available", included: true },
      { name: "Custom SLA (99.9%+)", included: true },
      { name: "Dedicated CSM", included: true },
      { name: "Unlimited data retention", included: true },
      { name: "AI policy suggestions", included: true },
      { name: "Anomaly detection", included: true },
      { name: "Professional services", included: true },
    ],
  },
];

const faqs = [
  {
    q: "What counts as an agent?",
    a: "An agent is any autonomous AI system that submits intents to Vienna OS. If you have 3 LangChain agents and 2 OpenClaw agents, that's 5 agents. Read-only monitoring doesn't count.",
  },
  {
    q: "Can I start free and upgrade?",
    a: "Yes. The Community tier is fully functional open-source software. When you're ready for cloud hosting, SSO, or compliance features, upgrade to Team or Business.",
  },
  {
    q: "Is there a free trial?",
    a: "Team and Business tiers include a 14-day free trial. No credit card required to start.",
  },
  {
    q: "What's the difference between self-hosted and cloud?",
    a: "Community is self-hosted — you run Vienna OS on your own infrastructure. Team and Business are cloud-hosted at regulator.ai with managed updates, backups, and support.",
  },
  {
    q: "Do you offer annual pricing?",
    a: "Yes. Annual plans save 20%. Contact us for details.",
  },
  {
    q: "What frameworks do you support?",
    a: "Vienna OS is framework-agnostic. We have official SDKs for OpenClaw, LangChain, CrewAI, and AutoGen. Any framework can integrate via our REST API.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0B0F19] text-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple, per-agent pricing
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Start free with the open-source Community tier. Scale to Enterprise when you need
          SSO, compliance, and dedicated support.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl p-6 border flex flex-col ${
                tier.highlight
                  ? "border-purple-500 bg-[#111826] ring-1 ring-purple-500/50"
                  : "border-gray-800 bg-[#111826]"
              }`}
            >
              {tier.highlight && (
                <div className="text-center mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider bg-purple-600 text-white px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <tier.icon className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold">{tier.name}</h3>
              </div>

              <div className="mb-2">
                <span className="text-3xl font-bold">{tier.price}</span>
                {tier.period && (
                  <span className="text-gray-400 text-sm">{tier.period}</span>
                )}
              </div>

              <p className="text-gray-400 text-sm mb-1">{tier.agents}</p>
              <p className="text-gray-500 text-xs mb-6">{tier.description}</p>

              <a
                href={tier.ctaHref}
                className={`block text-center py-2.5 rounded-lg font-semibold text-sm transition mb-6 ${
                  tier.highlight
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                }`}
              >
                {tier.cta}
              </a>

              <div className="space-y-2.5 flex-1">
                {tier.features.map((feature) => (
                  <div
                    key={feature.name}
                    className="flex items-start gap-2 text-sm"
                  >
                    {feature.included ? (
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    )}
                    <span
                      className={
                        feature.included ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Volume Discount */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-[#111826] rounded-xl border border-gray-800 p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">
            Governing 100+ agents?
          </h2>
          <p className="text-gray-400 mb-4">
            Enterprise plans include volume discounts, custom SLAs, and dedicated support.
            Let&apos;s build a plan that fits your fleet.
          </p>
          <a
            href="/contact?subject=enterprise"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-lg transition"
          >
            Talk to Sales
          </a>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-semibold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border-b border-gray-800 pb-5"
            >
              <h3 className="font-semibold mb-2">{faq.q}</h3>
              <p className="text-gray-400 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
