"use client";

import { Check, X, Zap, Building2, Shield, Rocket, Star, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { analytics } from "@/lib/analytics";
import LeadCaptureModal from "@/components/LeadCaptureModal";

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
    <main className="min-h-screen bg-navy-900 text-white">
      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={showLeadCapture}
        onClose={() => setShowLeadCapture(false)}
        trigger={leadCaptureTrigger}
        plan={selectedPlan}
      />
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Navigation */}
      <nav className="border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-7 h-7 text-violet-400" />
            <span className="font-bold text-white">Vienna<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">OS</span></span>
          </a>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-sm text-slate-400 hover:text-white transition">Docs</a>
            <a href="/signup" className="text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition font-medium">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Returning Visitor Banner */}
      {typeof window !== 'undefined' && localStorage.getItem('regulator_lead_capture') && (
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-purple-500/30">
          <div className="max-w-7xl mx-auto px-6 py-3 text-center">
            <p className="text-sm text-purple-300">
              👋 Welcome back! We noticed your interest in Vienna OS. 
              <button
                onClick={() => {
                  setLeadCaptureTrigger('returning_visitor');
                  setShowLeadCapture(true);
                }}
                className="ml-2 underline hover:no-underline font-medium"
              >
                Get priority support →
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Header with gradient background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center relative">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                Simple, per-agent pricing
              </span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Start free with the open-source Community tier. Scale to Enterprise when you need
              SSO, compliance, and dedicated support.
            </p>
            
            {/* Urgent CTA for high-intent visitors */}
            <div className="mt-8">
              <button
                onClick={() => {
                  setLeadCaptureTrigger('header_priority_access');
                  setShowLeadCapture(true);
                }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg hover:shadow-purple-500/25"
              >
                <Zap className="w-4 h-4" />
                Get Priority Access
              </button>
              <p className="text-xs text-slate-500 mt-2">
                Skip the queue • Get personalized guidance
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Pricing Cards with improved design */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {tiers.map((tier, i) => (
            <ScrollReveal key={tier.name} delay={i * 0.1}>
              <div
                className={`rounded-2xl p-6 border flex flex-col relative transition-all duration-300 hover:scale-105 ${
                  tier.highlight
                    ? "border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-navy-800 ring-1 ring-purple-500/30 shadow-lg shadow-purple-500/10"
                    : tier.premium
                    ? "border-gold-400/50 bg-gradient-to-br from-gold-400/10 to-navy-800 ring-1 ring-gold-400/30 shadow-lg shadow-gold-400/10"
                    : "border-navy-700 bg-gradient-to-br from-navy-800 to-navy-800/50 hover:border-navy-600 hover:bg-gradient-to-br hover:from-navy-700 hover:to-navy-800"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider bg-purple-600 text-white px-3 py-1 rounded-full">
                      <Star className="w-3 h-3" />
                      Most Popular
                    </div>
                  </div>
                )}

                {tier.premium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-gold-400 to-gold-500 text-navy-900 px-3 py-1 rounded-full seal-glow">
                      <Shield className="w-3 h-3" />
                      Premium
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <tier.icon className={`w-6 h-6 ${
                    tier.highlight ? 'text-purple-400' : 
                    tier.premium ? 'text-gold-400' : 'text-slate-400'
                  }`} />
                  <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                </div>

                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  {tier.period && (
                    <span className="text-slate-400 text-sm ml-1">{tier.period}</span>
                  )}
                </div>

                <p className="text-slate-300 text-sm mb-2 font-medium">{tier.agents}</p>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">{tier.description}</p>

                <div className="space-y-3 mb-6">
                  <a
                    href={tier.ctaHref}
                    onClick={() => analytics.pricingPlanClick(tier.name.toLowerCase())}
                    className={`block text-center py-3 rounded-xl font-semibold text-sm transition ${
                      tier.highlight
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg hover:shadow-purple-500/25"
                        : tier.premium
                        ? "bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 text-navy-900 font-bold shadow-lg hover:shadow-gold-400/25"
                        : "bg-navy-700 hover:bg-navy-600 text-white border border-navy-600 hover:border-navy-500"
                    }`}
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
                      className="block w-full text-center py-2 rounded-lg font-medium text-xs border border-slate-600 text-slate-300 hover:bg-slate-700/30 hover:border-slate-500 transition"
                    >
                      Get Custom Quote
                    </button>
                  )}
                </div>

                <div className="space-y-3 flex-1">
                  {tier.features.map((feature) => (
                    <div
                      key={feature.name}
                      className="flex items-start gap-3 text-sm"
                    >
                      {feature.included ? (
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                      )}
                      <span
                        className={
                          feature.included ? "text-slate-300" : "text-slate-600"
                        }
                      >
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Volume Discount Section */}
      <ScrollReveal>
        <div className="max-w-4xl mx-auto px-6 pb-20">
          <div className="bg-gradient-to-br from-purple-900/20 to-navy-800 border border-purple-500/20 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Governing 100+ agents?
            </h2>
            <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
              Enterprise plans include volume discounts, custom SLAs, and dedicated support.
              Let&apos;s build a plan that fits your fleet.
            </p>
            <a
              href="/contact?subject=enterprise"
              onClick={() => analytics.ctaClick('volume_discount', 'talk_to_sales')}
              className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition shadow-lg hover:shadow-purple-500/25"
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </ScrollReveal>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <ScrollReveal>
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
              Frequently Asked Questions
            </span>
          </h2>
        </ScrollReveal>
        
        <div className="space-y-1">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 0.05}>
              <div className="bg-navy-800/50 border border-navy-700/50 rounded-xl p-6 hover:bg-navy-800/70 transition-colors">
                <h3 className="font-semibold mb-3 text-white">{faq.q}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <ScrollReveal>
        <div className="border-t border-navy-700 py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Ready to govern your AI agents?
            </h2>
            <p className="text-slate-400 mb-8">
              Join teams already using Vienna OS to secure their agent deployments.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a 
                href="/signup" 
                onClick={() => analytics.ctaClick('pricing_bottom', 'start_free_trial')}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition shadow-lg hover:shadow-purple-500/25"
              >
                Start Free Trial
              </a>
              <a 
                href="/docs" 
                onClick={() => analytics.ctaClick('pricing_bottom', 'read_docs')}
                className="bg-navy-800 hover:bg-navy-700 text-white font-medium px-8 py-3 rounded-xl transition border border-navy-600 hover:border-navy-500"
              >
                Read the Docs
              </a>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </main>
  );
}
