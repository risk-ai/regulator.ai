"use client";

import { useState } from "react";
import { Shield, ArrowLeft, Building2, TrendingUp, Clock, Users, CheckCircle, AlertTriangle, FileText, ArrowRight, Layers, Settings, Eye } from "lucide-react";

interface UseCaseScenario {
  id: string;
  industry: string;
  title: string;
  subtitle: string;
  challenge: string;
  solution: string;
  implementation: string[];
  outcomes: {
    metric: string;
    description: string;
    capability: string;
  }[];
  workflow: {
    step: string;
    description: string;
    tier?: string;
  }[];
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

const useCaseScenarios: UseCaseScenario[] = [
  {
    id: "financial-trading",
    industry: "Financial Services",
    title: "AI Trading Agent Governance",
    subtitle: "Multi-tier approval system for algorithmic trading operations",
    challenge: "Financial institutions need to deploy AI trading agents while maintaining regulatory compliance. Post-2008 regulations require human oversight for significant trades, but manual approval processes are too slow for competitive algorithmic trading markets.",
    solution: "Vienna OS implements risk-based tiering: T0 for small trades (auto-approved), T1 for mid-size trades (single approval), and T3 for large trades (multi-party approval). Custom policies integrate with existing risk management systems and provide real-time compliance monitoring.",
    implementation: [
      "Deploy Vienna OS Intent Gateway integrated with trading infrastructure",
      "Configure risk-based policy engine with regulatory compliance rules",
      "Set up multi-tier approval workflows based on trade size and risk",
      "Implement real-time audit logging for regulatory reporting",
      "Create warrant scoping for trade-specific constraints and limits"
    ],
    outcomes: [
      {
        metric: "Trade Volume Capacity",
        description: "Designed to handle billions in daily trading volume",
        capability: "Scalable governance for high-frequency operations"
      },
      {
        metric: "Approval Speed", 
        description: "Sub-minute approvals for qualifying trades",
        capability: "Real-time decision making with human oversight"
      },
      {
        metric: "Compliance Framework",
        description: "Built-in SEC, FINRA, and Volcker Rule compliance",
        capability: "Automated regulatory adherence"
      },
      {
        metric: "Audit Trail",
        description: "Immutable record of every trading decision",
        capability: "Complete regulatory transparency"
      }
    ],
    workflow: [
      { step: "Trading Intent", description: "AI agent submits trade proposal with parameters", tier: "Gateway" },
      { step: "Risk Assessment", description: "Policy engine evaluates trade size, market conditions, and risk factors" },
      { step: "Tier Classification", description: "Trade assigned T0 (auto), T1 (single approval), or T3 (multi-party)", tier: "Policy" },
      { step: "Approval Process", description: "Routed to appropriate approval workflow based on tier" },
      { step: "Warrant Issuance", description: "Cryptographic warrant issued with trade constraints", tier: "Warrant" },
      { step: "Execution", description: "Trade executed within warrant parameters" },
      { step: "Verification", description: "Post-trade verification ensures compliance with warrant" }
    ],
    technicalDetails: {
      tier: "T0-T3 Risk-Based Tiering",
      policies: ["SEC Rule 15c3-5", "Volcker Rule", "MiFID II", "Position Limits", "Market Risk Controls"],
      integrations: ["FIX Protocol", "Bloomberg Terminal", "Risk Management Systems", "Trade Surveillance"],
      timeline: "6-8 weeks implementation + regulatory review"
    },
    icon: "",
    color: "blue",
    featured: true
  },
  {
    id: "healthcare-records",
    industry: "Healthcare",
    title: "HIPAA-Compliant Patient Care AI",
    subtitle: "Secure AI agent operations for patient record management",
    challenge: "Healthcare networks want to deploy AI for patient record updates, insurance processing, and clinical decision support. HIPAA compliance requires strict PHI access controls and complete audit trails maintained for 7 years, while enabling efficient patient care operations.",
    solution: "Vienna OS creates HIPAA-scoped warrants with PHI constraints, role-based access policies, and automated audit retention. Every AI action touching patient data requires explicit authorization with scope validation to ensure minimum necessary access principles.",
    implementation: [
      "Deploy on-premises Vienna OS for PHI data isolation and security",
      "Configure HIPAA-compliant policy templates and access controls",
      "Set up role-based approval workflows (physician, nurse, administrator)",
      "Implement PHI-scoped warrant constraints for data access",
      "Create 7-year immutable audit retention system for compliance"
    ],
    outcomes: [
      {
        metric: "Patient Data Processing",
        description: "Designed to handle hundreds of thousands of patient records",
        capability: "Scalable HIPAA-compliant data operations"
      },
      {
        metric: "Privacy Protection",
        description: "Zero-breach architecture with PHI access controls",
        capability: "Built-in privacy safeguards and monitoring"
      },
      {
        metric: "Clinical Efficiency",
        description: "Significant reduction in administrative processing time",
        capability: "Streamlined workflows with compliance built-in"
      },
      {
        metric: "Audit Readiness",
        description: "Instant audit trail generation for compliance reviews",
        capability: "Comprehensive regulatory documentation"
      }
    ],
    workflow: [
      { step: "Clinical Intent", description: "AI agent requests patient data access or record update", tier: "Gateway" },
      { step: "HIPAA Evaluation", description: "Policy engine checks PHI access rules and minimum necessary requirements" },
      { step: "Role Verification", description: "User role and clinical context validated against access policies", tier: "Policy" },
      { step: "Clinical Approval", description: "Physician or authorized clinician approves data access" },
      { step: "PHI Warrant", description: "Scoped warrant issued with specific PHI access constraints", tier: "Warrant" },
      { step: "Secure Execution", description: "AI action performed within PHI constraints" },
      { step: "Audit Logging", description: "Complete audit trail logged for 7-year retention" }
    ],
    technicalDetails: {
      tier: "T1 HIPAA-Scoped Approvals",
      policies: ["HIPAA Privacy Rule", "HIPAA Security Rule", "HITECH Act", "Minimum Necessary", "Patient Consent"],
      integrations: ["Epic EHR", "Cerner", "HL7 FHIR", "Medical Imaging", "Insurance Systems"],
      timeline: "8-10 weeks implementation + HIPAA audit"
    },
    icon: "",
    color: "green"
  },
  {
    id: "legal-operations",
    industry: "Legal",
    title: "Attorney-Supervised AI Paralegal",
    subtitle: "Bar association compliant AI legal assistance",
    challenge: "Law firms want AI assistance for document review, legal research, and client communications, but state bar associations require attorney supervision for all AI-generated work. External communications and court filings need particular oversight to maintain professional responsibility standards.",
    solution: "Vienna OS enforces attorney-in-the-loop workflows with tiered supervision: T1 approval for internal research, T2 for client communications, and automatic blocking for unauthorized external filings. All AI work requires attorney review and professional responsibility compliance.",
    implementation: [
      "Integrate with existing legal document management systems",
      "Deploy bar association compliance policy templates",
      "Configure attorney approval workflows by practice area and document type",
      "Implement client privilege protection and confidentiality constraints",
      "Set up automatic blocking for unauthorized external communications"
    ],
    outcomes: [
      {
        metric: "Document Processing",
        description: "Designed to handle millions of legal documents monthly",
        capability: "Scalable document review with attorney oversight"
      },
      {
        metric: "Attorney Efficiency",
        description: "Significant reduction in routine review time",
        capability: "AI assistance with professional oversight maintained"
      },
      {
        metric: "Bar Compliance",
        description: "100% adherence to professional responsibility rules",
        capability: "Built-in ethical guardrails and oversight"
      },
      {
        metric: "Client Protection",
        description: "Automated privilege and confidentiality protection",
        capability: "Enhanced client confidentiality safeguards"
      }
    ],
    workflow: [
      { step: "Legal Intent", description: "AI paralegal requests to perform legal task or research", tier: "Gateway" },
      { step: "Bar Rule Check", description: "Policy engine evaluates against state bar association requirements" },
      { step: "Supervision Tier", description: "Task classified for internal research (T1) or client work (T2)", tier: "Policy" },
      { step: "Attorney Review", description: "Licensed attorney reviews and approves AI work product" },
      { step: "Legal Warrant", description: "Warrant issued with privilege and confidentiality constraints", tier: "Warrant" },
      { step: "Supervised Execution", description: "AI performs task under attorney supervision" },
      { step: "Professional Compliance", description: "Final work product verified for bar compliance" }
    ],
    technicalDetails: {
      tier: "T1-T2 Attorney-Supervised Approvals",
      policies: ["ABA Model Rules", "State Bar Requirements", "Client Confidentiality", "Attorney-Client Privilege", "Professional Liability"],
      integrations: ["iManage", "NetDocuments", "Westlaw", "LexisNexis", "Court Filing Systems"],
      timeline: "10-12 weeks implementation + bar association review"
    },
    icon: "",
    color: "gold"
  },
  {
    id: "devops-deployment",
    industry: "Technology",
    title: "Zero-Trust Deployment Pipeline",
    subtitle: "Warrant-based security for CI/CD operations",
    challenge: "Technology companies need to maintain rapid deployment velocity while ensuring security. Traditional approval processes slow down development cycles, but unrestricted deployments pose significant security risks, especially for platforms serving millions of users.",
    solution: "Vienna OS implements environment-based risk tiers with cryptographic warrants: T0 for staging environments, T1 for production, T2 for critical infrastructure. Every deployment requires proper authorization with automatic rollback capabilities and compliance monitoring.",
    implementation: [
      "Integrate Vienna OS with existing CI/CD pipeline infrastructure",
      "Configure environment-based risk assessment and policy rules",
      "Set up automatic warrant generation for different deployment types",
      "Implement rollback constraints and canary deployment controls",
      "Create real-time deployment monitoring and audit dashboard"
    ],
    outcomes: [
      {
        metric: "Deployment Scale",
        description: "Designed to handle hundreds of daily deployments",
        capability: "High-velocity deployment with security governance"
      },
      {
        metric: "Security Posture",
        description: "Zero-trust architecture with warrant-based authorization",
        capability: "Enhanced security without velocity loss"
      },
      {
        metric: "Rollback Speed",
        description: "Rapid rollback capabilities for deployment issues",
        capability: "Built-in safety and recovery mechanisms"
      },
      {
        metric: "Audit Trail",
        description: "Complete deployment history and decision trail",
        capability: "Full operational transparency and compliance"
      }
    ],
    workflow: [
      { step: "Deploy Intent", description: "CI/CD system requests deployment of code or infrastructure", tier: "Gateway" },
      { step: "Environment Assessment", description: "Policy engine evaluates target environment and deployment risk" },
      { step: "Security Tier", description: "Deployment classified by environment: T0 staging, T1 prod, T2 critical", tier: "Policy" },
      { step: "Approval Flow", description: "Automatic approval for T0, engineer approval for T1, manager for T2" },
      { step: "Deploy Warrant", description: "Cryptographic warrant with deployment constraints issued", tier: "Warrant" },
      { step: "Controlled Release", description: "Deployment executed with canary and rollback controls" },
      { step: "Verification", description: "Post-deployment health checks and compliance verification" }
    ],
    technicalDetails: {
      tier: "T0-T2 Environment-Based Tiering",
      policies: ["Deployment Windows", "Canary Requirements", "Rollback Controls", "Security Scanning", "Load Testing"],
      integrations: ["Kubernetes", "Jenkins", "GitLab CI", "Monitoring Tools", "Incident Management"],
      timeline: "4-6 weeks implementation + performance testing"
    },
    icon: "",
    color: "orange",
    featured: true
  }
];

export default function UseCasesPage() {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "implementation" | "workflow" | "technical">("overview");

  const selectedUseCase = selectedCase ? useCaseScenarios.find(c => c.id === selectedCase) : null;

  const colorClasses = {
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    green: "border-green-500/30 bg-green-500/5 text-green-400",
    gold: "border-gold-400/30 bg-gold-400/5 text-gold-400",
    orange: "border-orange-500/30 bg-orange-500/5 text-orange-400",
    red: "border-red-500/30 bg-red-500/5 text-red-400",
  };

  if (selectedUseCase) {
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
                <span className="text-sm">Back to Industry Solutions</span>
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

        {/* Use Case Detail */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border ${colorClasses[selectedUseCase.color as keyof typeof colorClasses]}`}>
                {selectedUseCase.icon}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm text-warm-500">{selectedUseCase.industry}</span>
                  {selectedUseCase.featured && (
                    <span className="px-2 py-0.5 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-full text-xs font-medium">
                      Featured Solution
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{selectedUseCase.title}</h1>
                <p className="text-warm-400">{selectedUseCase.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-navy-800/50 rounded-xl p-1 overflow-x-auto">
            {(["overview", "implementation", "workflow", "technical"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                  activeTab === tab
                    ? "bg-navy-700 text-white"
                    : "text-warm-500 hover:text-warm-300"
                }`}
              >
                {tab === "overview" && "Overview "}
                {tab === "implementation" && "Implementation "}
                {tab === "workflow" && "Workflow "}
                {tab === "technical" && "Technical "}
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
                    <p className="text-warm-300 leading-relaxed">{selectedUseCase.challenge}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Vienna OS Solution</h3>
                    <p className="text-warm-300 leading-relaxed">{selectedUseCase.solution}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Key Outcomes</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {selectedUseCase.outcomes.map((outcome, i) => (
                        <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                          <h4 className="text-white font-semibold mb-2">{outcome.metric}</h4>
                          <p className="text-warm-300 text-sm mb-2">{outcome.description}</p>
                          <div className="text-xs text-warm-500 italic">{outcome.capability}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "implementation" && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Implementation Steps</h3>
                  <div className="space-y-3">
                    {selectedUseCase.implementation.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-gold-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-warm-300">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "workflow" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Governance Workflow</h3>
                  <div className="space-y-4">
                    {selectedUseCase.workflow.map((step, i) => (
                      <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gold-400 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-white font-semibold">{step.step}</h4>
                              {step.tier && (
                                <span className="text-xs px-2 py-0.5 bg-gold-400/10 text-gold-400 border border-gold-400/20 rounded-full font-mono">
                                  {step.tier}
                                </span>
                              )}
                            </div>
                            <p className="text-warm-300 text-sm">{step.description}</p>
                          </div>
                        </div>
                        {i < selectedUseCase.workflow.length - 1 && (
                          <div className="ml-4 mt-2 w-0.5 h-6 bg-navy-600"></div>
                        )}
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
                        <h4 className="text-sm font-medium text-warm-400 mb-2">Governance Tier</h4>
                        <p className="font-mono text-white">{selectedUseCase.technicalDetails.tier}</p>
                      </div>
                      <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-warm-400 mb-2">Implementation Timeline</h4>
                        <p className="font-mono text-white">{selectedUseCase.technicalDetails.timeline}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-warm-400 mb-3">Compliance Policies</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUseCase.technicalDetails.policies.map((policy) => (
                        <span key={policy} className="px-3 py-1 bg-gold-400/10 text-gold-400 border border-gold-400/20 rounded-full text-xs font-medium">
                          {policy}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-warm-400 mb-3">System Integrations</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUseCase.technicalDetails.integrations.map((integration) => (
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
              {/* Solution Info */}
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                <h4 className="text-sm font-medium text-warm-400 mb-3">Solution Overview</h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-warm-600">Industry</div>
                    <div className="text-white font-medium">{selectedUseCase.industry}</div>
                  </div>
                  <div>
                    <div className="text-xs text-warm-600">Governance Approach</div>
                    <div className="text-white font-medium font-mono">{selectedUseCase.technicalDetails.tier}</div>
                  </div>
                  <div>
                    <div className="text-xs text-warm-600">Implementation Type</div>
                    <div className="text-white font-medium">Enterprise Deployment</div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-br from-gold-900/30 to-navy-800/50 border border-gold-400/20 rounded-xl p-5">
                <h4 className="text-white font-semibold mb-2">Ready to implement?</h4>
                <p className="text-warm-400 text-sm mb-4">
                  Deploy Vienna OS governance for your {selectedUseCase.industry.toLowerCase()} organization.
                </p>
                <div className="space-y-2">
                  <a 
                    href="/signup" 
                    className="block w-full bg-gold-400 hover:bg-gold-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition text-center"
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

              {/* Other Solutions */}
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                <h4 className="text-sm font-medium text-warm-400 mb-3">Other Industry Solutions</h4>
                <div className="space-y-2">
                  {useCaseScenarios.filter(c => c.id !== selectedCase).slice(0, 3).map((otherCase) => (
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
            <span className="hidden sm:inline text-xs text-warm-500 font-mono">Industry Solutions</span>
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
            <Layers className="w-6 h-6 text-gold-400" />
            <span className="text-sm text-gold-400 font-medium uppercase tracking-wider">Industry Solutions</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            AI Governance Use Cases
          </h1>
          <p className="text-warm-400 text-lg max-w-3xl mx-auto">
            Discover how Vienna OS enables AI agent governance across regulated industries. 
            See the workflows, technical implementations, and compliance frameworks in action.
          </p>
        </div>

        {/* Featured Solutions */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold-400" />
            Featured Solutions
          </h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {useCaseScenarios.filter(c => c.featured).map((useCase) => (
              <button
                key={useCase.id}
                onClick={() => setSelectedCase(useCase.id)}
                className="text-left bg-navy-800 border border-navy-700 hover:border-gold-400/30 rounded-2xl p-6 transition-all duration-300 hover:bg-navy-800/80 group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${colorClasses[useCase.color as keyof typeof colorClasses]} group-hover:scale-105 transition-transform`}>
                    {useCase.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-warm-500">{useCase.industry}</span>
                      <span className="px-2 py-0.5 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-full text-xs font-medium">
                        Featured
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-gold-400 transition-colors">
                      {useCase.title}
                    </h3>
                    <p className="text-sm text-warm-400">{useCase.subtitle}</p>
                  </div>
                </div>
                
                <p className="text-sm text-warm-300 leading-relaxed mb-4 line-clamp-3">
                  {useCase.challenge}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-warm-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{useCase.technicalDetails.timeline}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Settings className="w-3 h-3" />
                      <span>{useCase.technicalDetails.tier}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gold-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All Solutions */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gold-400" />
            All Industry Solutions
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCaseScenarios.map((useCase) => (
              <button
                key={useCase.id}
                onClick={() => setSelectedCase(useCase.id)}
                className="text-left bg-navy-800 border border-navy-700 hover:border-navy-600 rounded-xl p-5 transition-all hover:bg-navy-700/50 group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorClasses[useCase.color as keyof typeof colorClasses]}`}>
                    {useCase.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-warm-500 mb-0.5">{useCase.industry}</div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-gold-400 transition-colors truncate">
                      {useCase.title}
                    </h3>
                  </div>
                  {useCase.featured && (
                    <div className="w-2 h-2 rounded-full bg-gold-400"></div>
                  )}
                </div>
                <p className="text-sm text-warm-300 mb-3 line-clamp-2">
                  {useCase.subtitle}
                </p>
                <div className="flex items-center justify-between text-xs text-warm-600">
                  <span className="font-mono">{useCase.technicalDetails.tier}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-br from-gold-900/30 to-navy-800/50 border border-gold-400/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to Implement AI Governance?</h2>
          <p className="text-warm-400 mb-6 max-w-2xl mx-auto">
            Vienna OS provides the governance framework your regulated industry needs 
            to deploy AI agents safely, compliantly, and efficiently.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a 
              href="/signup" 
              className="bg-gold-400 hover:bg-gold-300 text-white px-8 py-3 rounded-xl transition font-semibold"
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