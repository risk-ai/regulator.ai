/**
 * Governance Chain Visualization — Vienna OS Console
 * 
 * Traces the complete governance pipeline for any intent:
 * Intent → Policy Decision → Approval → Warrant → Execution → Verification → Attestation
 * 
 * This is the differentiator — the ability to trace any action back through
 * the full authorization chain with cryptographic proof at each step.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Eye,
  Zap,
  AlertTriangle,
  ChevronRight,
  Search,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../api/client.js';

// ─── Types ───

interface GovernanceStep {
  id: string;
  type: 'intent' | 'policy' | 'approval' | 'warrant' | 'execution' | 'verification' | 'attestation';
  status: 'completed' | 'pending' | 'failed' | 'skipped';
  timestamp: string;
  data: Record<string, unknown>;
  duration_ms?: number;
}

interface GovernanceChain {
  intent_id: string;
  agent_id: string;
  action: string;
  risk_tier: string;
  steps: GovernanceStep[];
  total_duration_ms: number;
  chain_valid: boolean;
}

// ─── Step Configuration ───

const STEP_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
}> = {
  intent: { icon: Zap, label: 'Intent Submitted', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  policy: { icon: FileText, label: 'Policy Evaluated', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  approval: { icon: CheckCircle, label: 'Approval', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  warrant: { icon: Lock, label: 'Warrant Issued', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  execution: { icon: Zap, label: 'Executed', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  verification: { icon: Eye, label: 'Verified', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
  attestation: { icon: Shield, label: 'Attested', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
};

const RISK_TIER_COLORS: Record<string, string> = {
  T0: 'text-green-400 bg-green-500/10 border-green-500/30',
  T1: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  T2: 'text-red-400 bg-red-500/10 border-red-500/30',
  T3: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

// ─── Step Detail Component ───

function StepDetail({ step }: { step: GovernanceStep }) {
  const [expanded, setExpanded] = useState(false);
  const config = STEP_CONFIG[step.type] || STEP_CONFIG.intent;
  const Icon = config.icon;

  const statusIcon = step.status === 'completed' ? (
    <CheckCircle className="w-4 h-4 text-green-400" />
  ) : step.status === 'failed' ? (
    <XCircle className="w-4 h-4 text-red-400" />
  ) : step.status === 'pending' ? (
    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
  ) : (
    <div className="w-4 h-4 rounded-full bg-[var(--bg-tertiary)]" />
  );

  return (
    <div className="relative">
      {/* Connector line */}
      <div className="absolute left-6 top-12 bottom-0 w-px bg-[var(--border-subtle)]" />
      
      <div
        className={`p-4 rounded-lg border cursor-pointer transition-all ${
          step.status === 'completed' ? 'border-[var(--border-default)] bg-[var(--bg-secondary)]' :
          step.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
          step.status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' :
          'border-[var(--border-subtle)] bg-[var(--bg-primary)] opacity-50'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text-primary)]">{config.label}</span>
              {statusIcon}
              {step.duration_ms !== undefined && (
                <span className="text-xs text-[var(--text-tertiary)]">
                  {step.duration_ms < 1000 ? `${step.duration_ms}ms` : `${(step.duration_ms / 1000).toFixed(1)}s`}
                </span>
              )}
            </div>
            <div className="text-sm text-[var(--text-secondary)] truncate">
              {step.id}
            </div>
          </div>

          <div className="text-xs text-[var(--text-tertiary)]">
            {new Date(step.timestamp).toLocaleTimeString()}
          </div>
          
          <ChevronRight className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <pre className="text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] p-3 rounded overflow-x-auto">
              {JSON.stringify(step.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───

export function GovernanceChainPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [chain, setChain] = useState<GovernanceChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentChains, setRecentChains] = useState<GovernanceChain[]>([]);

  // Load recent governance chains
  useEffect(() => {
    loadRecentChains();
  }, []);

  async function loadRecentChains() {
    try {
      const response = await apiClient.get<any>('/audit?limit=10&event=intent.submitted');
      const events = (response as any)?.data || [];
      // Transform audit events into chain summaries
      const chains = events.map((event: any) => ({
        intent_id: event.details?.intent_id || event.id,
        agent_id: event.details?.agent_id || 'unknown',
        action: event.details?.action || event.event,
        risk_tier: event.details?.risk_tier || 'T0',
        steps: [],
        total_duration_ms: 0,
        chain_valid: true,
      }));
      setRecentChains(chains);
    } catch {
      // Silent fail — recent chains are optional
    }
  }

  async function searchChain(intentId: string) {
    setLoading(true);
    try {
      // Fetch all audit events for this intent
      const response = await apiClient.get<any>(`/audit?intent_id=${intentId}&limit=50`);
      const events = (response as any)?.data || [];

      if (events.length === 0) {
        setChain(null);
        return;
      }

      // Build the governance chain from audit events
      const steps: GovernanceStep[] = [];
      let riskTier = 'T0';
      let agentId = 'unknown';
      let action = 'unknown';

      for (const event of events) {
        const details = event.details || {};

        if (event.event?.includes('intent.submitted') || event.event?.includes('submitted')) {
          riskTier = details.risk_tier || riskTier;
          agentId = details.agent_id || agentId;
          action = details.action || action;
          steps.push({
            id: details.intent_id || event.id,
            type: 'intent',
            status: 'completed',
            timestamp: event.created_at || event.timestamp,
            data: details,
          });
        } else if (event.event?.includes('policy')) {
          steps.push({
            id: details.evaluation_id || details.policy_id || event.id,
            type: 'policy',
            status: details.decision === 'deny' ? 'failed' : 'completed',
            timestamp: event.created_at || event.timestamp,
            data: details,
            duration_ms: details.evaluation_time_ms,
          });
        } else if (event.event?.includes('approval')) {
          steps.push({
            id: details.approval_id || event.id,
            type: 'approval',
            status: details.action === 'deny' ? 'failed' : event.event?.includes('resolved') ? 'completed' : 'pending',
            timestamp: event.created_at || event.timestamp,
            data: details,
          });
        } else if (event.event?.includes('warrant')) {
          steps.push({
            id: details.warrant_id || event.id,
            type: 'warrant',
            status: event.event?.includes('tamper') ? 'failed' : 'completed',
            timestamp: event.created_at || event.timestamp,
            data: details,
          });
        } else if (event.event?.includes('execution')) {
          steps.push({
            id: details.execution_id || event.id,
            type: 'execution',
            status: event.event?.includes('failed') ? 'failed' : 'completed',
            timestamp: event.created_at || event.timestamp,
            data: details,
            duration_ms: details.execution_time_ms,
          });
        } else if (event.event?.includes('verification')) {
          steps.push({
            id: details.verification_id || event.id,
            type: 'verification',
            status: details.status === 'success' ? 'completed' : details.status === 'failed' ? 'failed' : 'completed',
            timestamp: event.created_at || event.timestamp,
            data: details,
            duration_ms: details.verification_time_ms,
          });
        } else if (event.event?.includes('attestation')) {
          steps.push({
            id: details.attestation_id || event.id,
            type: 'attestation',
            status: 'completed',
            timestamp: event.created_at || event.timestamp,
            data: details,
          });
        }
      }

      // Sort by timestamp
      steps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const firstTs = steps[0] ? new Date(steps[0].timestamp).getTime() : 0;
      const lastTs = steps[steps.length - 1] ? new Date(steps[steps.length - 1].timestamp).getTime() : 0;

      setChain({
        intent_id: intentId,
        agent_id: agentId,
        action,
        risk_tier: riskTier,
        steps,
        total_duration_ms: lastTs - firstTs,
        chain_valid: steps.every(s => s.status !== 'failed'),
      });
    } catch (err) {
      console.error('Failed to load governance chain:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Shield className="w-7 h-7 text-purple-400" />
          Governance Chain
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Trace any action through the complete authorization chain — from intent to attestation.
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Enter intent ID (e.g., int_1711900000_abc123)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchQuery && searchChain(searchQuery)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
          />
        </div>
        <button
          onClick={() => searchQuery && searchChain(searchQuery)}
          disabled={loading || !searchQuery}
          className="px-4 py-2.5 bg-[var(--accent-primary)] text-white rounded-lg font-medium disabled:opacity-50 transition-colors hover:bg-[var(--accent-secondary)] flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Trace
        </button>
      </div>

      {/* Chain visualization */}
      {chain && (
        <div className="space-y-4">
          {/* Chain header */}
          <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg">
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full border text-sm font-mono ${RISK_TIER_COLORS[chain.risk_tier] || RISK_TIER_COLORS.T0}`}>
                {chain.risk_tier}
              </div>
              <div>
                <div className="font-medium text-[var(--text-primary)]">{chain.action}</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Agent: {chain.agent_id} · {chain.steps.length} steps · {chain.total_duration_ms}ms total
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {chain.chain_valid ? (
                <div className="flex items-center gap-1.5 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Chain Valid
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Chain Broken
                </div>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 pl-2">
            {chain.steps.map((step, i) => (
              <StepDetail key={`${step.type}-${i}`} step={step} />
            ))}
          </div>

          {/* Expected steps not present */}
          {chain.steps.length > 0 && chain.steps.length < 7 && (
            <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-tertiary)]">
              {7 - chain.steps.length} step(s) not yet recorded in audit trail.
              The full chain is: Intent → Policy → Approval → Warrant → Execution → Verification → Attestation
            </div>
          )}
        </div>
      )}

      {/* Recent intents */}
      {!chain && recentChains.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Intents</h2>
          {recentChains.map((rc, i) => (
            <button
              key={i}
              onClick={() => {
                setSearchQuery(rc.intent_id);
                searchChain(rc.intent_id);
              }}
              className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-left hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`px-2 py-0.5 rounded text-xs font-mono ${RISK_TIER_COLORS[rc.risk_tier] || RISK_TIER_COLORS.T0}`}>
                  {rc.risk_tier}
                </div>
                <span className="font-mono text-sm text-[var(--text-primary)]">{rc.intent_id}</span>
                <span className="text-sm text-[var(--text-secondary)]">{rc.action}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!chain && recentChains.length === 0 && !loading && (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Enter an intent ID to trace its governance chain</p>
          <p className="text-sm mt-2">
            Every action in Vienna OS has a complete, cryptographically verifiable authorization chain.
          </p>
        </div>
      )}
    </div>
  );
}

export default GovernanceChainPage;
