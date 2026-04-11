/**
 * Policy Builder Premium — Vienna OS
 * 
 * Mission control for governance rules.
 * Bloomberg Terminal aesthetic with visual flow builder.
 * 
 * Features:
 * - Visual drag-drop condition builder
 * - Live policy simulator with intent stream
 * - Sparkline metrics for rule performance
 * - Tier-based visual hierarchy (T0/T1/T2)
 * - Real-time rule testing with step-by-step evaluation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import {
  listPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  togglePolicy,
  duplicatePolicy,
  evaluatePolicy,
  reorderPolicies,
  getTemplates,
  listEvaluations,
  type PolicyRule,
  type PolicyCondition,
  type PolicyTemplate,
  type PolicyEvaluation,
  type CreatePolicyPayload,
  type FullEvaluationResult,
  getPolicyVersions,
  revertPolicy,
  type PolicyVersion,
  getPolicyCoverage,
  getPolicyConflicts,
  getPolicyEffectiveness,
  bulkPolicyAction,
  type CoverageData,
  type ConflictsData,
  type EffectivenessData,
} from '../api/policies.js';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type Tab = 'builder' | 'simulator' | 'audit';
type ViewMode = 'grid' | 'flow';

const TIER_COLORS = {
  T0: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' }, // Green
  T1: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' }, // Amber
  T2: { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },  // Red
};

const ACTION_TYPES = [
  { value: 'allow', label: 'ALLOW', color: '#10b981', icon: '✓' },
  { value: 'deny', label: 'DENY', color: '#ef4444', icon: '✗' },
  { value: 'require_approval', label: 'APPROVAL', color: '#f59e0b', icon: '⏳' },
  { value: 'flag_for_review', label: 'REVIEW', color: '#8b5cf6', icon: '🔍' },
  { value: 'rate_limit', label: 'LIMIT', color: '#06b6d4', icon: '⏱' },
  { value: 'escalate', label: 'ESCALATE', color: '#f97316', icon: '⚠' },
];

const FIELD_PRESETS = [
  { field: 'action_type', label: 'Action Type', type: 'string' },
  { field: 'agent_id', label: 'Agent', type: 'string' },
  { field: 'amount', label: 'Amount ($)', type: 'number' },
  { field: 'environment', label: 'Environment', type: 'string' },
  { field: 'risk_score', label: 'Risk Score', type: 'number' },
  { field: 'resource_type', label: 'Resource', type: 'string' },
  { field: 'time_of_day', label: 'Time', type: 'time' },
];

const OPERATORS = {
  string: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '≠' },
    { value: 'contains', label: '⊃' },
    { value: 'in', label: '∈' },
    { value: 'matches', label: '~' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'between', label: '↔' },
  ],
  time: [
    { value: 'time_between', label: 'between' },
    { value: 'equals', label: '=' },
  ],
};

// ============================================================================
// PREMIUM UI COMPONENTS
// ============================================================================

/** Metric card with sparkline */
function MetricCard({ label, value, trend, sparkline }: {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'flat';
  sparkline?: number[];
}) {
  return (
    <div style={{
      background: 'rgba(10, 14, 20, 0.6)',
      border: '1px solid rgba(251, 191, 36, 0.2)',
      padding: '12px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.6), transparent)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 600,
          color: 'rgba(251, 191, 36, 0.7)',
          letterSpacing: '0.1em',
          marginBottom: '4px',
          fontFamily: 'var(--font-mono)',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#fbbf24',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1,
        }}>
          {value}
        </div>
        {trend && (
          <div style={{
            fontSize: '11px',
            color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280',
            marginTop: '4px',
            fontFamily: 'var(--font-mono)',
          }}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </div>
        )}
      </div>

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (
        <svg width="100%" height="24" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.3 }}>
          <polyline
            points={sparkline.map((v, i) => `${(i / (sparkline.length - 1)) * 100}%,${24 - (v / Math.max(...sparkline)) * 20}`).join(' ')}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
          />
        </svg>
      )}
    </div>
  );
}

/** Rule status badge with tier glow */
function RuleBadge({ rule }: { rule: PolicyRule }) {
  const action = ACTION_TYPES.find(a => a.value === rule.action_on_match);
  const tierColor = rule.approval_tier ? TIER_COLORS[rule.approval_tier as keyof typeof TIER_COLORS] : null;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      background: `${action?.color}15`,
      border: `1px solid ${action?.color}40`,
      fontSize: '11px',
      fontWeight: 600,
      color: action?.color,
      fontFamily: 'var(--font-mono)',
      position: 'relative',
      ...(tierColor && {
        boxShadow: `0 0 12px ${tierColor.glow}`,
      }),
    }}>
      {action?.icon} {action?.label}
      {rule.approval_tier && (
        <span style={{
          marginLeft: '4px',
          padding: '2px 4px',
          background: tierColor?.primary,
          color: '#0A0E14',
          fontSize: '9px',
          fontWeight: 700,
        }}>
          {rule.approval_tier}
        </span>
      )}
    </div>
  );
}

/** Condition builder row - visual style */
function ConditionRowPremium({ condition, index, onChange, onRemove }: {
  condition: PolicyCondition;
  index: number;
  onChange: (index: number, updated: PolicyCondition) => void;
  onRemove: (index: number) => void;
}) {
  const preset = FIELD_PRESETS.find(f => f.field === condition.field);
  const fieldType = preset?.type || 'string';
  const ops = OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.string;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '40px 1fr 100px 1fr 32px',
      gap: '8px',
      alignItems: 'center',
      padding: '8px',
      background: 'rgba(10, 14, 20, 0.4)',
      border: '1px solid rgba(251, 191, 36, 0.15)',
      marginBottom: '6px',
    }}>
      {/* Index */}
      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        color: index === 0 ? '#fbbf24' : 'rgba(251, 191, 36, 0.5)',
        fontFamily: 'var(--font-mono)',
        textAlign: 'center',
      }}>
        {index === 0 ? 'IF' : 'AND'}
      </div>

      {/* Field */}
      <select
        value={condition.field}
        onChange={e => onChange(index, { ...condition, field: e.target.value })}
        style={{
          background: '#0A0E14',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          color: '#E6E1DC',
          padding: '6px 10px',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          outline: 'none',
        }}
      >
        <option value="">Select field...</option>
        {FIELD_PRESETS.map(f => (
          <option key={f.field} value={f.field}>{f.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={e => onChange(index, { ...condition, operator: e.target.value })}
        style={{
          background: '#0A0E14',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          color: '#fbbf24',
          padding: '6px 10px',
          fontSize: '13px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          outline: 'none',
          textAlign: 'center',
        }}
      >
        <option value="">Op</option>
        {ops.map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value */}
      <input
        type={fieldType === 'number' ? 'number' : 'text'}
        value={typeof condition.value === 'string' || typeof condition.value === 'number' ? String(condition.value) : ''}
        onChange={e => {
          let val: unknown = e.target.value;
          if (fieldType === 'number' && !isNaN(Number(val))) {
            val = Number(val);
          }
          onChange(index, { ...condition, value: val });
        }}
        placeholder={fieldType === 'number' ? '0' : 'value'}
        style={{
          background: '#0A0E14',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          color: '#E6E1DC',
          padding: '6px 10px',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          outline: 'none',
        }}
      />

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ef4444',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '4px',
        }}
      >
        ✕
      </button>
    </div>
  );
}

/** Rule card in grid view */
function RuleCardPremium({ rule, onEdit, onToggle, onDelete }: {
  rule: PolicyRule;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const tierColor = rule.approval_tier ? TIER_COLORS[rule.approval_tier as keyof typeof TIER_COLORS] : null;

  return (
    <div style={{
      background: rule.enabled ? 'rgba(10, 14, 20, 0.8)' : 'rgba(10, 14, 20, 0.4)',
      border: `1px solid ${rule.enabled ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.1)'}`,
      padding: '16px',
      position: 'relative',
      opacity: rule.enabled ? 1 : 0.6,
      transition: 'all 200ms',
      ...(tierColor && rule.enabled && {
        boxShadow: `0 0 16px ${tierColor.glow}, inset 0 0 60px ${tierColor.glow}15`,
      }),
    }}>
      {/* Top edge glow */}
      {rule.enabled && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: tierColor
            ? `linear-gradient(90deg, transparent, ${tierColor.primary}, transparent)`
            : 'linear-gradient(90deg, transparent, #fbbf24, transparent)',
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            color: rule.enabled ? '#fbbf24' : '#6b7280',
            marginBottom: '4px',
            fontFamily: 'var(--font-mono)',
          }}>
            {rule.name}
          </div>
          {rule.description && (
            <div style={{
              fontSize: '11px',
              color: 'rgba(230, 225, 220, 0.6)',
              marginBottom: '8px',
            }}>
              {rule.description}
            </div>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          style={{
            width: '32px',
            height: '18px',
            borderRadius: '9px',
            border: 'none',
            background: rule.enabled ? '#10b981' : 'rgba(107, 114, 128, 0.3)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
        >
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: '2px',
            left: rule.enabled ? '16px' : '2px',
            transition: 'left 150ms',
          }} />
        </button>
      </div>

      {/* Badge */}
      <div style={{ marginBottom: '12px' }}>
        <RuleBadge rule={rule} />
      </div>

      {/* Conditions summary */}
      <div style={{
        fontSize: '10px',
        color: 'rgba(251, 191, 36, 0.5)',
        marginBottom: '12px',
        fontFamily: 'var(--font-mono)',
      }}>
        {(!rule.conditions || rule.conditions.length === 0) ? (
          <span>MATCH ALL (catch-all)</span>
        ) : (
          <span>{(rule.conditions || []).length} condition{(rule.conditions || []).length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
        <button
          onClick={onEdit}
          style={{
            flex: 1,
            padding: '6px',
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#fbbf24',
            cursor: 'pointer',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
          }}
        >
          EDIT
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: '6px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ✕
        </button>
      </div>

      {/* Priority badge */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '48px',
        fontSize: '9px',
        fontWeight: 700,
        color: 'rgba(251, 191, 36, 0.4)',
        fontFamily: 'var(--font-mono)',
      }}>
        P{rule.priority}
      </div>
    </div>
  );
}

/** Rule builder modal - premium style */
function RuleBuilderPremium({ rule, onSave, onClose }: {
  rule: Partial<PolicyRule> | null;
  onSave: (payload: CreatePolicyPayload, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [conditions, setConditions] = useState<PolicyCondition[]>(
    rule?.conditions || []
  );
  const [action, setAction] = useState(rule?.action_on_match || 'require_approval');
  const [tier, setTier] = useState(rule?.approval_tier || 'T1');
  const [priority, setPriority] = useState(rule?.priority ?? 100);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        conditions: conditions.filter(c => c.field && c.operator),
        action_on_match: action,
        approval_tier: action === 'require_approval' ? tier : undefined,
        priority,
        required_approvers: [],
      }, rule?.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 14, 20, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        background: '#0F1419',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.08) 0%, transparent 100%)',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#fbbf24',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
          }}>
            {rule?.id ? '⚙ EDIT RULE' : '+ NEW RULE'}
          </div>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: '#fbbf24',
            fontSize: '18px',
            cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Name */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'rgba(251, 191, 36, 0.7)',
              marginBottom: '6px',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-mono)',
            }}>
              RULE NAME
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Wire Transfers > $10K Require Approval"
              style={{
                width: '100%',
                background: '#0A0E14',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                color: '#E6E1DC',
                padding: '10px 12px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'rgba(251, 191, 36, 0.7)',
              marginBottom: '6px',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-mono)',
            }}>
              DESCRIPTION (optional)
            </div>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this rule govern?"
              style={{
                width: '100%',
                background: '#0A0E14',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                color: '#E6E1DC',
                padding: '10px 12px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
          </div>

          {/* Conditions */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'rgba(251, 191, 36, 0.7)',
              marginBottom: '8px',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-mono)',
            }}>
              CONDITIONS (all must match)
            </div>
            {conditions.map((c, i) => (
              <ConditionRowPremium
                key={i}
                condition={c}
                index={i}
                onChange={(idx, updated) => {
                  const next = [...conditions];
                  next[idx] = updated;
                  setConditions(next);
                }}
                onRemove={idx => setConditions(conditions.filter((_, j) => j !== idx))}
              />
            ))}
            <button
              onClick={() => setConditions([...conditions, { field: '', operator: '', value: '' }])}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px dashed rgba(251, 191, 36, 0.3)',
                color: '#fbbf24',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}
            >
              + ADD CONDITION
            </button>
          </div>

          {/* Action */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'rgba(251, 191, 36, 0.7)',
              marginBottom: '8px',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-mono)',
            }}>
              ACTION
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {ACTION_TYPES.map(a => (
                <button
                  key={a.value}
                  onClick={() => setAction(a.value)}
                  style={{
                    padding: '10px',
                    background: action === a.value ? `${a.color}20` : 'rgba(10, 14, 20, 0.6)',
                    border: `1px solid ${action === a.value ? a.color : 'rgba(251, 191, 36, 0.2)'}`,
                    color: action === a.value ? a.color : '#6b7280',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    transition: 'all 150ms',
                  }}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tier (if approval) */}
          {action === 'require_approval' && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'rgba(251, 191, 36, 0.7)',
                marginBottom: '8px',
                letterSpacing: '0.1em',
                fontFamily: 'var(--font-mono)',
              }}>
                APPROVAL TIER
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {Object.keys(TIER_COLORS).map(t => {
                  const tc = TIER_COLORS[t as keyof typeof TIER_COLORS];
                  return (
                    <button
                      key={t}
                      onClick={() => setTier(t)}
                      style={{
                        padding: '10px',
                        background: tier === t ? `${tc.primary}20` : 'rgba(10, 14, 20, 0.6)',
                        border: `1px solid ${tier === t ? tc.primary : 'rgba(251, 191, 36, 0.2)'}`,
                        color: tier === t ? tc.primary : '#6b7280',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                        ...(tier === t && {
                          boxShadow: `0 0 12px ${tc.glow}`,
                        }),
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Priority */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'rgba(251, 191, 36, 0.7)',
              marginBottom: '6px',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-mono)',
            }}>
              PRIORITY (higher = evaluated first)
            </div>
            <input
              type="number"
              value={priority}
              onChange={e => setPriority(parseInt(e.target.value) || 0)}
              min={0}
              max={9999}
              style={{
                width: '120px',
                background: '#0A0E14',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                color: '#E6E1DC',
                padding: '10px 12px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'rgba(107, 114, 128, 0.2)',
                border: '1px solid rgba(107, 114, 128, 0.4)',
                color: '#9ca3af',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              style={{
                padding: '10px 20px',
                background: saving || !name.trim() ? 'rgba(251, 191, 36, 0.2)' : '#f59e0b',
                border: '1px solid #f59e0b',
                color: saving || !name.trim() ? '#6b7280' : '#0A0E14',
                cursor: saving || !name.trim() ? 'default' : 'pointer',
                fontWeight: 700,
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {saving ? 'SAVING...' : rule?.id ? 'UPDATE RULE' : 'CREATE RULE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SIMULATOR PANEL — Coverage + Conflict Detection
// ============================================================================

function SimulatorPanel() {
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [conflicts, setConflicts] = useState<ConflictsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPolicyCoverage().catch(() => null),
      getPolicyConflicts().catch(() => null),
    ]).then(([cov, conf]) => {
      setCoverage(cov);
      setConflicts(conf);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(251, 191, 36, 0.5)', fontFamily: 'var(--font-mono)' }}>
        ⚡ ANALYZING POLICIES...
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {/* Coverage Analysis */}
      <div style={{ background: 'rgba(10, 14, 20, 0.6)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '20px' }}>
        <h3 style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontSize: '14px', margin: '0 0 16px' }}>
          🎯 COVERAGE ANALYSIS
        </h3>
        {coverage ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: `conic-gradient(#10b981 ${coverage.coverage_percentage}%, rgba(255,255,255,0.1) 0)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%', background: '#0A0E14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#10b981', fontWeight: 700, fontSize: '18px', fontFamily: 'var(--font-mono)',
                }}>
                  {coverage.coverage_percentage}%
                </div>
              </div>
              <div>
                <div style={{ color: '#e6e1dc', fontSize: '13px' }}>
                  {coverage.covered_count}/{coverage.total_action_types} action types covered
                </div>
              </div>
            </div>
            {coverage.uncovered.length > 0 && (
              <div>
                <div style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                  ⚠ UNCOVERED ACTION TYPES:
                </div>
                {coverage.uncovered.map(at => (
                  <span key={at} style={{
                    display: 'inline-block', padding: '3px 8px', margin: '2px',
                    background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444', fontSize: '10px', fontFamily: 'var(--font-mono)',
                  }}>
                    {at}
                  </span>
                ))}
              </div>
            )}
            {coverage.uncovered.length === 0 && (
              <div style={{ color: '#10b981', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                ✓ ALL ACTION TYPES COVERED
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'rgba(230, 225, 220, 0.4)', fontSize: '12px' }}>Unable to load coverage data</div>
        )}
      </div>

      {/* Conflict Detection */}
      <div style={{ background: 'rgba(10, 14, 20, 0.6)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '20px' }}>
        <h3 style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontSize: '14px', margin: '0 0 16px' }}>
          ⚡ CONFLICT DETECTION
        </h3>
        {conflicts ? (
          <>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              {[
                { label: 'HIGH', count: conflicts.high, color: '#ef4444' },
                { label: 'MED', count: conflicts.medium, color: '#f59e0b' },
                { label: 'LOW', count: conflicts.low, color: '#6b7280' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.count}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(230, 225, 220, 0.5)', fontFamily: 'var(--font-mono)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {conflicts.conflicts.length === 0 ? (
              <div style={{ color: '#10b981', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>✓ NO CONFLICTS DETECTED</div>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {conflicts.conflicts.slice(0, 10).map((c, i) => (
                  <div key={i} style={{
                    padding: '8px', marginBottom: '4px',
                    background: c.severity === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.05)',
                    border: `1px solid ${c.severity === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.15)'}`,
                    fontSize: '11px', color: '#e6e1dc',
                  }}>
                    <span style={{ color: c.severity === 'high' ? '#ef4444' : '#f59e0b', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      [{c.severity.toUpperCase()}]
                    </span>{' '}
                    {c.description}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'rgba(230, 225, 220, 0.4)', fontSize: '12px' }}>Unable to load conflict data</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AUDIT PANEL — Effectiveness Metrics
// ============================================================================

function AuditPanel() {
  const [effectiveness, setEffectiveness] = useState<EffectivenessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    getPolicyEffectiveness(days)
      .then(setEffectiveness)
      .catch(() => setEffectiveness(null))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(251, 191, 36, 0.5)', fontFamily: 'var(--font-mono)' }}>
        ⚡ LOADING AUDIT DATA...
      </div>
    );
  }

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[7, 14, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: '6px 14px',
              background: days === d ? 'rgba(251, 191, 36, 0.2)' : 'rgba(10, 14, 20, 0.6)',
              border: `1px solid ${days === d ? '#fbbf24' : 'rgba(251, 191, 36, 0.2)'}`,
              color: days === d ? '#fbbf24' : '#6b7280',
              cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)',
            }}
          >
            {d}D
          </button>
        ))}
      </div>

      {effectiveness ? (
        <>
          {/* Summary */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px',
          }}>
            <div style={{ background: 'rgba(10, 14, 20, 0.6)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                {effectiveness.policies_evaluated}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(230, 225, 220, 0.5)', fontFamily: 'var(--font-mono)' }}>EVALUATED</div>
            </div>
            <div style={{ background: 'rgba(10, 14, 20, 0.6)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                {effectiveness.effectiveness.reduce((a, e) => a + e.total_evaluations, 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(230, 225, 220, 0.5)', fontFamily: 'var(--font-mono)' }}>TOTAL EVALUATIONS</div>
            </div>
            <div style={{ background: 'rgba(10, 14, 20, 0.6)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                {effectiveness.never_triggered.length}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(230, 225, 220, 0.5)', fontFamily: 'var(--font-mono)' }}>NEVER TRIGGERED</div>
            </div>
          </div>

          {/* Per-policy effectiveness */}
          {effectiveness.effectiveness.length > 0 && (
            <div style={{ background: 'rgba(10, 14, 20, 0.6)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '16px' }}>
              <h3 style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontSize: '13px', margin: '0 0 12px' }}>
                POLICY PERFORMANCE
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    {['POLICY', 'EVALS', 'ALLOW', 'DENY', 'DENIAL %'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '8px', fontSize: '10px', fontWeight: 700,
                        color: 'rgba(230, 225, 220, 0.5)', fontFamily: 'var(--font-mono)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {effectiveness.effectiveness.map(e => (
                    <tr key={e.policy_id} style={{ borderBottom: '1px solid rgba(251, 191, 36, 0.05)' }}>
                      <td style={{ padding: '8px', fontSize: '12px', color: '#e6e1dc', fontFamily: 'var(--font-mono)' }}>
                        {e.policy_name}
                      </td>
                      <td style={{ padding: '8px', fontSize: '12px', color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                        {e.total_evaluations}
                      </td>
                      <td style={{ padding: '8px', fontSize: '12px', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                        {e.allows}
                      </td>
                      <td style={{ padding: '8px', fontSize: '12px', color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                        {e.denials}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${e.denial_rate}%`, height: '100%',
                              background: e.denial_rate > 50 ? '#ef4444' : e.denial_rate > 20 ? '#f59e0b' : '#10b981',
                            }} />
                          </div>
                          <span style={{ fontSize: '11px', color: '#e6e1dc', fontFamily: 'var(--font-mono)' }}>
                            {e.denial_rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Never triggered warning */}
          {effectiveness.never_triggered.length > 0 && (
            <div style={{
              marginTop: '12px', padding: '12px',
              background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <div style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                ⚠ NEVER TRIGGERED ({effectiveness.never_triggered.length} policies):
              </div>
              {effectiveness.never_triggered.map(p => (
                <span key={p.id} style={{
                  display: 'inline-block', padding: '3px 8px', margin: '2px',
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444', fontSize: '10px', fontFamily: 'var(--font-mono)',
                }}>
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(230, 225, 220, 0.4)', fontSize: '12px' }}>
          Unable to load effectiveness data
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function PolicyBuilderPremium() {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('builder');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<PolicyRule | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const data = await listPolicies();
      setRules(Array.isArray(data) ? data : []);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleSave = async (payload: CreatePolicyPayload, id?: string) => {
    if (id) {
      await updatePolicy(id, payload);
    } else {
      await createPolicy(payload);
    }
    setShowBuilder(false);
    setEditingRule(null);
    await fetchRules();
  };

  const handleToggle = async (rule: PolicyRule) => {
    await togglePolicy(rule.id);
    await fetchRules();
  };

  const handleDelete = async (rule: PolicyRule) => {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    await deletePolicy(rule.id);
    await fetchRules();
  };

  const handleEdit = (rule: PolicyRule) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  // Stats
  const totalRules = rules.length;
  const activeRules = rules.filter(r => r.enabled).length;
  const t0Rules = rules.filter(r => r.approval_tier === 'T0' && r.enabled).length;
  const t1Rules = rules.filter(r => r.approval_tier === 'T1' && r.enabled).length;
  const t2Rules = rules.filter(r => r.approval_tier === 'T2' && r.enabled).length;

  return (
    <PageLayout
      title=""
      description=""
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.1) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#fbbf24',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.02em',
            }}>
              ⚡ POLICY BUILDER
            </h1>
            <div style={{
              fontSize: '12px',
              color: 'rgba(230, 225, 220, 0.6)',
              marginTop: '4px',
            }}>
              Mission control for governance rules
            </div>
          </div>

          <button
            onClick={() => { setEditingRule(null); setShowBuilder(true); }}
            style={{
              padding: '10px 20px',
              background: '#f59e0b',
              border: '1px solid #f59e0b',
              color: '#0A0E14',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
            }}
          >
            + NEW RULE
          </button>
        </div>

        {/* Metrics row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          marginTop: '20px',
        }}>
          <MetricCard label="TOTAL RULES" value={totalRules} sparkline={[4, 7, 5, 9, 12, 15, totalRules]} />
          <MetricCard label="ACTIVE" value={activeRules} trend="up" />
          <MetricCard label="T0 AUTO" value={t0Rules} />
          <MetricCard label="T1 SINGLE" value={t1Rules} />
          <MetricCard label="T2 MULTI" value={t2Rules} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '20px',
        borderBottom: '1px solid rgba(251, 191, 36, 0.1)',
      }}>
        {[
          { id: 'builder' as Tab, label: '🛡️ RULES', count: totalRules },
          { id: 'simulator' as Tab, label: '🧪 SIMULATOR' },
          { id: 'audit' as Tab, label: '📊 AUDIT' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              background: activeTab === tab.id ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #fbbf24' : '2px solid transparent',
              color: activeTab === tab.id ? '#fbbf24' : '#6b7280',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                marginLeft: '6px',
                padding: '2px 6px',
                background: 'rgba(251, 191, 36, 0.2)',
                borderRadius: '8px',
                fontSize: '10px',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Builder tab */}
      {activeTab === 'builder' && (
        <>
          {/* View controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '16px',
            gap: '8px',
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px',
                background: viewMode === 'grid' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(10, 14, 20, 0.6)',
                border: `1px solid ${viewMode === 'grid' ? '#fbbf24' : 'rgba(251, 191, 36, 0.2)'}`,
                color: viewMode === 'grid' ? '#fbbf24' : '#6b7280',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}
            >
              GRID
            </button>
            <button
              onClick={() => setViewMode('flow')}
              style={{
                padding: '6px 12px',
                background: viewMode === 'flow' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(10, 14, 20, 0.6)',
                border: `1px solid ${viewMode === 'flow' ? '#fbbf24' : 'rgba(251, 191, 36, 0.2)'}`,
                color: viewMode === 'flow' ? '#fbbf24' : '#6b7280',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}
            >
              FLOW
            </button>
          </div>

          {loading ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              color: 'rgba(251, 191, 36, 0.5)',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
            }}>
              ⚡ LOADING RULES...
            </div>
          ) : rules.length === 0 ? (
            <div style={{
              background: 'rgba(10, 14, 20, 0.6)',
              border: '1px dashed rgba(251, 191, 36, 0.3)',
              padding: '60px 40px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛡️</div>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#fbbf24',
                marginBottom: '8px',
                fontFamily: 'var(--font-mono)',
              }}>
                NO RULES YET
              </div>
              <div style={{
                fontSize: '12px',
                color: 'rgba(230, 225, 220, 0.6)',
                marginBottom: '20px',
              }}>
                Create your first governance rule to control what agents can do
              </div>
              <button
                onClick={() => { setEditingRule(null); setShowBuilder(true); }}
                style={{
                  padding: '12px 24px',
                  background: '#f59e0b',
                  border: '1px solid #f59e0b',
                  color: '#0A0E14',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                + CREATE FIRST RULE
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
              gap: '12px',
            }}>
              {rules.map(rule => (
                <RuleCardPremium
                  key={rule.id}
                  rule={rule}
                  onEdit={() => handleEdit(rule)}
                  onToggle={() => handleToggle(rule)}
                  onDelete={() => handleDelete(rule)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Simulator tab — Coverage + Conflict detection */}
      {activeTab === 'simulator' && (
        <SimulatorPanel />
      )}

      {/* Audit tab — Effectiveness metrics */}
      {activeTab === 'audit' && (
        <AuditPanel />
      )}

      {/* Rule builder modal */}
      {showBuilder && (
        <RuleBuilderPremium
          rule={editingRule}
          onSave={handleSave}
          onClose={() => { setShowBuilder(false); setEditingRule(null); }}
        />
      )}
    </PageLayout>
  );
}
