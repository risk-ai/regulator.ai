/**
 * Rich Empty State Component
 * Context-aware empty states with helpful guidance
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface HelpLink {
  text: string;
  href: string;
}

interface RichEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  details?: string[];
  action?: Action;
  secondaryAction?: Action;
  helpLink?: HelpLink;
  variant?: 'default' | 'success' | 'info';
}

export function RichEmptyState({
  icon: Icon,
  title,
  description,
  details,
  action,
  secondaryAction,
  helpLink,
  variant = 'default'
}: RichEmptyStateProps) {
  const colors = {
    default: {
      iconBg: 'rgba(115, 115, 115, 0.1)',
      iconColor: 'var(--text-muted)',
      titleColor: 'var(--text-primary)',
      descColor: 'var(--text-secondary)'
    },
    success: {
      iconBg: 'rgba(34, 197, 94, 0.1)',
      iconColor: '#22c55e',
      titleColor: '#22c55e',
      descColor: 'var(--text-secondary)'
    },
    info: {
      iconBg: 'rgba(59, 130, 246, 0.1)',
      iconColor: '#3b82f6',
      titleColor: 'var(--text-primary)',
      descColor: 'var(--text-secondary)'
    }
  };

  const theme = colors[variant];

  return (
    <div className="flex items-center justify-center py-16 px-4">
      <div className="text-center max-w-lg">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div 
            className="p-4 rounded-xl"
            style={{ background: theme.iconBg }}
          >
            <Icon className="w-10 h-10" style={{ color: theme.iconColor }} />
          </div>
        </div>

        {/* Title */}
        <h3 
          className="text-xl font-semibold mb-3"
          style={{ color: theme.titleColor }}
        >
          {title}
        </h3>

        {/* Description */}
        <p 
          className="text-sm mb-4 leading-relaxed"
          style={{ color: theme.descColor }}
        >
          {description}
        </p>

        {/* Details list */}
        {details && details.length > 0 && (
          <ul className="text-sm text-left mb-6 space-y-2 max-w-md mx-auto">
            {details.map((detail, i) => (
              <li 
                key={i}
                className="flex items-start gap-2"
                style={{ color: 'var(--text-muted)' }}
              >
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex gap-3 justify-center mb-4">
            {action && (
              <button
                onClick={action.onClick}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                style={{
                  background: action.variant === 'secondary' 
                    ? 'var(--bg-secondary)' 
                    : 'var(--accent-primary)',
                  color: action.variant === 'secondary'
                    ? 'var(--text-secondary)'
                    : '#000000',
                  border: action.variant === 'secondary'
                    ? '1px solid var(--border-subtle)'
                    : 'none'
                }}
              >
                {action.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}

        {/* Help link */}
        {helpLink && (
          <a
            href={helpLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline inline-flex items-center gap-1"
            style={{ color: 'var(--accent-primary)' }}
          >
            {helpLink.text}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Pre-configured empty states for common scenarios
 */

export const EmptyStates = {
  Approvals: {
    AllClear: (props: { onViewPolicies?: () => void; onViewHistory?: () => void }) => (
      <RichEmptyState
        icon={require('lucide-react').CheckCircle2}
        variant="success"
        title="All Clear"
        description="No approvals pending. Your agents are operating within policy."
        details={[
          "High-risk actions (T2) will appear here for review",
          "Moderate actions (T1) may require approval based on policy",
          "All T0 actions are auto-approved"
        ]}
        secondaryAction={props.onViewPolicies ? {
          label: "View Policies",
          onClick: props.onViewPolicies,
          variant: 'secondary'
        } : undefined}
        helpLink={{
          text: "Learn about approval tiers",
          href: "https://docs.regulator.ai/approvals"
        }}
      />
    ),
    NoData: (props: { onRefresh?: () => void }) => (
      <RichEmptyState
        icon={require('lucide-react').Inbox}
        variant="info"
        title="No Approval Data"
        description="Waiting for the first governance request from your agents."
        details={[
          "Connect agents via the SDK to start tracking actions",
          "Configure policies to define what requires approval",
          "Test the flow by submitting a sample intent"
        ]}
        action={props.onRefresh ? {
          label: "Refresh",
          onClick: props.onRefresh
        } : undefined}
        helpLink={{
          text: "Quick start guide",
          href: "https://docs.regulator.ai/quickstart"
        }}
      />
    )
  },

  Fleet: {
    NoAgents: (props: { onAddAgent?: () => void; onViewDocs?: () => void }) => (
      <RichEmptyState
        icon={require('lucide-react').Bot}
        variant="info"
        title="No Agents Connected"
        description="Start by connecting your first AI agent to Vienna OS."
        details={[
          "Install the Vienna SDK: npm install vienna-os",
          "Initialize your agent with API credentials",
          "Agents appear here once they make their first request"
        ]}
        action={props.onAddAgent ? {
          label: "Add Agent",
          onClick: props.onAddAgent
        } : undefined}
        helpLink={{
          text: "SDK documentation",
          href: "https://docs.regulator.ai/sdk"
        }}
      />
    ),
    AllSuspended: (props: { onViewPolicies?: () => void }) => (
      <RichEmptyState
        icon={require('lucide-react').AlertTriangle}
        variant="default"
        title="All Agents Suspended"
        description="No active agents in your fleet. Review suspended agents to restore service."
        secondaryAction={props.onViewPolicies ? {
          label: "Review Policies",
          onClick: props.onViewPolicies,
          variant: 'secondary'
        } : undefined}
      />
    )
  },

  Policies: {
    NoPolicies: (props: { onCreatePolicy?: () => void; onUseTemplate?: () => void }) => (
      <RichEmptyState
        icon={require('lucide-react').Shield}
        variant="info"
        title="No Governance Policies"
        description="Define policies to control what your agents can do without approval."
        details={[
          "T2 policies require operator approval for high-risk actions",
          "T1 policies flag actions for review or conditional approval",
          "T0 policies auto-approve low-risk actions"
        ]}
        action={props.onCreatePolicy ? {
          label: "Create Policy",
          onClick: props.onCreatePolicy
        } : undefined}
        secondaryAction={props.onUseTemplate ? {
          label: "Browse Templates",
          onClick: props.onUseTemplate,
          variant: 'secondary'
        } : undefined}
        helpLink={{
          text: "Policy design guide",
          href: "https://docs.regulator.ai/policies"
        }}
      />
    )
  },

  Executions: {
    NoHistory: (props: { onRefresh?: () => void }) => (
      <RichEmptyState
        icon={require('lucide-react').History}
        variant="info"
        title="No Execution History"
        description="Your audit trail will appear here once agents start executing actions."
        details={[
          "Every approved action generates an execution record",
          "Failed and denied actions also appear in the audit log",
          "Records are retained for 7 years by default"
        ]}
        action={props.onRefresh ? {
          label: "Refresh",
          onClick: props.onRefresh
        } : undefined}
        helpLink={{
          text: "Audit & compliance",
          href: "https://docs.regulator.ai/compliance"
        }}
      />
    )
  },

  Integrations: {
    NoIntegrations: (props: { onAddSlack?: () => void; onAddWebhook?: () => void }) => (
      <RichEmptyState
        icon={require('lucide-react').Plug}
        variant="info"
        title="No Integrations"
        description="Connect Vienna OS to your notification and alerting systems."
        details={[
          "Slack: Get approval requests in dedicated channels",
          "Webhooks: Send governance events to your systems",
          "Email: Receive alerts for critical actions"
        ]}
        action={props.onAddSlack ? {
          label: "Add Slack",
          onClick: props.onAddSlack
        } : undefined}
        secondaryAction={props.onAddWebhook ? {
          label: "Add Webhook",
          onClick: props.onAddWebhook,
          variant: 'secondary'
        } : undefined}
      />
    )
  }
};
