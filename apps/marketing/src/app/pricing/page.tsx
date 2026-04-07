"use client";

import { Check, X, Zap, Building2, Shield, Rocket, Star, ArrowLeft } from "lucide-react";
import Link from "next/link";
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
    cta: "Get Started",
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
    cta: "Start Free Trial",
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
    cta: "Start Free Trial",
    ctaHref: "/signup?plan=business",
    highlight: false,
    popular: false,
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
    popular: false,
    premium: true,
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

/* ============================================================
   ANIMATION COMPONENTS
   ============================================================ */

/** Simplified scroll reveal for pricing page */
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

  // Track pricing page view and engagement
  useEffect(() => {
    analytics.pricingView();
    
    // Track high engagement behavior
    const trackEngagement = (action: string) => {
      setEngagementActions(prev => {
        const newActions = [...prev, action];
        
        // Show lead capture after multiple engagement signals
        if (newActions.length >= 3) {
          analytics.highEngagementDetected(newActions);
          setLeadCaptureTrigger('high_engagement');
          setShowLeadCapture(true);
        }
        
        return newActions;
      });
    };

    // Track scroll depth
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

    // Track time on page
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

    // Track multiple plan clicks
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

  // Structured data for pricing page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": "https://regulator.ai/pricing#product",
    "name": "Vienna OS - AI Agent Governance Platform",
    "description": "Execution control infrastructure for autonomous AI systems with per-agent pricing. Start free with Community tier, scale to Enterprise with unlimited agents and on-premise deployment.",
    "brand": {
      "@type": "Brand",
      "name": "Vienna OS"
    },
    "manufacturer": {
      "@type": "Organization",
      "name": "ai.ventures",
      "url": "https://ai.ventures"
    },
    "category": "AI Governance Software",
    "offers": [
      {
        "@type": "Offer",
        "@id": "https://regulator.ai/pricing#community",
        "name": "Community",
        "description": "Open-source core. Self-hosted. Get started governing your agents today.",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "2030-12-31",
        "url": "https://github.com/risk-ai/regulator.ai",
        "eligibleQuantity": {
          "@type": "QuantitativeValue",
          "value": "5",
          "unitText": "agents"
        }
      },
      {
        "@type": "Offer",
        "@id": "https://regulator.ai/pricing#team",
        "name": "Team",
        "description": "Cloud-hosted governance for growing teams. Everything in Community, plus managed infrastructure.",
        "price": "49",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "49",
          "priceCurrency": "USD",
          "billingDuration": "P1M",
          "unitText": "agent"
        },
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "2030-12-31",
        "url": "https://regulator.ai/signup?plan=team",
        "eligibleQuantity": {
          "@type": "QuantitativeValue",
          "maxValue": "25",
          "unitText": "agents"
        }
      },
      {
        "@type": "Offer",
        "@id": "https://regulator.ai/pricing#business",
        "name": "Business",
        "description": "Advanced governance for enterprises. Custom policies, SSO, priority support.",
        "price": "99",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "99",
          "priceCurrency": "USD",
          "billingDuration": "P1M",
          "unitText": "agent"
        },
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "2030-12-31",
        "url": "https://regulator.ai/signup?plan=business",
        "eligibleQuantity": {
          "@type": "QuantitativeValue",
          "maxValue": "100",
          "unitText": "agents"
        }
      },
      {
        "@type": "Offer",
        "@id": "https://regulator.ai/pricing#enterprise",
        "name": "Enterprise",
        "description": "Unlimited governance. On-premise, SOC 2, dedicated support. Built for regulated industries.",
        "priceSpecification": {
          "@type": "PriceSpecification",
          "priceCurrency": "USD",
          "price": "Contact for pricing"
        },
        "availability": "https://schema.org/InStock",
        "url": "https://regulator.ai/contact?subject=enterprise",
        "eligibleQuantity": {
          "@type": "QuantitativeValue",
          "value": "unlimited",
          "unitText": "agents"
        }
      }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "12",
      "bestRating": "5",
      "worstRating": "1"
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#0a0e14] text-white">
      {/* Terminal Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'linear-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      ></div>

      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={showLeadCapture}
        onClose={() => setShowLeadCapture(false)}
        trigger={leadCaptureTrigger}
        plan={selectedPlan}
      />
      {/* Floating Contact Widget */}
      <FloatingContact />
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Sticky Header Container */}
      <div className="sticky top-0 z-50">
        <SiteNav />
      </div>

      <main className="flex-1 relative z-10">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
                PRICING_CALCULATOR
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-mono font-bold tracking-tight leading-tight mb-6">
              <span className="text-amber-500">AGENT_GOVERNANCE</span>
              <br />
              <span className="text-zinc-500">/ PRICING_TIERS</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed font-mono mb-8">
              Start free with Community. Scale to Enterprise with unlimited agents, on-premise deployment, and SOC 2 compliance.
            </p>

            {/* Urgent CTA */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  setLeadCaptureTrigger('header_priority_access');
                  setShowLeadCapture(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 font-mono font-bold flex items-center gap-2 transition-all uppercase text-sm"
              >
                <Zap className="w-4 h-4" />
                GET_PRIORITY_ACCESS
              </button>
              <Link 
                href="/docs"
                className="bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-8 py-4 font-mono font-bold transition-all uppercase text-sm"
              >
                VIEW_DOCS
              </Link>
            </div>
          </ScrollReveal>
        </div>

      {/* Pricing Cards - Terminal Style */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {tiers.map((tier, i) => (
            <ScrollReveal key={tier.name} delay={i * 0.1}>
              <div className="bg-black border border-amber-500/30 p-0 overflow-hidden font-mono flex flex-col relative transition-all duration-300 hover:border-amber-500/60">
                {/* Header Bar */}
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <tier.icon className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-amber-500 uppercase">{tier.name}_TIER</span>
                  </div>
                  {tier.popular && <Star className="w-3 h-3 text-amber-500" />}
                  {tier.premium && <Shield className="w-3 h-3 text-amber-500" />}
                </div>

                <div className="p-6 space-y-6 flex-1 flex flex-col">
                  <div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Price</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-mono font-bold text-amber-500">{tier.price}</span>
                      {tier.period && <span className="text-xs font-mono text-zinc-500">{tier.period}</span>}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Capacity</div>
                    <div className="text-sm font-mono text-zinc-400">{tier.agents}</div>
                  </div>

                  <p className="text-xs font-mono text-zinc-400 leading-relaxed">{tier.description}</p>

                  <div className="space-y-2 pt-2 border-t border-amber-500/10">
                    <a
                      href={tier.ctaHref}
                      onClick={() => analytics.pricingPlanClick(tier.name.toLowerCase())}
                      className="block text-center py-3 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase transition"
                    >
                      {tier.cta}
                    </a>
                    
                    {(tier.name === 'Team' || tier.name === 'Business') && (
                      <button
                        onClick={() => {
                          analytics.pricingPlanClick(`${tier.name.toLowerCase()}_quote`);
                          setLeadCaptureTrigger('quote_request');
                          setSelectedPlan(tier.name);
                          setShowLeadCapture(true);
                        }}
                        className="w-full text-center py-2 bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500 font-mono font-bold text-xs uppercase transition"
                      >
                        QUOTE_REQUEST
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 pt-4 border-t border-amber-500/10">
                    {tier.features.map((feature) => (
                      <div key={feature.name} className="flex items-start gap-2 text-xs">
                        {feature.included ? (
                          <span className="text-amber-500 font-bold">✓</span>
                        ) : (
                          <span className="text-zinc-600">✗</span>
                        )}
                        <span className={feature.included ? "text-zinc-400" : "text-zinc-600"}>
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

      {/* Volume Discount Section */}
      <ScrollReveal>
        <div className="max-w-4xl mx-auto px-6 pb-20">
          <div className="bg-black border border-amber-500/30 p-8">
            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">ENTERPRISE</div>
            <h2 className="text-2xl font-mono font-bold text-amber-500 mb-3">
              GOVERNING_100+_AGENTS
            </h2>
            <p className="text-zinc-400 font-mono text-sm mb-6 leading-relaxed">
              Enterprise plans include volume discounts, custom SLAs, and dedicated support.
              Build a plan that fits your fleet.
            </p>
            <a
              href="/contact?subject=enterprise"
              onClick={() => analytics.ctaClick('volume_discount', 'talk_to_sales')}
              className="inline-block bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 font-mono font-bold text-xs uppercase transition"
            >
              TALK_TO_SALES →
            </a>
          </div>
        </div>
      </ScrollReveal>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <ScrollReveal>
          <h2 className="text-3xl font-mono font-bold mb-12">
            <span className="text-amber-500">FAQ</span>
            <span className="text-zinc-500"> / PRICING_QUESTIONS</span>
          </h2>
        </ScrollReveal>
        
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 0.05}>
              <div className="bg-black border border-amber-500/30 p-6">
                <h3 className="font-mono font-bold mb-3 text-amber-500 text-sm">{faq.q}</h3>
                <p className="text-zinc-400 text-xs font-mono leading-relaxed">{faq.a}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom CTA */}
        <ScrollReveal>
        <div className="border-t border-amber-500/20 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Ready?</div>
            <h2 className="text-3xl font-mono font-bold text-amber-500 mb-3">
              READY_TO_GOVERN_YOUR_AI_AGENTS
            </h2>
            <p className="text-zinc-400 font-mono text-sm mb-8 leading-relaxed">
              Join teams already using Vienna OS to secure their agent deployments.
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href="/signup" 
                onClick={() => analytics.ctaClick('pricing_bottom', 'start_free_trial')}
                className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 font-mono font-bold text-xs uppercase transition"
              >
                START_FREE_TRIAL →
              </a>
              <a 
                href="/docs" 
                onClick={() => analytics.ctaClick('pricing_bottom', 'read_docs')}
                className="bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-8 py-4 font-mono font-bold text-xs uppercase transition"
              >
                READ_DOCS
              </a>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </main>

      <SiteFooter />
    </div>
  );
}
