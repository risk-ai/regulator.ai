"use client";

import { Check, X, Zap, Building2, Shield, Rocket, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { analytics } from "@/lib/analytics";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import FloatingContact from "@/components/FloatingContact";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const tiers = [
  {
    name: "Community",
    price: "Free",
    period: "",
    description: "Open-source core. Self-hosted. Get started governing your agents today.",
    agents: "5 agents",
    icon: Rocket,
    cta: "GET_STARTED",
    ctaHref: "https://github.com/risk-ai/regulator.ai",
    highlight: false,
    popular: false,
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
    cta: "START_FREE_TRIAL",
    ctaHref: "/signup?plan=team",
    highlight: true,
    popular: true,
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
    cta: "START_FREE_TRIAL",
    ctaHref: "/signup?plan=business",
    highlight: false,
    popular: false,
    features: [
      { name: "Everything in Team", included: true },
      { name: "SSO / SAML / OIDC", included: true },
      { name: "Custom policy builder", included: true },
      { name: "Policy versioning + rollback", included: true },
      { name: "GitHub + Webhook integrations", included: true },
      { name: "Compliance-ready reports (PDF)", included: true },
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
    description: "Unlimited governance. On-premise deployment, compliance enablement, dedicated support.",
    agents: "Unlimited agents",
    icon: Shield,
    cta: "CONTACT_SALES",
    ctaHref: "/contact?subject=enterprise",
    highlight: false,
    popular: false,
    premium: true,
    features: [
      { name: "Everything in Business", included: true },
      { name: "Unlimited agents", included: true },
      { name: "On-premise deployment", included: true },
      { name: "SOC 2 compliance enablement", included: true },
      { name: "HIPAA compliance enablement", included: true },
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

/* ============================================================
   ANIMATION COMPONENTS
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

export default function PricingPage() {
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadCaptureTrigger, setLeadCaptureTrigger] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [engagementActions, setEngagementActions] = useState<string[]>([]);

  useEffect(() => {
    analytics.pricingView();
    
    const trackEngagement = (action: string) => {
      setEngagementActions(prev => {
        const newActions = [...prev, action];
        if (newActions.length >= 3) {
          analytics.highEngagementDetected(newActions);
          setLeadCaptureTrigger('high_engagement');
          setShowLeadCapture(true);
        }
        return newActions;
      });
    };

    let maxScrollDepth = 0;
    const handleScroll = () => {
      const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        if (scrollDepth >= 50 && !engagementActions.includes('scroll_50')) {
          trackEngagement('scroll_50');
        }
        if (scrollDepth >= 80 && !engagementActions.includes('scroll_80')) {
          trackEngagement('scroll_80');
        }
      }
    };

    const startTime = Date.now();
    const timeTracker = setInterval(() => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      if (timeOnPage >= 60 && !engagementActions.includes('time_60s')) {
        trackEngagement('time_60s');
      }
      if (timeOnPage >= 120 && !engagementActions.includes('time_120s')) {
        trackEngagement('time_120s');
      }
    }, 10000);

    const originalClick = analytics.pricingPlanClick;
    let planClickCount = 0;
    analytics.pricingPlanClick = (plan: string) => {
      originalClick(plan);
      planClickCount++;
      if (planClickCount >= 2) {
        trackEngagement('multiple_plan_clicks');
      }
      if (planClickCount >= 3) {
        setLeadCaptureTrigger('multiple_pricing_clicks');
        setSelectedPlan(plan);
        setShowLeadCapture(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(timeTracker);
      analytics.pricingPlanClick = originalClick;
    };
  }, []);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": "https://regulator.ai/pricing#product",
    "name": "Vienna OS - AI Agent Governance Platform",
    "description": "Execution control infrastructure for autonomous AI systems with per-agent pricing. Start free with Community tier, scale to Enterprise with unlimited agents and on-premise deployment.",
    "brand": { "@type": "Brand", "name": "Vienna OS" },
    "manufacturer": { "@type": "Organization", "name": "ai.ventures", "url": "https://ai.ventures" },
    "category": "AI Governance Software",
    "offers": [
      {
        "@type": "Offer",
        "@id": "https://regulator.ai/pricing#community",
        "name": "Community",
        "description": "Open-source core. Self-hosted.",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "2030-12-31",
        "url": "https://github.com/risk-ai/regulator.ai",
        "eligibleQuantity": { "@type": "QuantitativeValue", "value": "5", "unitText": "agents" }
      },
      {
        "@type": "Offer",
        "@id": "https://regulator.ai/pricing#team",
        "name": "Team",
        "description": "Cloud-hosted governance for growing teams.",
        "price": "49",
        "priceCurrency": "USD",
        "priceSpecification": { "@type": "UnitPriceSpecification", "price": "49", "priceCurrency": "USD", "billingDuration": "P1M", "unitText": "agent" },
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "2030-12-31",
        "url": "https://regulator.ai/signup?plan=team",
        "eligibleQuantity": { "@type": "QuantitativeValue", "maxValue": "25", "unitText": "agents" }
      },
      {
        "@type": "Offer",
        "@id": "https://regulator.ai/pricing#business",
        "name": "Business",
        "description": "Advanced governance. Custom policies, SSO, priority support.",
        "price": "99",
        "priceCurrency": "USD",
        "priceSpecification": { "@type": "UnitPriceSpecification", "price": "99", "priceCurrency": "USD", "billingDuration": "P1M", "unitText": "agent" },
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "2030-12-31",
        "url": "https://regulator.ai/signup?plan=business",
        "eligibleQuantity": { "@type": "QuantitativeValue", "maxValue": "100", "unitText": "agents" }
      },
      {
        "@type": "Offer",
        "@id": "https://regulator.ai/pricing#enterprise",
        "name": "Enterprise",
        "description": "Unlimited governance. On-premise, compliance enablement, dedicated support.",
        "priceSpecification": { "@type": "PriceSpecification", "priceCurrency": "USD", "price": "Contact for pricing" },
        "availability": "https://schema.org/InStock",
        "url": "https://regulator.ai/contact?subject=enterprise",
        "eligibleQuantity": { "@type": "QuantitativeValue", "value": "unlimited", "unitText": "agents" }
      }
    ]
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={showLeadCapture}
        onClose={() => setShowLeadCapture(false)}
        trigger={leadCaptureTrigger}
        plan={selectedPlan}
      />
      <FloatingContact />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Navigation */}
      <SiteNav />

      <main className="flex-1 font-mono">
        {/* Header */}
        <section className="pt-20 pb-16 px-6 border-b border-amber-500/10">
          <div className="max-w-7xl mx-auto text-center">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 mb-8">
                <span className="flex h-2 w-2 bg-amber-500 animate-pulse"></span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
                  PRICING_MATRIX
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-mono font-bold tracking-tight mb-6">
                <span className="text-amber-500">SIMPLE_PER_AGENT_PRICING</span>
              </h1>
              <p className="text-zinc-500 font-mono text-sm max-w-2xl mx-auto leading-relaxed mb-8">
                start free with open-source community tier. scale to enterprise when you need
                SSO, compliance enablement, and dedicated support.
              </p>

              <button
                onClick={() => {
                  setLeadCaptureTrigger('header_priority_access');
                  setShowLeadCapture(true);
                }}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold px-6 py-3 transition uppercase text-sm"
              >
                <Zap className="w-4 h-4" />
                GET_PRIORITY_ACCESS →
              </button>
              <p className="text-[10px] font-mono text-zinc-600 mt-3">
                skip the queue • get personalized guidance
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {tiers.map((tier, i) => (
                <ScrollReveal key={tier.name} delay={i * 0.1}>
                  <div
                    className={`bg-black p-0 flex flex-col relative transition-all duration-300 hover:-translate-y-1 ${
                      tier.highlight
                        ? "border-2 border-amber-500/60 shadow-lg shadow-amber-500/5"
                        : tier.premium
                        ? "border-2 border-amber-500/40"
                        : "border border-zinc-800 hover:border-amber-500/30"
                    }`}
                  >
                    {/* Card Header Bar */}
                    <div className={`px-6 py-3 border-b flex items-center justify-between ${
                      tier.highlight
                        ? "bg-amber-500/10 border-amber-500/30"
                        : tier.premium
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-zinc-900/50 border-zinc-800"
                    }`}>
                      <div className="flex items-center gap-2">
                        <tier.icon className={`w-4 h-4 ${
                          tier.highlight || tier.premium ? 'text-amber-500' : 'text-zinc-600'
                        }`} />
                        <span className={`text-xs font-mono uppercase font-bold ${
                          tier.highlight || tier.premium ? 'text-amber-500' : 'text-zinc-400'
                        }`}>
                          {tier.name.toUpperCase()}
                        </span>
                      </div>
                      {tier.popular && (
                        <div className="flex items-center gap-1 text-[10px] font-mono uppercase bg-amber-500 text-black px-2 py-0.5 font-bold">
                          <Star className="w-3 h-3" />
                          POPULAR
                        </div>
                      )}
                      {tier.premium && (
                        <div className="flex items-center gap-1 text-[10px] font-mono uppercase bg-amber-500 text-black px-2 py-0.5 font-bold">
                          <Shield className="w-3 h-3" />
                          PREMIUM
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      {/* Price */}
                      <div className="mb-4 pb-4 border-b border-zinc-800">
                        <span className="text-3xl font-mono font-bold text-white">{tier.price}</span>
                        {tier.period && (
                          <span className="text-zinc-600 text-xs ml-1">{tier.period}</span>
                        )}
                        <div className="text-[10px] font-mono text-amber-500 mt-1">{tier.agents}</div>
                      </div>

                      {/* Description */}
                      <p className="text-zinc-500 text-xs font-mono mb-6 leading-relaxed">{tier.description}</p>

                      {/* CTA Buttons */}
                      <div className="space-y-2 mb-6">
                        <a
                          href={tier.ctaHref}
                          onClick={() => analytics.pricingPlanClick(tier.name.toLowerCase())}
                          className={`block text-center py-3 font-mono font-bold text-sm transition uppercase ${
                            tier.highlight
                              ? "bg-amber-500 hover:bg-amber-400 text-black"
                              : tier.premium
                              ? "bg-amber-500 hover:bg-amber-400 text-black"
                              : "bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500"
                          }`}
                        >
                          {tier.cta} →
                        </a>
                        
                        {(tier.name === 'Team' || tier.name === 'Business') && (
                          <button
                            onClick={() => {
                              analytics.pricingPlanClick(`${tier.name.toLowerCase()}_quote`);
                              setLeadCaptureTrigger('quote_request');
                              setSelectedPlan(tier.name);
                              setShowLeadCapture(true);
                            }}
                            className="block w-full text-center py-2 font-mono font-medium text-[10px] border border-zinc-800 text-zinc-500 hover:border-amber-500/30 hover:text-zinc-400 transition uppercase"
                          >
                            REQUEST_CUSTOM_QUOTE
                          </button>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-2 flex-1">
                        {tier.features.map((feature) => (
                          <div
                            key={feature.name}
                            className="flex items-start gap-2 text-xs font-mono"
                          >
                            {feature.included ? (
                              <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <X className="w-3 h-3 text-zinc-700 mt-0.5 flex-shrink-0" />
                            )}
                            <span className={feature.included ? "text-zinc-400" : "text-zinc-700"}>
                              {feature.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Volume Discount */}
        <section className="px-6 pb-16">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto">
              <div className="bg-black border border-amber-500/30 p-8">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-amber-500/20">
                  <Building2 className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-mono text-amber-500 uppercase font-bold">VOLUME_PRICING</span>
                </div>
                <h2 className="text-xl font-mono font-bold text-white mb-3">
                  Governing 100+ agents?
                </h2>
                <p className="text-zinc-500 font-mono text-sm mb-6 max-w-2xl">
                  Enterprise plans include volume discounts, custom SLAs, and dedicated support.
                  Let&apos;s build a plan that fits your fleet.
                </p>
                <a
                  href="/contact?subject=enterprise"
                  onClick={() => analytics.ctaClick('volume_discount', 'talk_to_sales')}
                  className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold px-8 py-3 transition uppercase text-sm"
                >
                  CONTACT_SALES →
                </a>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-6 border-t border-amber-500/10">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal>
              <div className="mb-12">
                <h2 className="text-2xl font-mono font-bold text-amber-500 mb-2">
                  FAQ_DATABASE
                </h2>
                <p className="text-zinc-600 font-mono text-xs">
                  frequently asked questions
                </p>
              </div>
            </ScrollReveal>
            
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <ScrollReveal key={i} delay={i * 0.05}>
                  <div className="bg-black border border-zinc-800 hover:border-amber-500/30 p-6 transition-colors">
                    <h3 className="font-mono font-bold text-sm text-white mb-3">{faq.q}</h3>
                    <p className="text-zinc-500 text-xs font-mono leading-relaxed">{faq.a}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-20 border-t border-amber-500/10">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h2 className="text-2xl font-mono font-bold text-white mb-4">
                <span className="text-amber-500">$</span> vienna-os init --tier production
              </h2>
              <p className="text-zinc-500 font-mono text-sm mb-8">
                start governing your AI agents today
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <a 
                  href="/signup" 
                  onClick={() => analytics.ctaClick('pricing_bottom', 'start_free_trial')}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold px-8 py-4 transition uppercase text-sm"
                >
                  START_FREE_TRIAL →
                </a>
                <a 
                  href="/docs" 
                  onClick={() => analytics.ctaClick('pricing_bottom', 'read_docs')}
                  className="bg-black border border-amber-500/30 hover:border-amber-500 text-amber-500 font-mono font-bold px-8 py-4 transition uppercase text-sm"
                >
                  VIEW_DOCS
                </a>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
