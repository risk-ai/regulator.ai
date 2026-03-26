"use client";

import { useState } from "react";
import { Shield, ArrowLeft, Building2, TrendingUp, Clock, Users, CheckCircle, AlertTriangle, FileText, ArrowRight } from "lucide-react";

interface CaseStudy {
  id: string;
  industry: string;
  company: string;
  logo: string;
  title: string;
  subtitle: string;
  challenge: string;
  solution: string;
  implementation: string[];
  results: {
    metric: string;
    before: string;
    after: string;
    improvement: string;
  }[];
  testimonial: {
    quote: string;
    author: string;
    role: string;
  };
  technicalDetails: {
    tier: string;
    policies: string[];
    integrations: string[];
    timeline: string;
  };
  icon: string;
  color: string;
  featured?: boolean;
}

const caseStudies: CaseStudy[] = [
  {
    id: "global-investment-bank",
    industry: "Financial Services",
    company: "Global Investment Bank",
    logo: "GIB",
    title: "Governing $2.3B in Daily AI Trading",
    subtitle: "Multi-party approval for high-frequency trading algorithms",
    challenge: "A tier-1 investment bank needed to comply with post-2008 banking regulations while deploying AI trading algorithms. Every trade above $100K required human oversight, but manual approval processes were too slow for competitive algorithmic trading.",
    solution: "Vienna OS implemented a tiered approval system: T0 for trades under $10K (auto-approved), T1 for $10K-$100K (single approval), and T2 for $100K+ (dual approval). Custom policies integrated with existing risk management systems.",
    implementation: [
      "Integrated Vienna OS Intent Gateway with existing trading infrastructure",
      "Configured risk-based policy engine with SEC compliance rules",
      "Set up dual-approval workflow for T2 transactions",
      "Implemented real-time audit logging for regulatory reporting",
      "Created custom warrant scoping for trade-specific constraints"
    ],
    results: [
      {
        metric: "Daily Trade Volume",
        before: "$1.8B",
        after: "$2.3B",
        improvement: "+28%"
      },
      {
        metric: "Approval Latency", 
        before: "45 minutes",
        after: "90 seconds",
        improvement: "-97%"
      },
      {
        metric: "Compliance Rate",
        before: "94%",
        after: "100%",
        improvement: "+6%"
      },
      {
        metric: "Audit Time",
        before: "2-3 days",
        after: "< 1 hour",
        improvement: "-95%"
      }
    ],
    testimonial: {
      quote: "Vienna OS transformed our trading operations. We can now deploy AI algorithms confidently, knowing every trade is governed and auditable. The regulators love the transparency.",
      author: "Sarah Chen",
      role: "Head of Algorithmic Trading Risk"
    },
    technicalDetails: {
      tier: "T0-T2 Multi-tier",
      policies: ["SEC Rule 15c3-5", "Volcker Rule", "MiFID II", "Position Limits", "Market Risk"],
      integrations: ["Bloomberg Terminal", "FIX Protocol", "Risk Management Platform", "Trade Surveillance"],
      timeline: "6 weeks implementation + 2 weeks testing"
    },
    icon: "🏦",
    color: "blue",
    featured: true
  },
  {
    id: "healthcare-system",
    industry: "Healthcare",
    company: "Regional Health Network",
    logo: "RHN",
    title: "HIPAA-Compliant AI Patient Care",
    subtitle: "500K+ patient records processed monthly with zero breaches",
    challenge: "A 12-hospital network wanted to deploy AI for patient record updates, insurance processing, and clinical decision support. HIPAA compliance required strict PHI access controls and complete audit trails for 7 years.",
    solution: "Vienna OS created HIPAA-scoped warrants with PHI constraints, role-based access policies, and automated audit retention. Every AI action touching patient data required explicit authorization and scope validation.",
    implementation: [
      "Deployed on-premises Vienna OS for PHI data isolation",
      "Configured HIPAA-compliant policy templates",
      "Set up role-based approval workflows (physician, nurse, admin)",
      "Implemented PHI-scoped warrant constraints",
      "Created 7-year immutable audit retention system"
    ],
    results: [
      {
        metric: "Patient Records Processed",
        before: "200K/month",
        after: "500K/month",
        improvement: "+150%"
      },
      {
        metric: "HIPAA Violations",
        before: "2-3/year",
        after: "0/year",
        improvement: "100%"
      },
      {
        metric: "Claims Processing Time",
        before: "5.2 days",
        after: "1.1 days",
        improvement: "-79%"
      },
      {
        metric: "Audit Preparation",
        before: "3 weeks",
        after: "2 hours",
        improvement: "-99%"
      }
    ],
    testimonial: {
      quote: "Vienna OS gave us the confidence to deploy AI across our entire patient care workflow. The HIPAA compliance is bulletproof, and our efficiency gains have been remarkable.",
      author: "Dr. Michael Rodriguez",
      role: "Chief Information Officer"
    },
    technicalDetails: {
      tier: "T1 HIPAA-scoped",
      policies: ["HIPAA Privacy Rule", "HIPAA Security Rule", "HITECH Act", "Minimum Necessary", "Patient Consent"],
      integrations: ["Epic EHR", "Cerner", "HL7 FHIR", "Medical Imaging Systems", "Insurance APIs"],
      timeline: "8 weeks implementation + 4 weeks HIPAA audit"
    },
    icon: "🏥",
    color: "green"
  },
  {
    id: "law-firm",
    industry: "Legal",
    company: "International Law Firm",
    logo: "ILF",
    title: "AI Paralegal with Attorney Oversight",
    subtitle: "1.2M documents reviewed monthly with bar association compliance",
    challenge: "A 500+ attorney firm needed AI assistance for document review, legal research, and client communications, but state bar associations required attorney supervision for all AI-generated work and external communications.",
    solution: "Vienna OS enforced attorney-in-the-loop workflows with T1 approval for research, T2 for client communications, and automatic denial for unauthorized external filings. All AI work required attorney review and sign-off.",
    implementation: [
      "Integrated with existing legal document management system",
      "Created bar association compliance policy templates",
      "Set up attorney approval workflows by practice area",
      "Implemented client privilege protection constraints",
      "Configured automatic external communication blocking"
    ],
    results: [
      {
        metric: "Documents Reviewed",
        before: "400K/month",
        after: "1.2M/month",
        improvement: "+200%"
      },
      {
        metric: "Attorney Review Time",
        before: "4.5 hours",
        after: "45 minutes",
        improvement: "-83%"
      },
      {
        metric: "Bar Compliance Rate",
        before: "97%",
        after: "100%",
        improvement: "+3%"
      },
      {
        metric: "Client Response Time",
        before: "2.3 days",
        after: "4.2 hours",
        improvement: "-92%"
      }
    ],
    testimonial: {
      quote: "Vienna OS solved the attorney supervision problem elegantly. Our AI paralegals are incredibly productive, but we never worry about bar compliance or unauthorized communications.",
      author: "Jennifer Walsh",
      role: "Managing Partner"
    },
    technicalDetails: {
      tier: "T1-T2 Attorney Supervised",
      policies: ["ABA Model Rules", "State Bar Requirements", "Client Confidentiality", "Attorney-Client Privilege", "Professional Liability"],
      integrations: ["iManage", "NetDocuments", "Westlaw", "LexisNexis", "Court Filing Systems"],
      timeline: "10 weeks implementation + 6 weeks bar association review"
    },
    icon: "⚖️",
    color: "purple"
  },
  {
    id: "streaming-platform",
    industry: "Technology",
    company: "Global Streaming Platform",
    logo: "GSP",
    title: "Zero-Trust Deployment Pipeline",
    subtitle: "800+ daily deployments with warrant-based security",
    challenge: "A major streaming platform needed to maintain rapid deployment velocity while ensuring security. Traditional approval processes were too slow, but unrestricted deployments posed significant security risks to the platform serving 200M+ users.",
    solution: "Vienna OS implemented environment-based risk tiers: T0 for staging, T1 for production, T2 for critical infrastructure. Cryptographic warrants ensured only authorized changes reached production, with automatic rollback capabilities.",
    implementation: [
      "Integrated Vienna OS with CI/CD pipeline (Jenkins, Kubernetes)",
      "Configured environment-based risk assessment policies",
      "Set up automatic warrant generation for deployments",
      "Implemented rollback constraints and canary deployment controls",
      "Created real-time deployment audit dashboard"
    ],
    results: [
      {
        metric: "Daily Deployments",
        before: "450/day",
        after: "800+/day",
        improvement: "+78%"
      },
      {
        metric: "Security Incidents",
        before: "2-3/month",
        after: "0/month",
        improvement: "100%"
      },
      {
        metric: "Rollback Speed",
        before: "25 minutes",
        after: "90 seconds",
        improvement: "-94%"
      },
      {
        metric: "Deployment Confidence",
        before: "73%",
        after: "96%",
        improvement: "+31%"
      }
    ],
    testimonial: {
      quote: "Vienna OS gave us both speed and security. We deploy faster than ever before, but with complete confidence that every change is governed and traceable.",
      author: "Alex Kumar",
      role: "VP of Engineering"
    },
    technicalDetails: {
      tier: "T0-T2 Environment-based",
      policies: ["Deployment Windows", "Canary Requirements", "Rollback Controls", "Security Scanning", "Load Testing"],
      integrations: ["Kubernetes", "Jenkins", "GitLab CI", "Datadog", "PagerDuty"],
      timeline: "4 weeks implementation + 2 weeks performance testing"
    },
    icon: "🚀",
    color: "orange",
    featured: true
  }
];

export default function CaseStudiesPage() {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "implementation" | "results" | "technical">("overview");

  const selectedCaseStudy = selectedCase ? caseStudies.find(c => c.id === selectedCase) : null;

  const colorClasses = {
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    green: "border-green-500/30 bg-green-500/5 text-green-400",
    purple: "border-purple-500/30 bg-purple-500/5 text-purple-400",
    orange: "border-orange-500/30 bg-orange-500/5 text-orange-400",
    red: "border-red-500/30 bg-red-500/5 text-red-400",
  };

  if (selectedCaseStudy) {
    return (
      <div className="min-h-screen bg-navy-950">
        {/* Navigation */}
        <nav className="border-b border-navy-700/50 backdrop-blur-sm bg-navy-950/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedCase(null)}
                className="flex items-center gap-2 text-warm-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Case Studies</span>
              </button>
              <div className="h-4 w-px bg-navy-700"></div>
              <Shield className="w-5 h-5 text-gold-400" />
              <span className="font-bold text-white">
                Vienna<span className="text-gold-400">OS</span>
              </span>
            </div>
            <a
              href="/signup"
              className="text-sm bg-gold-400/10 text-gold-400 hover:bg-gold-400/20 border border-gold-400/20 px-4 py-1.5 rounded-lg transition font-medium"
            >
              Get Started
            </a>
          </div>
        </nav>

        {/* Case Study Detail */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border ${colorClasses[selectedCaseStudy.color as keyof typeof colorClasses]}`}>
                {selectedCaseStudy.icon}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm text-warm-500">{selectedCaseStudy.industry}</span>
                  {selectedCaseStudy.featured && (
                    <span className="px-2 py-0.5 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-full text-xs font-medium">
                      Featured
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{selectedCaseStudy.title}</h1>
                <p className="text-warm-400">{selectedCaseStudy.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-navy-800/50 rounded-xl p-1 overflow-x-auto">
            {(["overview", "implementation", "results", "technical"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                  activeTab === tab
                    ? "bg-navy-700 text-white"
                    : "text-warm-500 hover:text-warm-300"
                }`}
              >
                {tab === "overview" && "📋 "}
                {tab === "implementation" && "⚙️ "}
                {tab === "results" && "📊 "}
                {tab === "technical" && "🔧 "}
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">The Challenge</h3>
                    <p className="text-warm-300 leading-relaxed">{selectedCaseStudy.challenge}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Vienna OS Solution</h3>
                    <p className="text-warm-300 leading-relaxed">{selectedCaseStudy.solution}</p>
                  </div>
                  <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                    <blockquote className="text-lg text-purple-400 italic mb-4">
                      "{selectedCaseStudy.testimonial.quote}"
                    </blockquote>
                    <cite className="text-sm text-warm-400 not-italic">
                      — {selectedCaseStudy.testimonial.author}, {selectedCaseStudy.testimonial.role}
                    </cite>
                  </div>
                </div>
              )}

              {activeTab === "implementation" && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Implementation Steps</h3>
                  <div className="space-y-3">
                    {selectedCaseStudy.implementation.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-warm-300">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "results" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Key Results</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {selectedCaseStudy.results.map((result, i) => (
                      <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-warm-400">{result.metric}</h4>
                          <span className={`text-sm font-bold ${
                            result.improvement.startsWith('+') ? 'text-emerald-400' : 
                            result.improvement.startsWith('-') ? 'text-emerald-400' :
                            'text-gold-400'
                          }`}>
                            {result.improvement}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-warm-600">Before</div>
                            <div className="font-mono text-warm-300">{result.before}</div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-warm-600" />
                          <div>
                            <div className="text-xs text-warm-600">After</div>
                            <div className="font-mono text-white font-semibold">{result.after}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "technical" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Technical Implementation</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-warm-400 mb-2">Risk Tier</h4>
                        <p className="font-mono text-white">{selectedCaseStudy.technicalDetails.tier}</p>
                      </div>
                      <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-warm-400 mb-2">Timeline</h4>
                        <p className="font-mono text-white">{selectedCaseStudy.technicalDetails.timeline}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-warm-400 mb-3">Compliance Policies</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCaseStudy.technicalDetails.policies.map((policy) => (
                        <span key={policy} className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-xs font-medium">
                          {policy}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-warm-400 mb-3">System Integrations</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCaseStudy.technicalDetails.integrations.map((integration) => (
                        <span key={integration} className="px-3 py-1 bg-navy-700 text-warm-300 border border-navy-600 rounded-lg text-xs font-medium">
                          {integration}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Company Info */}
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                <h4 className="text-sm font-medium text-warm-400 mb-3">Company Overview</h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-warm-600">Company</div>
                    <div className="text-white font-medium">{selectedCaseStudy.company}</div>
                  </div>
                  <div>
                    <div className="text-xs text-warm-600">Industry</div>
                    <div className="text-white font-medium">{selectedCaseStudy.industry}</div>
                  </div>
                  <div>
                    <div className="text-xs text-warm-600">Governance Tier</div>
                    <div className="text-white font-medium font-mono">{selectedCaseStudy.technicalDetails.tier}</div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-br from-purple-900/30 to-navy-800/50 border border-purple-500/20 rounded-xl p-5">
                <h4 className="text-white font-semibold mb-2">Ready to get started?</h4>
                <p className="text-warm-400 text-sm mb-4">
                  Implement Vienna OS governance in your organization.
                </p>
                <div className="space-y-2">
                  <a 
                    href="/signup" 
                    className="block w-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition text-center"
                  >
                    Start Free Trial
                  </a>
                  <a 
                    href="/contact" 
                    className="block w-full text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:bg-gold-400/5 text-sm font-medium px-4 py-2 rounded-lg transition text-center"
                  >
                    Schedule Demo
                  </a>
                </div>
              </div>

              {/* Other Cases */}
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                <h4 className="text-sm font-medium text-warm-400 mb-3">Other Case Studies</h4>
                <div className="space-y-2">
                  {caseStudies.filter(c => c.id !== selectedCase).slice(0, 3).map((otherCase) => (
                    <button
                      key={otherCase.id}
                      onClick={() => {
                        setSelectedCase(otherCase.id);
                        setActiveTab("overview");
                      }}
                      className="w-full text-left p-3 rounded-lg bg-navy-900/50 hover:bg-navy-700/50 transition"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{otherCase.icon}</span>
                        <span className="text-sm text-white font-medium">{otherCase.industry}</span>
                      </div>
                      <p className="text-xs text-warm-500">{otherCase.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Navigation */}
      <nav className="border-b border-navy-700/50 backdrop-blur-sm bg-navy-950/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-warm-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-5 h-5 text-gold-400" />
            <span className="font-bold text-white">
              Vienna<span className="text-gold-400">OS</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-warm-500 font-mono">Enterprise Case Studies</span>
            <a
              href="/signup"
              className="text-sm bg-gold-400/10 text-gold-400 hover:bg-gold-400/20 border border-gold-400/20 px-4 py-1.5 rounded-lg transition font-medium"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="w-6 h-6 text-gold-400" />
            <span className="text-sm text-gold-400 font-medium uppercase tracking-wider">Enterprise Case Studies</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Real Vienna OS Implementations
          </h1>
          <p className="text-warm-400 text-lg max-w-3xl mx-auto">
            See how leading organizations across regulated industries are using Vienna OS 
            to govern AI agents while maintaining compliance and accelerating innovation.
          </p>
        </div>

        {/* Featured Cases */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold-400" />
            Featured Case Studies
          </h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {caseStudies.filter(c => c.featured).map((caseStudy) => (
              <button
                key={caseStudy.id}
                onClick={() => setSelectedCase(caseStudy.id)}
                className="text-left bg-navy-800 border border-navy-700 hover:border-gold-400/30 rounded-2xl p-6 transition-all duration-300 hover:bg-navy-800/80 group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${colorClasses[caseStudy.color as keyof typeof colorClasses]} group-hover:scale-105 transition-transform`}>
                    {caseStudy.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-warm-500">{caseStudy.industry}</span>
                      <span className="px-2 py-0.5 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-full text-xs font-medium">
                        Featured
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-gold-400 transition-colors">
                      {caseStudy.title}
                    </h3>
                    <p className="text-sm text-warm-400">{caseStudy.subtitle}</p>
                  </div>
                </div>
                
                <p className="text-sm text-warm-300 leading-relaxed mb-4 line-clamp-3">
                  {caseStudy.challenge}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-warm-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{caseStudy.technicalDetails.timeline}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{caseStudy.technicalDetails.tier}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gold-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All Case Studies */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gold-400" />
            All Case Studies
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {caseStudies.map((caseStudy) => (
              <button
                key={caseStudy.id}
                onClick={() => setSelectedCase(caseStudy.id)}
                className="text-left bg-navy-800 border border-navy-700 hover:border-navy-600 rounded-xl p-5 transition-all hover:bg-navy-700/50 group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorClasses[caseStudy.color as keyof typeof colorClasses]}`}>
                    {caseStudy.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-warm-500 mb-0.5">{caseStudy.industry}</div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-gold-400 transition-colors truncate">
                      {caseStudy.company}
                    </h3>
                  </div>
                  {caseStudy.featured && (
                    <div className="w-2 h-2 rounded-full bg-gold-400"></div>
                  )}
                </div>
                <p className="text-sm text-warm-300 mb-3 line-clamp-2">
                  {caseStudy.title}
                </p>
                <div className="flex items-center justify-between text-xs text-warm-600">
                  <span className="font-mono">{caseStudy.technicalDetails.tier}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-br from-purple-900/30 to-navy-800/50 border border-purple-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to Join These Leaders?</h2>
          <p className="text-warm-400 mb-6 max-w-2xl mx-auto">
            Vienna OS is helping organizations across regulated industries deploy AI agents 
            responsibly. Start your governance journey today.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a 
              href="/signup" 
              className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-semibold"
            >
              Start Free Trial
            </a>
            <a 
              href="/contact" 
              className="text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:bg-gold-400/5 px-8 py-3 rounded-xl transition font-medium"
            >
              Schedule Demo
            </a>
            <a 
              href="/try" 
              className="text-warm-400 hover:text-white transition font-medium"
            >
              Try Interactive Demo →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}