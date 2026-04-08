/**
 * Interactive Tutorial
 * First-time user guided flow through Vienna OS Console
 */

import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action?: string;
  highlight?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Vienna OS',
    description: 'Vienna governs AI agent actions with policy enforcement, approval workflows, and audit trails.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    description: 'Monitor system health, queue depth, and active executions in real-time.',
    highlight: '.dashboard-grid',
  },
  {
    id: 'approvals',
    title: 'Approval Workflow',
    description: 'T1 and T2 actions require operator authorization before execution.',
    action: 'Navigate to Approvals',
    highlight: '[href="/approvals"]',
  },
  {
    id: 'objectives',
    title: 'Managed Objectives',
    description: 'Track active objectives and their reconciliation status.',
    action: 'Navigate to Objectives',
    highlight: '[href="/objectives"]',
  },
  {
    id: 'policies',
    title: 'Policy Engine',
    description: 'Define governance rules that automatically allow, deny, or modify actions.',
    action: 'Navigate to Policies',
    highlight: '[href="/policies"]',
  },
  {
    id: 'complete',
    title: 'Tutorial Complete!',
    description: 'You can revisit this tutorial anytime from the help menu.',
  },
];

export function InteractiveTutorial() {
  const [isOpen, setIsOpen] = useState(!localStorage.getItem('vienna_tutorial_completed'));
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      localStorage.setItem('vienna_tutorial_completed', 'true');
      setIsOpen(false);
    } else {
      setCurrentStep(currentStep + 1);
      
      // Highlight element if specified
      if (tutorialSteps[currentStep + 1]?.highlight) {
        const element = document.querySelector(tutorialSteps[currentStep + 1].highlight!);
        if (element) {
          element.classList.add('tutorial-highlight');
          setTimeout(() => element.classList.remove('tutorial-highlight'), 2000);
        }
      }
    }
  };

  const handleSkip = () => {
    localStorage.setItem('vienna_tutorial_completed', 'true');
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold">
              {currentStep + 1}
            </div>
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
          </div>
          <button
            onClick={handleSkip}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex gap-1">
            {tutorialSteps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded ${
                  idx <= currentStep ? 'bg-amber-600' : 'bg-neutral-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Step {currentStep + 1} of {tutorialSteps.length}
          </p>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-neutral-300 leading-relaxed">{step.description}</p>
          
          {step.action && (
            <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <p className="text-sm text-amber-300">
                <strong>Action:</strong> {step.action}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700 transition-colors"
            >
              Back
            </button>
          )}
          
          <button
            onClick={handleNext}
            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
          >
            {isLastStep ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Finish Tutorial
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
  );
}
