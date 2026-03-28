/**
 * Enhanced Welcome Wizard
 * 
 * Improved onboarding flow with sample data seeding and quick actions
 */

import React, { useState } from 'react';
import { Shield, Zap, FileText, CheckCircle, ArrowRight, X, Database, Play, Settings, Users } from 'lucide-react';

interface WelcomeWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  actions?: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary';
    icon?: React.ComponentType<{ className?: string }>;
  }>;
}

export function WelcomeWizard({ onComplete, onSkip }: WelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [demoDataSeeded, setDemoDataSeeded] = useState(false);

  const seedDemoData = async () => {
    try {
      const response = await fetch('/api/v1/demo/seed', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setDemoDataSeeded(true);
        console.log('Demo data seeded successfully');
      } else {
        console.error('Failed to seed demo data');
      }
    } catch (error) {
      console.error('Error seeding demo data:', error);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Vienna OS',
      description: 'Your AI governance and execution platform',
      icon: Shield,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 text-purple-400" />
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Vienna OS is a governed AI execution layer that ensures your AI agents operate safely 
              within defined boundaries while maintaining operational efficiency.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-center">
              <Zap className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h4 className="font-semibold text-[var(--text-primary)] mb-1">Intent Gateway</h4>
              <p className="text-sm text-[var(--text-secondary)]">Structured AI requests</p>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-center">
              <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <h4 className="font-semibold text-[var(--text-primary)] mb-1">Policy Engine</h4>
              <p className="text-sm text-[var(--text-secondary)]">Automated guardrails</p>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h4 className="font-semibold text-[var(--text-primary)] mb-1">Approvals</h4>
              <p className="text-sm text-[var(--text-secondary)]">T1/T2 authorization</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'quickstart',
      title: 'Quick Start Setup', 
      description: 'Get up and running in minutes',
      icon: Play,
      content: (
        <div className="space-y-6">
          <div className="bg-[var(--info-bg)] border border-[var(--info-border)] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-[var(--info-text)] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-1">Seed Demo Data</h4>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  Load sample policies, agents, and scenarios to explore Vienna OS capabilities.
                </p>
                {!demoDataSeeded ? (
                  <button
                    onClick={seedDemoData}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-secondary)] transition-colors text-sm"
                  >
                    <Database className="w-4 h-4" />
                    Seed Demo Data
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-[var(--success-text)]">
                    <CheckCircle className="w-4 h-4" />
                    Demo data loaded successfully!
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg p-4">
              <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Submit Your First Intent
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Try the governance pipeline with a test request
              </p>
              <button
                onClick={() => window.location.hash = 'intent'}
                className="text-sm px-3 py-1.5 border border-[var(--border-default)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
              >
                Go to Intent →
              </button>
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg p-4">
              <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Create a Policy
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Set up governance rules for your agents
              </p>
              <button
                onClick={() => window.location.hash = 'policies'}
                className="text-sm px-3 py-1.5 border border-[var(--border-default)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
              >
                Policy Builder →
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'navigation',
      title: 'Navigate Vienna OS',
      description: 'Explore the key areas of the platform',
      icon: Settings,
      content: (
        <div className="space-y-6">
          <div className="grid gap-3">
            {[
              { icon: Zap, title: 'Now', desc: 'System status and activity center', hash: 'now' },
              { icon: Users, title: 'Fleet', desc: 'Agent governance dashboard', hash: 'fleet' },
              { icon: CheckCircle, title: 'Approvals', desc: 'Review and approve T1/T2 actions', hash: 'approvals' },
              { icon: Shield, title: 'Policies', desc: 'Create and manage governance rules', hash: 'policies' },
              { icon: FileText, title: 'Compliance', desc: 'Audit trails and reports', hash: 'compliance' }
            ].map((item) => (
              <div key={item.hash} className="flex items-center gap-4 p-3 bg-[var(--bg-secondary)] rounded-lg">
                <div className="p-2 bg-[var(--accent-primary)]/10 rounded-lg">
                  <item.icon className="w-5 h-5 text-[var(--accent-primary)]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[var(--text-primary)]">{item.title}</h4>
                  <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
                </div>
                <button
                  onClick={() => window.location.hash = item.hash}
                  className="text-sm px-3 py-1.5 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-md transition-colors"
                >
                  Visit →
                </button>
              </div>
            ))}
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Settings className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h4>
                <p className="text-sm text-[var(--text-secondary)]">Access everything quickly</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Global search</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded text-xs">⌘</kbd>
                  <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded text-xs">K</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Quick search</span>
                <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded text-xs">/</kbd>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--border-subtle)] p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-xl">
              <currentStepData.icon className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {currentStepData.title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {currentStepData.description} • Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-subtle)] p-6 flex items-center justify-between">
          {/* Progress */}
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-[var(--accent-primary)]'
                    : index < currentStep
                    ? 'w-2 bg-[var(--accent-secondary)]'
                    : 'w-2 bg-[var(--bg-tertiary)]'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              >
                Back
              </button>
            )}
            <button
              onClick={onSkip}
              className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white rounded-lg font-medium transition flex items-center gap-2"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <CheckCircle className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}