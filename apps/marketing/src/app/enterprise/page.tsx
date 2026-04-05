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
  Quote,
  ArrowRight,
  Calculator
} from "lucide-react";
import { analytics } from "@/lib/analytics";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import FloatingContact from "@/components/FloatingContact";

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
    title: "SOC 2 Type II",
    description: "Comprehensive security controls audit with continuous monitoring and reporting"
  },
  {
    icon: Shield,
    title: "HIPAA BAA",
    description: "Business Associate Agreement available for healthcare and regulated data governance"
  },
  {
    icon: Scale,
    title: "Custom SLA (99.9%+)",
    description: "Guaranteed uptime with custom service level agreements tailored to your requirements"
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated CSM",
    description: "Dedicated Customer Success Manager for onboarding, training, and ongoing support"
  },
  {
    icon: Database,
    title: "Unlimited Data Retention",
    description: "Keep audit trails and governance data for as long as your compliance requires"
  },
  {
    icon: Settings,
    title: "Professional Services",
    description: "Custom integration, policy development, and deployment assistance from our experts"
  },
  {
    icon: Eye,
    title: "Custom Policy Builder",
    description: "Advanced policy creation tools with custom risk models and approval workflows"
  },
  {
    icon: TrendingUp,
    title: "Anomaly Detection",
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
    description: "Federal cloud security compliance pathway for government deployments"
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
    business: "❌",
    enterprise: "✅ Included"
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

function ROICalculator() {
  const [agents, setAgents] = useState(50);
  const [complianceCosts, setComplianceCosts] = useState(500000);
  
  const annualSavings = Math.min(agents * 1000 + complianceCosts * 0.4, 5000000);
  const viennaOSCost = Math.max(agents * 1200, 50000); // Rough enterprise pricing
  const netSavings = annualSavings - viennaOSCost;
  const roi = Math.round(((netSavings / viennaOSCost) * 100));

  return (
    <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-4">ROI Calculator</h3>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-slate-300 mb-2">Number of AI agents</label>
          <input
            type="range"
            min="10"
            max="500"
            value={agents}
            onChange={(e) => setAgents(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-purple-400 mt-1">{agents} agents</div>
        </div>
        
        <div>
          <label className="block text-sm text-slate-300 mb-2">Current annual compliance costs</label>
          <input
            type="range"
            min="100000"
            max="2000000"
            step="50000"
            value={complianceCosts}
            onChange={(e) => setComplianceCosts(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-purple-400 mt-1">${complianceCosts.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1">
            ${netSavings.toLocaleString()}
          </div>
          <div className="text-sm text-purple-300 mb-2">Annual net savings</div>
          <div className="text-lg font-semibold text-green-400">
            {roi}% ROI
          </div>
        </div>
      </div>
    </div>
  );
}

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
      metaDescription.setAttribute('content', 'Enterprise AI governance at scale. Unlimited agents, on-premise deployment, SOC 2 Type II, HIPAA BAA, custom SLA, dedicated support for Fortune 500 companies.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Enterprise AI governance at scale. Unlimited agents, on-premise deployment, SOC 2 Type II, HIPAA BAA, custom SLA, dedicated support for Fortune 500 companies.';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/20 to-slate-950 text-white">
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
            "description": "Enterprise AI governance at scale. Unlimited agents, on-premise deployment, SOC 2 Type II, HIPAA BAA, custom SLA, dedicated support.",
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
              "name": "Fortune 500, Regulated Industries"
            }
          })
        }}
      />

      {/* Navigation */}
      <nav className="border-b border-navy-700/50 backdrop-blur-xl bg-slate-950/90">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-7 h-7 text-violet-400" />
            <span className="font-bold text-white">Vienna<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">OS</span></span>
          </a>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-sm text-slate-400 hover:text-white transition">Docs</a>
            <a href="/pricing" className="text-sm text-slate-400 hover:text-white transition">Pricing</a>
            <a 
              href="/contact?subject=enterprise" 
              className="text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition font-medium"
            >
              Schedule Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Urgent Enterprise Contact Banner */}
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border-b border-red-500/30">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center">
          <p className="text-sm text-red-300 mb-2">
            🚨 <strong>Enterprise Demo Request?</strong> We're online now and can demo Vienna OS within the hour.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => {
                setLeadCaptureTrigger('enterprise_urgent_banner');
                setShowLeadCapture(true);
              }}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-2 rounded-lg transition shadow-lg hover:shadow-red-500/25"
            >
              Schedule Demo Now →
            </button>
            <a
              href="mailto:admin@ai.ventures?subject=Enterprise%20Demo%20Request"
              className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded-lg transition"
            >
              Email Us Directly
            </a>
          </div>
          <p className="text-xs text-red-400 mt-2">
            Available 24/7 • Response within 4 hours • Dedicated CSM assigned
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16">
          <ScrollReveal>
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-500/30 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300 font-semibold uppercase tracking-wider">Enterprise</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-blue-200">
                  Enterprise AI Governance
                </span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 leading-relaxed max-w-3xl mx-auto">
                Govern AI at scale in regulated industries. Unlimited agents, on-premise deployment, 
                SOC 2 compliance, and dedicated support for Fortune 500 enterprises.
              </p>
              
              <div className="flex items-center justify-center gap-4">
                <a 
                  href="/contact?subject=enterprise"
                  onClick={() => analytics.ctaClick('hero', 'schedule_demo')}
                  className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold px-8 py-4 rounded-xl transition shadow-xl hover:shadow-purple-500/30 flex items-center gap-2"
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
              Trusted by Fortune 500 &amp; Regulated Industries
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
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <capability.icon className="w-6 h-6 text-purple-400" />
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
                <h3 className="font-semibold text-blue-400">Business</h3>
              </div>
              <div className="p-4 bg-gradient-to-r from-purple-600/20 to-purple-500/20">
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
            <ROICalculator />
          </ScrollReveal>
        </div>
      </div>

      {/* Customer Quote */}
      <ScrollReveal>
        <div className="border-t border-navy-700/50 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="bg-gradient-to-br from-slate-800/50 to-navy-800/50 border border-slate-700/50 rounded-2xl p-12">
              <Quote className="w-12 h-12 text-purple-400 mx-auto mb-6" />
              <blockquote className="text-2xl text-slate-200 font-medium mb-6 italic leading-relaxed">
                "Vienna OS transformed how we govern our 200+ AI agents. The compliance reporting 
                alone saves us months of work during audits, and the real-time governance gives 
                our executives confidence in our AI deployment."
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
                <div className="text-left">
                  <div className="font-semibold text-white">Sarah Chen</div>
                  <div className="text-slate-400 text-sm">Chief AI Officer, Fortune 100 Financial Services</div>
                </div>
              </div>
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
              Join Fortune 500 companies already governing their AI agents with Vienna OS. 
              Schedule a demo to see enterprise features in action.
            </p>
            
            <div className="flex items-center justify-center gap-6">
              <a 
                href="/contact?subject=enterprise"
                onClick={() => analytics.ctaClick('final_cta', 'schedule_demo')}
                className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold px-8 py-4 rounded-xl transition shadow-xl hover:shadow-purple-500/30 text-lg"
              >
                Schedule a Demo
              </a>
              <a 
                href="/docs"
                onClick={() => analytics.ctaClick('final_cta', 'view_docs')}
                className="text-purple-400 hover:text-purple-300 font-medium transition text-lg flex items-center gap-2"
              >
                View Documentation
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </main>
  );
}