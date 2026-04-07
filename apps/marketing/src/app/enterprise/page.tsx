"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Shield, 
  ArrowLeft, 
  Check, 
  X, 
  Building2, 
  Users, 
  Lock, 
  Award, 
  Fingerprint,
  Scale,
  Eye,
  Clock,
  HeadphonesIcon,
  Database,
  Settings,
  Zap,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { analytics } from "@/lib/analytics";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import FloatingContact from "@/components/FloatingContact";
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

/* ============================================================
   ENTERPRISE CAPABILITIES DATA
   ============================================================ */

const enterpriseCapabilities = [
  {
    icon: Users,
    title: "Unlimited Agents",
    description: "Scale governance across your entire autonomous AI fleet without agent-based restrictions"
  },
  {
    icon: Building2,
    title: "On-premise/VPC Deployment",
    description: "Deploy Vienna OS in your own infrastructure for maximum security and control"
  },
  {
    icon: Award,
    title: "SOC 2 Type II (Roadmap)",
    description: "Comprehensive security controls audit with continuous monitoring and reporting"
  },
  {
    icon: Shield,
    title: "HIPAA BAA (Roadmap)",
    description: "Business Associate Agreement available for healthcare and regulated data governance"
  },
  {
    icon: Scale,
    title: "Custom SLA (Coming Soon)",
    description: "Guaranteed uptime with custom service level agreements tailored to your requirements"
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated CSM (Coming Soon)",
    description: "Dedicated Customer Success Manager for onboarding, training, and ongoing support"
  },
  {
    icon: Database,
    title: "Unlimited Data Retention",
    description: "Keep audit trails and governance data for as long as your compliance requires"
  },
  {
    icon: Settings,
    title: "Professional Services (Coming Soon)",
    description: "Custom integration, policy development, and deployment assistance from our experts"
  },
  {
    icon: Eye,
    title: "Custom Policy Builder",
    description: "Advanced policy creation tools with custom risk models and approval workflows"
  },
  {
    icon: TrendingUp,
    title: "Anomaly Detection (Coming Soon)",
    description: "AI-powered detection of unusual agent behavior patterns and governance violations"
  }
];

const complianceFeatures = [
  {
    icon: Award,
    title: "SOC 2 Type II",
    description: "Comprehensive security controls with annual third-party audits"
  },
  {
    icon: Shield,
    title: "HIPAA Ready",
    description: "Healthcare data governance with Business Associate Agreements"
  },
  {
    icon: Scale,
    title: "ISO 27001 Ready",
    description: "Information security management system aligned with international standards"
  },
  {
    icon: Building2,
    title: "FedRAMP Pathway",
    description: "Federal cloud security compliance pathway for government deployments (roadmap)"
  }
];

const comparisonData = [
  {
    feature: "Agents",
    business: "Up to 100",
    enterprise: "Unlimited"
  },
  {
    feature: "Deployment",
    business: "Cloud only",
    enterprise: "On-premise, VPC, Hybrid"
  },
  {
    feature: "Data retention",
    business: "30 days",
    enterprise: "Unlimited"
  },
  {
    feature: "Support",
    business: "Priority support",
    enterprise: "Dedicated CSM + 24/7"
  },
  {
    feature: "Compliance",
    business: "Basic reporting",
    enterprise: "SOC 2, HIPAA, ISO 27001"
  },
  {
    feature: "SLA",
    business: "99.5%",
    enterprise: "99.9%+ (Custom)"
  },
  {
    feature: "Policy engine",
    business: "Templates + custom",
    enterprise: "Advanced builder + AI suggestions"
  },
  {
    feature: "Professional services",
    business: "",
    enterprise: "Included"
  }
];

const trustLogos = [
  { name: "Fortune 500", industry: "Enterprise" },
  { name: "Healthcare", industry: "HIPAA" },
  { name: "Financial Services", industry: "SOC 2" },
  { name: "Government", industry: "FedRAMP" },
  { name: "Manufacturing", industry: "ISO 27001" },
  { name: "Technology", industry: "Enterprise AI" }
];

/* ============================================================
   ROI CALCULATOR COMPONENT
   ============================================================ */

/* ROI Calculator removed — no real customer data to back claims */

export default function EnterprisePage() {
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadCaptureTrigger, setLeadCaptureTrigger] = useState("");

  // Track enterprise page view & set document title
  useEffect(() => {
    analytics.ctaClick('navigation', 'enterprise_page_view');
    document.title = "Enterprise AI Governance | Vienna OS";
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Enterprise AI governance at scale. Unlimited agents, on-premise deployment, compliance-ready architecture, dedicated support. Built for Fortune 500 and regulated industries.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Enterprise AI governance at scale. Unlimited agents, on-premise deployment, compliance-ready architecture, dedicated support. Built for Fortune 500 and regulated industries.';
      document.head.appendChild(meta);
    }
  }, []);

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

      {/* Sticky Header Container */}
      <div className="sticky top-0 z-50">
        <SiteNav />
      </div>

      <main className="flex-1 relative z-10">
      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={showLeadCapture}
        onClose={() => setShowLeadCapture(false)}
        trigger={leadCaptureTrigger}
        plan="Enterprise"
      />
      {/* Floating Contact Widget */}
      <FloatingContact />
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": "https://regulator.ai/enterprise#product",
            "name": "Vienna OS Enterprise - AI Governance Platform",
            "description": "Enterprise AI governance at scale. Unlimited agents, on-premise deployment, compliance-ready architecture, dedicated support. Built for Fortune 500 and regulated industries.",
            "brand": {
              "@type": "Brand",
              "name": "Vienna OS"
            },
            "category": "Enterprise AI Governance Software",
            "offers": {
              "@type": "Offer",
              "@id": "https://regulator.ai/enterprise#offer",
              "name": "Enterprise Plan",
              "description": "Unlimited governance. On-premise, SOC 2, dedicated support. Built for regulated industries.",
              "priceSpecification": {
                "@type": "PriceSpecification",
                "priceCurrency": "USD",
                "price": "Contact for pricing"
              },
              "availability": "https://schema.org/InStock",
              "url": "https://regulator.ai/contact?subject=enterprise"
            },
            "audience": {
              "@type": "Audience",
              "audienceType": "Enterprise",
              "name": "Enterprise, Regulated Industries"
            }
          })
        }}
      />

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 mb-8">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-purple-300 font-semibold uppercase tracking-wider">Enterprise</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                <span className="text-transparent bg-clip-text bg-black from-white via-purple-200 to-blue-200">
                  Enterprise AI Governance
                </span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 leading-relaxed max-w-3xl mx-auto">
                Govern AI at scale with verifiable Merkle warrant chains, policy simulation,
                cross-agent delegation, compliance reports, and trust scoring. Built for regulated industries.
              </p>
              
              <div className="flex items-center justify-center gap-4">
                <a 
                  href="/contact?subject=enterprise"
                  onClick={() => analytics.ctaClick('hero', 'schedule_demo')}
                  className="bg-black from-amber-600 to-purple-500 hover:from-amber-500 hover:to-purple-400 text-white font-semibold px-8 py-4 rounded-xl transition shadow-xl hover:shadow-purple-500/30 flex items-center gap-2"
                >
                  Schedule a Demo
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a 
                  href="/pricing"
                  className="bg-slate-800/50 hover:bg-slate-700/50 text-white font-medium px-8 py-4 rounded-xl transition border border-slate-600 hover:border-slate-500"
                >
                  Compare Plans
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Trust Logos Section */}
      <ScrollReveal delay={0.2}>
        <div className="border-t border-navy-700/50 py-16">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="text-slate-400 text-sm mb-8 uppercase tracking-wider font-medium">
              Built for Fortune 500 &amp; Regulated Industries
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              {trustLogos.map((logo, i) => (
                <div key={i} className="bg-navy-800/30 border border-navy-700/50 rounded-lg p-4 h-20 flex flex-col items-center justify-center">
                  <div className="text-slate-300 font-medium text-sm">{logo.name}</div>
                  <div className="text-slate-500 text-xs">{logo.industry}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Key Capabilities */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Enterprise-Grade Capabilities
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Everything your enterprise needs to govern autonomous AI systems at scale, 
              with the security and compliance that regulated industries require.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {enterpriseCapabilities.map((capability, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="bg-gradient-to-br from-navy-800/50 to-slate-900/50 border border-navy-700/50 rounded-xl p-6 hover:bg-gradient-to-br hover:from-navy-700/50 hover:to-slate-800/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-amber-500/30 flex items-center justify-center">
                    <capability.icon className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{capability.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{capability.description}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Enterprise vs Business
            </h2>
            <p className="text-lg text-slate-400">
              See what Enterprise adds to our Business tier
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="bg-gradient-to-br from-navy-800/50 to-slate-900/50 border border-navy-700/50 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 gap-0 text-center border-b border-navy-700/50">
              <div className="p-4 bg-navy-800/30">
                <h3 className="font-semibold text-slate-300">Feature</h3>
              </div>
              <div className="p-4 bg-navy-700/30">
                <h3 className="font-semibold text-amber-500">Business</h3>
              </div>
              <div className="p-4 bg-black from-amber-600/20 to-purple-500/20">
                <h3 className="font-semibold text-purple-300">Enterprise</h3>
              </div>
            </div>
            
            {comparisonData.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-0 border-b border-navy-700/30 last:border-b-0">
                <div className="p-4 text-slate-300 font-medium">{row.feature}</div>
                <div className="p-4 text-slate-400">{row.business}</div>
                <div className="p-4 text-purple-300 font-medium">{row.enterprise}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>

      {/* Security & Compliance */}
      <div className="border-t border-navy-700/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-6">
                Security &amp; Compliance
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Built for regulated industries with enterprise-grade security controls 
                and compliance certifications.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {complianceFeatures.map((feature, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 border border-emerald-500/30 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>

      {/* ROI Calculator Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <ScrollReveal>
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Calculate Your ROI
              </h2>
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                On average, enterprises save $2M annually in compliance costs by implementing 
                Vienna OS governance across their AI agent fleet.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mt-1">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Reduced Compliance Overhead</h3>
                    <p className="text-slate-400">Automated governance reduces manual compliance work by 60%</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mt-1">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Faster Agent Deployment</h3>
                    <p className="text-slate-400">Deploy new AI agents 4x faster with pre-approved governance policies</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mt-1">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Risk Mitigation</h3>
                    <p className="text-slate-400">Prevent costly incidents with real-time governance enforcement</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Why Enterprise?</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" /> Merkle warrant chain — third-party verifiable governance history</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" /> Policy simulation — predict the impact of changes before deploying</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" /> SOC 2 compliance reports with one-click export (CC6.1–CC8.1)</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" /> Cross-agent warrant delegation with cascading revocation</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" /> Dynamic agent trust scoring with governance recommendations</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" /> Open Warrant Standard — portable authorization across systems</li>
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Early Access CTA */}
      <ScrollReveal>
        <div className="border-t border-navy-700/50 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="bg-gradient-to-br from-amber-800/50 to-navy-800/50 border border-slate-700/50 rounded-2xl p-12">
              <Shield className="w-12 h-12 text-amber-500 mx-auto mb-6" />
              <h3 className="text-2xl text-slate-200 font-medium mb-6 leading-relaxed">
                Vienna OS is in early access for enterprise teams governing autonomous AI agents.
              </h3>
              <p className="text-slate-400 mb-8">
                Be among the first to deploy warrant-based governance at scale.
              </p>
              <a 
                href="/contact?subject=enterprise"
                className="inline-flex items-center gap-2 bg-black from-amber-600 to-purple-500 hover:from-amber-500 hover:to-purple-400 text-white font-semibold px-8 py-4 rounded-xl transition shadow-xl hover:shadow-purple-500/30"
              >
                Request Early Access
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Final CTA */}
      <ScrollReveal>
        <div className="border-t border-navy-700/50 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Scale AI Governance?
            </h2>
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              Built for Fortune 500 companies ready to govern their AI agents at scale. 
              Schedule a demo to see enterprise features in action.
            </p>
            
            <div className="flex items-center justify-center gap-6">
              <a 
                href="/contact?subject=enterprise"
                onClick={() => analytics.ctaClick('final_cta', 'schedule_demo')}
                className="bg-black from-amber-600 to-purple-500 hover:from-amber-500 hover:to-purple-400 text-white font-semibold px-8 py-4 rounded-xl transition shadow-xl hover:shadow-purple-500/30 text-lg"
              >
                Schedule a Demo
              </a>
              <a 
                href="/docs"
                onClick={() => analytics.ctaClick('final_cta', 'view_docs')}
                className="text-amber-500 hover:text-purple-300 font-medium transition text-lg flex items-center gap-2"
              >
                View Documentation
                <ArrowRight className="w-5 h-5" />
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