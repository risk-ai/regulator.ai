/**
 * Empty Dashboard State
 * 
 * Welcoming state for new users with quick actions and getting started guidance
 */

import React, { useState } from 'react';
import { 
  Zap, 
  Shield, 
  Users, 
  FileText, 
  CheckCircle, 
  Database, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface EmptyDashboardProps {
  onSeedDemo?: () => void;
  onNavigate?: (section: string) => void;
}

export function EmptyDashboard({ onSeedDemo, onNavigate }: EmptyDashboardProps) {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDemo = async () => {
    if (!onSeedDemo) return;
    
    setIsSeeding(true);
    try {
      await onSeedDemo();
    } finally {
      setIsSeeding(false);
    }
  };

  const quickActions = [
    {
      id: 'submit-intent',
      icon: Zap,
      title: 'Submit Your First Intent',
      description: 'Try the governance pipeline with a test request',
      action: () => onNavigate?.('intent'),
      primary: true
    },
    {
      id: 'create-policy',
      icon: Shield,
      title: 'Create a Policy',
      description: 'Set up governance rules for your agents',
      action: () => onNavigate?.('policies'),
      primary: false
    },
    {
      id: 'view-fleet',
      icon: Users,
      title: 'Explore Fleet Dashboard',
      description: 'See how agent governance works',
      action: () => onNavigate?.('fleet'),
      primary: false
    }
  ];

  const features = [
    {
      icon: Zap,
      title: 'Intent Gateway',
      description: 'Structured entry point for all AI agent requests with automatic risk assessment'
    },
    {
      icon: Shield,
      title: 'Policy Engine',
      description: 'Automated governance rules that ensure safe AI operations within defined boundaries'
    },
    {
      icon: CheckCircle,
      title: 'Approval Workflow',
      description: 'T1/T2 authorization system for high-stakes actions requiring human oversight'
    },
    {
      icon: FileText,
      title: 'Audit Trail',
      description: 'Complete compliance logging and reporting for all AI agent activities'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-purple-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Welcome to Vienna OS
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          Your AI governance platform is ready. Vienna OS ensures your agents operate safely 
          within defined boundaries while maintaining operational efficiency.
        </p>
      </div>

      {/* Demo Data Section */}
      <div className="bg-[var(--info-bg)] border border-[var(--info-border)] rounded-xl p-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[var(--accent-primary)]/10 rounded-lg">
            <Database className="w-6 h-6 text-[var(--accent-primary)]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">
              Get Started with Demo Data
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Load sample policies, agents, and scenarios to explore Vienna OS capabilities. 
              This includes example governance rules, mock agent requests, and approval workflows.
            </p>
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] disabled:bg-[var(--accent-primary)]/50 text-white rounded-lg font-medium transition-colors"
            >
              <Database className="w-4 h-4" />
              {isSeeding ? 'Loading Demo Data...' : 'Seed Demo Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6 text-center">
          Quick Actions
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                className={`p-6 rounded-xl border transition-all text-left group ${
                  action.primary
                    ? 'bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/30'
                    : 'bg-[var(--bg-primary)] border-[var(--border-default)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    action.primary
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  } group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent-primary)] transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                      {action.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Features Overview */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6 text-center">
          Key Features
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex items-start gap-4 p-4 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg"
              >
                <div className="p-2 bg-[var(--bg-secondary)] rounded-lg">
                  <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-6 text-center">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">
          Need Help Getting Started?
        </h3>
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          Use <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded text-xs">⌘K</kbd> to open the command palette for quick navigation and actions.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-[var(--text-tertiary)]">
          <span>Explore the navigation tabs above</span>
          <span>•</span>
          <span>Check the approval workflow</span>
          <span>•</span>
          <span>Review governance policies</span>
        </div>
      </div>
    </div>
  );
}