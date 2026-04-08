"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Shield, 
  Check, 
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
    title: "UNLIMITED_AGENTS",
    description: "Scale governance across your entire autonomous AI fleet without agent-based restrictions"
  },
  {
    icon: Building2,
    title: "ON_PREMISE_VPC_DEPLOYMENT",
    description: "Deploy Vienna OS in your own infrastructure for maximum security and control"
  },
  {
    icon: Award,
    title: "SOC_2_TYPE_II",
    description: "Comprehensive security controls audit with continuous monitoring and reporting (roadmap)"
  },
  {
    icon: Shield,
    title: "HIPAA_BAA",
    description: "Business Associate Agreement available for healthcare and regulated data governance (roadmap)"
  },
  {
    icon: Scale,
    title: "CUSTOM_SLA",
    description: "Guaranteed uptime with custom service level agreements tailored to your requirements (coming soon)"
  },
  {
    icon: HeadphonesIcon,
    title: "DEDICATED_CSM",
    description: "Dedicated Customer Success Manager for onboarding, training, and ongoing support (coming soon)"
  },
  {
    icon: Database,
    title: "UNLIMITED_DATA_RETENTION",
    description: "Keep audit trails and governance data for as long as your compliance requires"
  },
  {
    icon: Settings,
    title: "PROFESSIONAL_SERVICES",
    description: "Custom integration, policy development, and deployment assistance from our experts (coming soon)"
  },
  {
    icon: Eye,
    title: "CUSTOM_POLICY_BUILDER",
    description: "Advanced policy creation tools with custom risk models and approval workflows"
  },
  {
    icon: TrendingUp,
    title: "ANOMALY_DETECTION",
    description: "AI-powered detection of unusual agent behavior patterns and governance violations (coming soon)"
  }
];

const complianceFeatures = [
  {
    icon: Award,
    title: "SOC_2_TYPE_II",
    description: "Comprehensive security controls with annual third-party audits"
  },
  {
    icon: Shield,
    title: "HIPAA_READY",
    description: "Healthcare data governance with Business Associate Agreements"
  },
  {
    icon: Scale,
    title: "ISO_27001_READY",
    description: "Information security management system aligned with international standards"
  },
  {
    icon: Building2,
    title: "FEDRAMP_PATHWAY",
    description: "Federal cloud security compliance pathway for government deployments (roadmap)"
  }
];

const comparisonData = [
  {
    feature: "AGENTS",
    business: "Up to 100",
    enterprise: "Unlimited"
  },
  {
    feature: "DEPLOYMENT",
    business: "Cloud only",
    enterprise: "On-premise, VPC, Hybrid"
  },
  {
    feature: "DATA_RETENTION",
    business: "30 days",
    enterprise: "Unlimited"
  },
  {
    feature: "SUPPORT",
    business: "Priority support",
    enterprise: "Dedicated CSM + 24/7"
  },
  {
    feature: "COMPLIANCE",
    business: "Basic reporting",
    enterprise: "SOC 2, HIPAA, ISO 27001"
  },
  {
    feature: "SLA",
    business: "99.5%",
    enterprise: "99.9%+ (Custom)"
  },
  {
    feature: "POLICY_ENGINE",
    business: "Templates + custom",
    enterprise: "Advanced builder + AI suggestions"
  },
  {
    feature: "PROFESSIONAL_SERVICES",
    business: "—",
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
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      <SiteNav />
      
      <main className="font-mono flex-1">
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
        <div className="border-b border-amber-500/10">
          <div className="max-w-7xl mx-auto px-6 pt-20 pb-16">
            <ScrollReveal>
              <div className="text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-black border border-amber-500/30 px-4 py-2 mb-6">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-500 font-mono font-bold uppercase tracking-wider">ENTERPRISE</span>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-mono font-bold mb-6 text-amber-500">
                  ENTERPRISE_AI_GOVERNANCE
                </h1>
                
                <p className="text-xl text-gray-400 mb-8 leading-relaxed max-w-3xl mx-auto font-mono">
                  Govern AI at scale with verifiable Merkle warrant chains, policy simulation,
                  cross-agent delegation, compliance reports, and trust scoring. Built for regulated industries.
                </p>
                
                <div className="flex items-center justify-center gap-4">
                  <a 
                    href="/contact?subject=enterprise"
                    onClick={() => analytics.ctaClick('hero', 'schedule_demo')}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase px-8 py-4 transition flex items-center gap-2"
                  >
                    SCHEDULE_DEMO
                    <ArrowRight className="w-5 h-5" />
                  </a>
                  <a 
                    href="/pricing"
                    className="bg-black border border-amber-500/30 hover:border-amber-500/50 text-amber-500 font-mono font-bold uppercase px-8 py-4 transition"
                  >
                    COMPARE_PLANS
                  </a>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* Trust Logos Section */}
        <ScrollReveal delay={0.2}>
          <div className="border-b border-amber-500/10 py-16">
            <div className="max-w-6xl mx-auto px-6 text-center">
              <p className="text-gray-600 text-sm mb-8 uppercase tracking-wider font-mono font-bold">
                BUILT_FOR_FORTUNE_500_AND_REGULATED_INDUSTRIES
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                {trustLogos.map((logo, i) => (
                  <div key={i} className="bg-black/50 border border-amber-500/10 p-4 h-20 flex flex-col items-center justify-center">
                    <div className="text-gray-400 font-mono text-sm">{logo.name}</div>
                    <div className="text-gray-600 font-mono text-xs">{logo.industry}</div>
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
              <h2 className="text-4xl font-mono font-bold text-amber-500 mb-6">
                ENTERPRISE_GRADE_CAPABILITIES
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto font-mono">
                Everything your enterprise needs to govern autonomous AI systems at scale, 
                with the security and compliance that regulated industries require.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {enterpriseCapabilities.map((capability, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="bg-black/50 border border-amber-500/30 p-6 hover:border-amber-500/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <capability.icon className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-mono font-bold text-amber-500 mb-2">{capability.title}</h3>
                      <p className="text-gray-400 font-mono leading-relaxed text-sm">{capability.description}</p>
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
              <h2 className="text-4xl font-mono font-bold text-amber-500 mb-4">
                ENTERPRISE_VS_BUSINESS
              </h2>
              <p className="text-lg text-gray-400 font-mono">
                See what Enterprise adds to our Business tier
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="bg-black/50 border border-amber-500/30 overflow-hidden">
              <div className="grid grid-cols-3 gap-0 text-center border-b border-amber-500/30">
                <div className="p-4 bg-black/50">
                  <h3 className="font-mono font-bold text-gray-400 uppercase">FEATURE</h3>
                </div>
                <div className="p-4 bg-black/50">
                  <h3 className="font-mono font-bold text-gray-400 uppercase">BUSINESS</h3>
                </div>
                <div className="p-4 bg-amber-500/10">
                  <h3 className="font-mono font-bold text-amber-500 uppercase">ENTERPRISE</h3>
                </div>
              </div>
              
              {comparisonData.map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-0 border-b border-amber-500/10 last:border-b-0">
                  <div className="p-4 text-gray-400 font-mono font-bold">{row.feature}</div>
                  <div className="p-4 text-gray-500 font-mono">{row.business}</div>
                  <div className="p-4 text-amber-500 font-mono font-bold">{row.enterprise}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* Security & Compliance */}
        <div className="border-t border-amber-500/10 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <ScrollReveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl font-mono font-bold text-amber-500 mb-6">
                  SECURITY_AND_COMPLIANCE
                </h2>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto font-mono">
                  Built for regulated industries with enterprise-grade security controls 
                  and compliance certifications.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {complianceFeatures.map((feature, i) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <div className="bg-black/50 border border-amber-500/30 p-6 text-center">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-mono font-bold text-amber-500 mb-2">{feature.title}</h3>
                    <p className="text-gray-400 font-mono text-sm">{feature.description}</p>
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
                <h2 className="text-4xl font-mono font-bold text-amber-500 mb-6">
                  CALCULATE_YOUR_ROI
                </h2>
                <p className="text-xl text-gray-400 mb-8 leading-relaxed font-mono">
                  On average, enterprises save $2M annually in compliance costs by implementing 
                  Vienna OS governance across their AI agent fleet.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-500/20 border border-green-500/30 flex items-center justify-center mt-1">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-mono font-bold text-amber-500 mb-2">REDUCED_COMPLIANCE_OVERHEAD</h3>
                      <p className="text-gray-400 font-mono text-sm">Automated governance reduces manual compliance work by 60%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-500/20 border border-green-500/30 flex items-center justify-center mt-1">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-mono font-bold text-amber-500 mb-2">FASTER_AGENT_DEPLOYMENT</h3>
                      <p className="text-gray-400 font-mono text-sm">Deploy new AI agents 4x faster with pre-approved governance policies</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-500/20 border border-green-500/30 flex items-center justify-center mt-1">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-mono font-bold text-amber-500 mb-2">RISK_MITIGATION</h3>
                      <p className="text-gray-400 font-mono text-sm">Prevent costly incidents with real-time governance enforcement</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="bg-black/50 border border-amber-500/30 p-6">
                <h3 className="text-xl font-mono font-bold text-amber-500 mb-4">WHY_ENTERPRISE?</h3>
                <ul className="space-y-3 text-gray-400 font-mono text-sm">
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
          <div className="border-t border-amber-500/10 py-20">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <div className="bg-black/50 border border-amber-500/30 p-12">
                <Shield className="w-12 h-12 text-amber-500 mx-auto mb-6" />
                <h3 className="text-2xl text-gray-400 font-mono font-bold mb-6 leading-relaxed">
                  VIENNA_OS_IS_IN_EARLY_ACCESS_FOR_ENTERPRISE_TEAMS_GOVERNING_AUTONOMOUS_AI_AGENTS
                </h3>
                <p className="text-gray-500 font-mono mb-8">
                  Be among the first to deploy warrant-based governance at scale.
                </p>
                <a 
                  href="/contact?subject=enterprise"
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase px-8 py-4 transition"
                >
                  REQUEST_EARLY_ACCESS
                  <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Final CTA */}
        <ScrollReveal>
          <div className="border-t border-amber-500/10 py-20">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h2 className="text-4xl font-mono font-bold text-amber-500 mb-6">
                READY_TO_SCALE_AI_GOVERNANCE?
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto font-mono">
                Built for Fortune 500 companies ready to govern their AI agents at scale. 
                Schedule a demo to see enterprise features in action.
              </p>
              
              <div className="flex items-center justify-center gap-6">
                <a 
                  href="/contact?subject=enterprise"
                  onClick={() => analytics.ctaClick('final_cta', 'schedule_demo')}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase px-8 py-4 transition text-lg"
                >
                  SCHEDULE_DEMO
                </a>
                <a 
                  href="/docs"
                  onClick={() => analytics.ctaClick('final_cta', 'view_docs')}
                  className="text-amber-500 hover:text-amber-400 font-mono font-bold uppercase transition text-lg flex items-center gap-2"
                >
                  VIEW_DOCUMENTATION
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
