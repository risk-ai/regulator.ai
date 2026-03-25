/**
 * First-Run Onboarding Modal
 * 
 * Guides new users through their first Vienna OS experience
 */

import React, { useState } from 'react';
import { Shield, Zap, FileText, CheckCircle, ArrowRight, X } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    icon: Shield,
    title: 'Welcome to Vienna OS',
    description: 'Vienna OS is a governed AI execution layer. Agents propose actions, Vienna enforces policy, and operators approve high-stakes decisions.',
    features: [
      'Intent Gateway — Canonical entry for agent requests',
      'Policy Engine — Automated guardrails',
      'Operator Approval — T1/T2 authorization workflow',
    ],
  },
  {
    icon: Zap,
    title: 'Submit Your First Intent',
    description: 'Intents are structured requests for governed execution. Try submitting a test intent to see the governance pipeline in action.',
    action: 'Click "Intent" in the navigation to submit your first request.',
  },
  {
    icon: FileText,
    title: 'Explore the Dashboard',
    description: 'The "Now" page shows your system status, active objectives, and real-time activity. As you submit intents, you\'ll see them flow through the governance pipeline.',
    action: 'Navigate through the tabs to explore approvals, history, and services.',
  },
];

export function OnboardingModal({ onComplete, onSkip }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === STEPS.length - 1;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-navy-800 border border-navy-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="border-b border-navy-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <Icon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{step.title}</h2>
              <p className="text-sm text-slate-400">
                Step {currentStep + 1} of {STEPS.length}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-slate-500 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-slate-300 leading-relaxed">
            {step.description}
          </p>
          
          {step.features && (
            <div className="space-y-3">
              {step.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">{feature}</span>
                </div>
              ))}
            </div>
          )}
          
          {step.action && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <p className="text-sm text-purple-300 font-medium">
                {step.action}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-navy-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-purple-400'
                    : index < currentStep
                    ? 'w-1.5 bg-purple-600'
                    : 'w-1.5 bg-navy-600'
                }`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 text-slate-400 hover:text-white transition"
              >
                Back
              </button>
            )}
            <button
              onClick={onSkip}
              className="px-4 py-2 text-slate-400 hover:text-white transition"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition flex items-center gap-2"
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
