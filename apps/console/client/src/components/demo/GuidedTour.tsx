import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Check, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TourStep {
  id: string;
  title: string;
  description: string;
  page: string;
  element?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

interface GuidedTourProps {
  isActive: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

const DEMO_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Vienna OS',
    description: 'Take a 3-minute tour to see how AI governance works in practice. We\'ll walk through the complete governance pipeline from intent to execution.',
    page: '/',
  },
  {
    id: 'dashboard',
    title: 'Mission Control Dashboard',
    description: 'Your central command center. See active agents, recent governance events, system health, and quick access to all key functions.',
    page: '/',
    element: '.dashboard-stats',
  },
  {
    id: 'fleet',
    title: 'Agent Fleet',
    description: 'All connected AI agents in one view. Monitor their activity, risk profiles, and trust scores. Each agent must be registered and authenticated before taking actions.',
    page: '/fleet',
  },
  {
    id: 'intent',
    title: 'Submit an Intent',
    description: 'Agents submit intents (what they want to do). This triggers the governance pipeline: policy evaluation → approval/denial → warrant issuance → execution.',
    page: '/intent',
    element: 'form',
  },
  {
    id: 'policies',
    title: 'Policy Builder',
    description: 'Define governance rules: who can do what, when, and under what conditions. Policies are evaluated automatically for every intent.',
    page: '/policies',
  },
  {
    id: 'approvals',
    title: 'Approval Queue',
    description: 'High-risk actions (T2/T3) require human approval. Review context, see risk assessment, approve or deny with one click.',
    page: '/approvals',
  },
  {
    id: 'executions',
    title: 'Execution Monitoring',
    description: 'Track real-time execution of approved actions. See status, latency, results, and full audit trail. Every step is logged and verifiable.',
    page: '/executions',
  },
  {
    id: 'compliance',
    title: 'Compliance Reports',
    description: 'Export audit logs for SOC 2, GDPR, or internal compliance. Every governance decision is timestamped, immutable, and traceable.',
    page: '/compliance',
  },
  {
    id: 'analytics',
    title: 'Analytics & Insights',
    description: 'Understand your governance posture: approval rates, risk distribution, agent behavior trends, and policy effectiveness.',
    page: '/analytics',
  },
  {
    id: 'complete',
    title: 'Tour Complete!',
    description: 'You\'ve seen the complete governance pipeline. Ready to try it yourself? Connect an agent or explore the demo mode.',
    page: '/',
  },
];

export function GuidedTour({ isActive, onComplete, onDismiss }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  const step = DEMO_TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === DEMO_TOUR_STEPS.length - 1;

  useEffect(() => {
    if (!isActive) return;

    // Navigate to step page if different from current
    if (step.page && step.page !== window.location.pathname) {
      setIsNavigating(true);
      navigate(step.page);
      setTimeout(() => setIsNavigating(false), 300);
    }

    // Highlight element if specified
    if (step.element) {
      const element = document.querySelector(step.element);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('tour-highlight');
      }
      return () => {
        element?.classList.remove('tour-highlight');
      };
    }
  }, [currentStep, step, isActive, navigate]);

  if (!isActive) return null;

  const handleNext = () => {
    if (step.action) step.action();
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

  const handleSkip = () => {
    onDismiss();
  };

  return (
    <>
      {/* Overlay backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={handleSkip} />

      {/* Tour tooltip */}
      <div
        className="fixed bottom-8 right-8 max-w-md bg-[#1a1a1a] border border-[#d4af37]/40 rounded-lg shadow-2xl z-[9999]"
        style={{
          boxShadow: '0 0 40px rgba(212, 175, 55, 0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-800">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Play className="w-4 h-4 text-[#d4af37]" />
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                Step {currentStep + 1} of {DEMO_TOUR_STEPS.length}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[#d4af37] font-mono">{step.title}</h3>
          </div>
          <button
            onClick={handleSkip}
            className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Close tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isNavigating ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin" />
            </div>
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed">{step.description}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {DEMO_TOUR_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-[#d4af37] w-6'
                    : index < currentStep
                    ? 'bg-[#d4af37]/40'
                    : 'bg-gray-700'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1 font-mono"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isNavigating}
              className="px-4 py-2 bg-[#d4af37] text-black rounded font-medium text-sm hover:bg-[#d4af37]/90 transition-colors flex items-center gap-1 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Inject highlight styles */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 9999;
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.4),
                      0 0 0 8px rgba(212, 175, 55, 0.2),
                      0 0 20px rgba(212, 175, 55, 0.3) !important;
          border-radius: 8px;
          animation: tour-pulse 2s ease-in-out infinite;
        }
        
        @keyframes tour-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.4),
                        0 0 0 8px rgba(212, 175, 55, 0.2),
                        0 0 20px rgba(212, 175, 55, 0.3);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(212, 175, 55, 0.5),
                        0 0 0 12px rgba(212, 175, 55, 0.25),
                        0 0 30px rgba(212, 175, 55, 0.4);
          }
        }
      `}</style>
    </>
  );
}
