/**
 * Policy Builder Page — Vienna OS
 * 
 * Visual governance policy builder. The feature a CISO shows their board.
 * 
 * Three views:
 * A. Rule List — sortable table of all rules
 * B. Rule Builder — visual condition/action editor with test panel
 * C. Template Library — pre-built industry templates
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
  type ConditionDetail,
  getPolicyVersions,
  revertPolicy,
  type PolicyVersion,
} from '../api/policies.js';

// ============================================================================
// Constants
// ============================================================================

const FIELD_OPTIONS = [
  { value: 'action_type', label: 'Action Type', type: 'string' },
  { value: 'agent_id', label: 'Agent ID', type: 'string' },
  { value: 'amount', label: 'Amount', type: 'number' },
  { value: 'environment', label: 'Environment', type: 'string' },
  { value: 'time_of_day', label: 'Time of Day', type: 'time' },
  { value: 'day_of_week', label: 'Day of Week', type: 'string' },
  { value: 'source_ip', label: 'Source IP', type: 'string' },
  { value: 'risk_score', label: 'Risk Score', type: 'number' },
  { value: 'resource_type', label: 'Resource Type', type: 'string' },
  { value: 'custom', label: 'Custom Field…', type: 'custom' },
];

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  string: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '≠' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'not contains' },
    { value: 'in', label: 'in list' },
    { value: 'not_in', label: 'not in list' },
    { value: 'matches', label: 'regex' },
    { value: 'exists', label: 'exists' },
    { value: 'not_exists', label: 'not exists' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'between', label: 'between' },
    { value: 'exists', label: 'exists' },
  ],
  time: [
    { value: 'time_between', label: 'between' },
    { value: 'equals', label: '=' },
  ],
  custom: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '≠' },
    { value: 'contains', label: 'contains' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'in', label: 'in list' },
    { value: 'exists', label: 'exists' },
  ],
};

const ACTION_OPTIONS = [
  { value: 'allow', label: 'Allow', color: '#4ade80', icon: '✅' },
  { value: 'deny', label: 'Deny', color: '#f87171', icon: '🚫' },
  { value: 'require_approval', label: 'Require Approval', color: '#fbbf24', icon: '⏳' },
  { value: 'flag_for_review', label: 'Flag for Review', color: '#60a5fa', icon: '🔍' },
  { value: 'rate_limit', label: 'Rate Limit', color: '#c084fc', icon: '⏱️' },
  { value: 'escalate', label: 'Escalate', color: '#fb923c', icon: '🔺' },
];

const TIER_OPTIONS = [
  { value: 'T0', label: 'T0 — Auto-approved' },
  { value: 'T1', label: 'T1 — Single approver' },
  { value: 'T2', label: 'T2 — Multi-party' },
];

const DEFAULT_MOCK_INTENT = `{
  "action_type": "wire_transfer",
  "agent_id": "agent-001",
  "amount": 15000,
  "environment": "production",
  "risk_score": 65,
  "resource_type": "financial",
  "source_ip": "10.0.1.50"
}`;

// ============================================================================
// Styles
// ============================================================================

const styles = {
  card: {
    background: '#12131a',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '20px',
  } as React.CSSProperties,
  input: {
    background: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    width: '100%',
  } as React.CSSProperties,
  select: {
    background: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: '30px',
  } as React.CSSProperties,
  btn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    transition: 'all 150ms',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  } as React.CSSProperties,
  btnPrimary: {
    background: '#3b82f6',
    color: '#fff',
  } as React.CSSProperties,
  btnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  btnDanger: {
    background: 'rgba(248,113,113,0.1)',
    color: '#f87171',
  } as React.CSSProperties,
  btnGhost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    padding: '6px 10px',
  } as React.CSSProperties,
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    display: 'block',
  } as React.CSSProperties,
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'var(--font-mono, monospace)',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-secondary)',
    gap: '4px',
  } as React.CSSProperties,
  textarea: {
    background: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    padding: '12px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono, monospace)',
    outline: 'none',
    width: '100%',
    resize: 'vertical' as const,
    minHeight: '120px',
    lineHeight: '1.5',
  } as React.CSSProperties,
};

// ============================================================================
// Sub-components
// ============================================================================

/** Status toggle switch */
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        border: 'none',
        background: checked ? '#4ade80' : 'rgba(255,255,255,0.1)',
        position: 'relative',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 150ms',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <div style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: '2px',
        left: checked ? '18px' : '2px',
        transition: 'left 150ms',
      }} />
    </button>
  );
}

/** Action badge */
function ActionBadge({ action }: { action: string }) {
  const opt = ACTION_OPTIONS.find(a => a.value === action);
  if (!opt) return <span style={styles.chip}>{action}</span>;
  return (
    <span style={{
      ...styles.chip,
      background: `${opt.color}15`,
      color: opt.color,
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
    }}>
      {opt.icon} {opt.label}
    </span>
  );
}

/** Condition chips display */
function ConditionChips({ conditions }: { conditions: PolicyCondition[] }) {
  if (!conditions || conditions.length === 0) {
    return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No conditions (catch-all)</span>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {conditions.slice(0, 3).map((c, i) => (
        <span key={i} style={styles.chip}>
          {c.field} {c.operator} {JSON.stringify(c.value)}
        </span>
      ))}
      {conditions.length > 3 && (
        <span style={{ ...styles.chip, color: '#60a5fa' }}>+{conditions.length - 3} more</span>
      )}
    </div>
  );
}

/** Empty state */
function EmptyState({ icon, title, description, action }: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      ...styles.card,
      textAlign: 'center',
      padding: '48px 32px',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>{title}</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>{description}</p>
      {action}
    </div>
  );
}

// ============================================================================
// Condition Builder Row
// ============================================================================

interface ConditionRowProps {
  condition: PolicyCondition;
  index: number;
  onChange: (index: number, condition: PolicyCondition) => void;
  onRemove: (index: number) => void;
  customFieldName?: string;
  onCustomFieldChange?: (index: number, name: string) => void;
}

function ConditionRow({ condition, index, onChange, onRemove }: ConditionRowProps) {
  const fieldDef = FIELD_OPTIONS.find(f => f.value === condition.field) ||
    (condition.field ? { value: condition.field, label: condition.field, type: 'custom' } : FIELD_OPTIONS[0]);
  const fieldType = fieldDef.type;
  const operators = OPERATORS_BY_TYPE[fieldType] || OPERATORS_BY_TYPE.string;
  const isCustom = !FIELD_OPTIONS.find(f => f.value === condition.field);

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      padding: '8px 0',
    }}>
      {/* Index */}
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '24px', textAlign: 'center', flexShrink: 0 }}>
        {index > 0 ? 'AND' : 'IF'}
      </span>

      {/* Field */}
      <div style={{ flex: '0 0 160px' }}>
        {isCustom ? (
          <input
            style={{ ...styles.input, width: '100%' }}
            value={condition.field}
            onChange={e => onChange(index, { ...condition, field: e.target.value })}
            placeholder="custom.field"
          />
        ) : (
          <select
            style={{ ...styles.select, width: '100%' }}
            value={condition.field || ''}
            onChange={e => {
              const val = e.target.value;
              if (val === 'custom') {
                onChange(index, { ...condition, field: 'custom.' });
              } else {
                onChange(index, { ...condition, field: val });
              }
            }}
          >
            <option value="">Select field…</option>
            {FIELD_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Operator */}
      <div style={{ flex: '0 0 130px' }}>
        <select
          style={{ ...styles.select, width: '100%' }}
          value={condition.operator || ''}
          onChange={e => onChange(index, { ...condition, operator: e.target.value })}
        >
          <option value="">Operator…</option>
          {operators.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </div>

      {/* Value */}
      <div style={{ flex: 1, minWidth: '120px' }}>
        {(condition.operator === 'exists' || condition.operator === 'not_exists') ? (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }}>—</span>
        ) : condition.operator === 'between' || condition.operator === 'time_between' ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input
              style={{ ...styles.input, width: '45%' }}
              value={Array.isArray(condition.value) ? String(condition.value[0] ?? '') : ''}
              onChange={e => {
                const arr = Array.isArray(condition.value) ? [...condition.value] : ['', ''];
                arr[0] = e.target.value;
                onChange(index, { ...condition, value: arr });
              }}
              placeholder={condition.operator === 'time_between' ? 'HH:MM' : 'min'}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
            <input
              style={{ ...styles.input, width: '45%' }}
              value={Array.isArray(condition.value) ? String(condition.value[1] ?? '') : ''}
              onChange={e => {
                const arr = Array.isArray(condition.value) ? [...condition.value] : ['', ''];
                arr[1] = e.target.value;
                onChange(index, { ...condition, value: arr });
              }}
              placeholder={condition.operator === 'time_between' ? 'HH:MM' : 'max'}
            />
          </div>
        ) : (
          <input
            style={styles.input}
            value={typeof condition.value === 'string' || typeof condition.value === 'number'
              ? String(condition.value)
              : Array.isArray(condition.value)
                ? condition.value.join(', ')
                : ''}
            onChange={e => {
              let val: unknown = e.target.value;
              // Auto-coerce to number for numeric operators
              if (['gt', 'gte', 'lt', 'lte'].includes(condition.operator) && !isNaN(Number(val))) {
                val = Number(val);
              }
              // Convert comma-separated to array for in/not_in
              if (['in', 'not_in'].includes(condition.operator)) {
                val = String(val).split(',').map(s => s.trim());
              }
              onChange(index, { ...condition, value: val });
            }}
            placeholder={
              ['in', 'not_in'].includes(condition.operator) ? 'val1, val2, val3' :
              fieldType === 'number' ? '0' :
              fieldType === 'time' ? 'HH:MM' :
              'value'
            }
          />
        )}
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        style={{
          ...styles.btn,
          ...styles.btnGhost,
          color: '#f87171',
          padding: '4px 8px',
          fontSize: '16px',
          flexShrink: 0,
        }}
        title="Remove condition"
      >
        ×
      </button>
    </div>
  );
}

// ============================================================================
// Rule Builder Modal
// ============================================================================

interface RuleBuilderProps {
  rule: Partial<PolicyRule> | null;
  onSave: (payload: CreatePolicyPayload, id?: string) => Promise<void>;
  onClose: () => void;
}

function RuleBuilder({ rule, onSave, onClose }: RuleBuilderProps) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [conditions, setConditions] = useState<PolicyCondition[]>(
    rule?.conditions || [{ field: '', operator: '', value: '' }]
  );
  const [action, setAction] = useState(rule?.action_on_match || 'require_approval');
  const [tier, setTier] = useState(rule?.approval_tier || 'T1');
  const [approvers, setApprovers] = useState((rule?.required_approvers || []).join(', '));
  const [priority, setPriority] = useState(rule?.priority ?? 100);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Test panel state
  const [testJson, setTestJson] = useState(DEFAULT_MOCK_INTENT);
  const [testResult, setTestResult] = useState<FullEvaluationResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');

  const handleConditionChange = (index: number, updated: PolicyCondition) => {
    const next = [...conditions];
    next[index] = updated;
    setConditions(next);
  };

  const handleConditionRemove = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleAddCondition = () => {
    setConditions([...conditions, { field: '', operator: '', value: '' }]);
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }

    // Filter out empty conditions
    const validConditions = conditions.filter(c => c.field && c.operator);

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        conditions: validConditions,
        action_on_match: action,
        approval_tier: action === 'require_approval' ? tier : undefined,
        required_approvers: approvers ? approvers.split(',').map(s => s.trim()).filter(Boolean) : [],
        priority,
      }, rule?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestError('');
    setTestResult(null);
    setTesting(true);
    try {
      const context = JSON.parse(testJson);
      const result = await evaluatePolicy(context);
      setTestResult(result);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#12131a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '1100px',
        maxHeight: '90vh',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {rule?.id ? 'Edit Policy Rule' : 'New Policy Rule'}
          </h2>
          <button onClick={onClose} style={{ ...styles.btn, ...styles.btnGhost, fontSize: '18px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'auto' }}>
          {/* Left: Builder */}
          <div style={{ flex: '1 1 60%', padding: '24px', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Name + Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={styles.label}>Rule Name *</label>
              <input
                style={styles.input}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Wire Transfers > $10K Require Multi-Party Approval"
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={styles.label}>Description</label>
              <input
                style={styles.input}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description of what this rule governs"
              />
            </div>

            {/* Conditions */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ ...styles.label, marginBottom: 0 }}>Conditions</label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>All conditions must match (AND)</span>
              </div>
              <div style={{
                background: '#0a0a0f',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '12px',
              }}>
                {conditions.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0' }}>
                    No conditions — this rule will match all intents (catch-all)
                  </p>
                ) : (
                  conditions.map((c, i) => (
                    <ConditionRow
                      key={i}
                      condition={c}
                      index={i}
                      onChange={handleConditionChange}
                      onRemove={handleConditionRemove}
                    />
                  ))
                )}
                <button
                  onClick={handleAddCondition}
                  style={{ ...styles.btn, ...styles.btnSecondary, marginTop: '8px', fontSize: '12px' }}
                >
                  + Add Condition
                </button>
              </div>
            </div>

            {/* Action */}
            <div style={{ marginBottom: '24px' }}>
              <label style={styles.label}>Action When Matched</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ACTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAction(opt.value)}
                    style={{
                      ...styles.btn,
                      background: action === opt.value ? `${opt.color}20` : 'rgba(255,255,255,0.04)',
                      color: action === opt.value ? opt.color : '#9ca3af',
                      border: `1px solid ${action === opt.value ? `${opt.color}40` : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Approval Tier (conditional) */}
            {action === 'require_approval' && (
              <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Approval Tier</label>
                  <select
                    style={{ ...styles.select, width: '100%' }}
                    value={tier}
                    onChange={e => setTier(e.target.value)}
                  >
                    {TIER_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Required Approvers (optional)</label>
                  <input
                    style={styles.input}
                    value={approvers}
                    onChange={e => setApprovers(e.target.value)}
                    placeholder="operator-1, operator-2"
                  />
                </div>
              </div>
            )}

            {/* Priority */}
            <div style={{ marginBottom: '24px' }}>
              <label style={styles.label}>Priority (higher = evaluated first)</label>
              <input
                style={{ ...styles.input, width: '120px' }}
                type="number"
                value={priority}
                onChange={e => setPriority(parseInt(e.target.value) || 0)}
                min={0}
                max={9999}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: '6px',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            {/* Save */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ ...styles.btn, ...styles.btnSecondary }}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ ...styles.btn, ...styles.btnPrimary, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : (rule?.id ? 'Update Rule' : 'Create Rule')}
              </button>
            </div>
          </div>

          {/* Right: Test Panel */}
          <div style={{ flex: '0 0 40%', padding: '24px', overflowY: 'auto', background: '#0a0a0f' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
              🧪 Test Policy Rules
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
              Enter a mock intent to test against <strong>all active rules</strong>:
            </p>

            <textarea
              style={styles.textarea}
              value={testJson}
              onChange={e => setTestJson(e.target.value)}
              spellCheck={false}
            />

            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                ...styles.btn,
                ...styles.btnPrimary,
                width: '100%',
                justifyContent: 'center',
                marginTop: '12px',
                opacity: testing ? 0.6 : 1,
              }}
            >
              {testing ? 'Evaluating…' : '▶ Run Test'}
            </button>

            {testError && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(248,113,113,0.1)',
                borderRadius: '6px',
                color: '#f87171',
                fontSize: '12px',
              }}>
                {testError}
              </div>
            )}

            {testResult && (
              <div style={{ marginTop: '16px' }}>
                {/* Result summary */}
                <div style={{
                  padding: '12px',
                  background: testResult.matched_rule
                    ? `${ACTION_OPTIONS.find(a => a.value === testResult.matched_rule!.action)?.color || '#fbbf24'}15`
                    : 'rgba(74,222,128,0.1)',
                  border: `1px solid ${testResult.matched_rule
                    ? `${ACTION_OPTIONS.find(a => a.value === testResult.matched_rule!.action)?.color || '#fbbf24'}30`
                    : 'rgba(74,222,128,0.2)'}`,
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {testResult.matched_rule
                      ? `⚡ Rule Matched: ${testResult.matched_rule.rule_name}`
                      : '✅ No Rule Matched — Default Action Applied'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Action: <ActionBadge action={testResult.matched_rule?.action || testResult.default_action} />
                    {testResult.matched_rule?.approval_tier && (
                      <span style={{ marginLeft: '8px' }}>Tier: {testResult.matched_rule.approval_tier}</span>
                    )}
                  </div>
                </div>

                {/* Condition-by-condition breakdown */}
                {testResult.all_results.map((r, i) => (
                  <div key={i} style={{
                    padding: '10px 12px',
                    background: '#12131a',
                    borderRadius: '6px',
                    marginBottom: '6px',
                    border: `1px solid ${r.matched ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: r.conditions_detail.length > 0 ? '6px' : 0,
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: r.matched ? '#4ade80' : '#9ca3af' }}>
                        {r.matched ? '✅' : '○'} {r.rule_name}
                      </span>
                      <ActionBadge action={r.action} />
                    </div>
                    {r.conditions_detail.length > 0 && (
                      <div style={{ paddingLeft: '20px' }}>
                        {r.conditions_detail.map((cd, j) => (
                          <div key={j} style={{
                            fontSize: '11px',
                            color: cd.passed ? '#4ade80' : '#f87171',
                            fontFamily: 'var(--font-mono, monospace)',
                            padding: '2px 0',
                          }}>
                            {cd.passed ? '✓' : '✗'} {cd.field} {cd.operator} {JSON.stringify(cd.expected)}
                            <span style={{ color: 'var(--text-muted)' }}> (actual: {JSON.stringify(cd.actual)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Template Library Modal
// ============================================================================

function TemplateLibrary({ templates, onImport, onClose }: {
  templates: PolicyTemplate[];
  onImport: (template: PolicyTemplate) => Promise<void>;
  onClose: () => void;
}) {
  const [importing, setImporting] = useState<string | null>(null);

  const handleImport = async (tpl: PolicyTemplate) => {
    setImporting(tpl.id);
    try {
      await onImport(tpl);
    } finally {
      setImporting(null);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#12131a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            📋 Industry Templates
          </h2>
          <button onClick={onClose} style={{ ...styles.btn, ...styles.btnGhost, fontSize: '18px' }}>×</button>
        </div>

        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
            Import pre-built governance rules for common industries. Rules are created as disabled for review before activation.
          </p>

          {templates.map(tpl => (
            <div key={tpl.id} style={{
              ...styles.card,
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  {tpl.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                  {tpl.description}
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {tpl.rules.map((r, i) => (
                    <span key={i} style={styles.chip}>{r.name}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleImport(tpl)}
                disabled={importing === tpl.id}
                style={{
                  ...styles.btn,
                  ...styles.btnPrimary,
                  marginLeft: '16px',
                  flexShrink: 0,
                  opacity: importing === tpl.id ? 0.6 : 1,
                }}
              >
                {importing === tpl.id ? 'Importing…' : `Import ${tpl.rules.length} rules`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Audit Trail Tab
// ============================================================================

function AuditTrailView() {
  const [evaluations, setEvaluations] = useState<PolicyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await listEvaluations({ limit: 50 });
        setEvaluations(data);
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading evaluations…</div>;
  }

  if (evaluations.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No Evaluations Yet"
        description="Policy evaluations will appear here as rules are tested or triggered."
      />
    );
  }

  return (
    <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Time', 'Rule', 'Agent', 'Action Type', 'Result', 'Action Taken'].map(h => (
              <th key={h} style={{
                padding: '10px 14px',
                textAlign: 'left',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {evaluations.map(ev => (
            <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td style={{ padding: '8px 14px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono, monospace)' }}>
                {new Date(ev.evaluated_at).toLocaleString()}
              </td>
              <td style={{ padding: '8px 14px', color: 'var(--text-primary)' }}>{ev.rule_name || ev.rule_id?.slice(0, 8) || '—'}</td>
              <td style={{ padding: '8px 14px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono, monospace)' }}>{ev.agent_id || '—'}</td>
              <td style={{ padding: '8px 14px', color: 'var(--text-secondary)' }}>{ev.action_type || '—'}</td>
              <td style={{ padding: '8px 14px' }}>
                <span style={{
                  ...styles.chip,
                  background: ev.result === 'matched' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                  color: ev.result === 'matched' ? '#4ade80' : '#9ca3af',
                }}>{ev.result}</span>
              </td>
              <td style={{ padding: '8px 14px' }}>
                {ev.action_taken ? <ActionBadge action={ev.action_taken} /> : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

type Tab = 'rules' | 'audit';

// ============================================================================
// Version History Modal (P2)
// ============================================================================

function VersionHistoryModal({ rule, onRevert, onClose }: {
  rule: PolicyRule;
  onRevert: (version: number) => void;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPolicyVersions(rule.id)
      .then(v => setVersions(v))
      .catch(() => {
        // Build a synthetic version from current rule if API not available
        setVersions([{
          version: rule.version || 1,
          name: rule.name,
          conditions: rule.conditions,
          action_on_match: rule.action_on_match,
          approval_tier: rule.approval_tier,
          enabled: rule.enabled,
          updated_at: rule.updated_at,
          updated_by: rule.created_by,
        }]);
      })
      .finally(() => setLoading(false));
  }, [rule.id]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--bg-primary, #12131a)', borderRadius: '12px',
        border: '1px solid var(--border-subtle)', width: '500px', maxWidth: '90vw',
        maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              🕐 Version History
            </h3>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {rule.name} — v{rule.version || 1}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', fontSize: '14px',
          }}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
              Loading version history...
            </div>
          ) : versions.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
              No version history available. Changes will be tracked from now on.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {versions.map((v, i) => {
                const isCurrent = v.version === (rule.version || 1);
                return (
                  <div key={v.version} style={{
                    padding: '12px 14px', borderRadius: '8px',
                    background: isCurrent ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isCurrent ? 'rgba(124,58,237,0.2)' : 'var(--border-subtle)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                          color: isCurrent ? '#a78bfa' : 'var(--text-secondary)',
                        }}>
                          v{v.version}
                        </span>
                        {isCurrent && (
                          <span style={{
                            fontSize: '9px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px',
                            background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                          }}>
                            CURRENT
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{v.name}</span>
                      </div>
                      {!isCurrent && (
                        <button
                          onClick={() => { if (confirm(`Revert to v${v.version}?`)) onRevert(v.version); }}
                          style={{
                            padding: '3px 8px', fontSize: '10px', borderRadius: '4px',
                            border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)',
                            color: '#f59e0b', cursor: 'pointer', fontWeight: 500,
                          }}
                        >
                          Revert
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                      {new Date(v.updated_at).toLocaleString()} · {v.updated_by}
                      {' · '}{v.conditions.length} condition{v.conditions.length !== 1 ? 's' : ''}
                      {' · '}{v.enabled ? '✅ enabled' : '⏸ disabled'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PolicyBuilderPage() {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<PolicyRule | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [versionHistoryRule, setVersionHistoryRule] = useState<PolicyRule | null>(null);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const data = await listPolicies(searchQuery ? { search: searchQuery } : undefined);
      setRules(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleSaveRule = async (payload: CreatePolicyPayload, id?: string) => {
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
    setTogglingId(rule.id);
    try {
      await togglePolicy(rule.id);
      await fetchRules();
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (rule: PolicyRule) => {
    if (!confirm(`Disable rule "${rule.name}"?`)) return;
    await deletePolicy(rule.id);
    await fetchRules();
  };

  const handleDuplicate = async (rule: PolicyRule) => {
    await duplicatePolicy(rule.id);
    await fetchRules();
  };

  const handleEdit = (rule: PolicyRule) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  const handleImportTemplate = async (tpl: PolicyTemplate) => {
    for (const r of tpl.rules) {
      await createPolicy({
        name: r.name,
        conditions: r.conditions,
        action_on_match: r.action_on_match,
        approval_tier: r.approval_tier,
        required_approvers: r.required_approvers,
        priority: r.priority,
        enabled: false, // Start disabled for review
        tenant_scope: r.tenant_scope,
      });
    }
    setShowTemplates(false);
    await fetchRules();
  };

  const handleShowTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
      setShowTemplates(true);
    } catch {
      // Fallback if API fails
      setShowTemplates(true);
    }
  };

  // Drag-to-reorder
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const reordered = [...rules];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    // Recalculate priorities (highest first)
    const updates = reordered.map((r, i) => ({
      id: r.id,
      priority: (reordered.length - i) * 10,
    }));

    setRules(reordered.map((r, i) => ({ ...r, priority: updates[i].priority })));

    dragItem.current = null;
    dragOverItem.current = null;

    try {
      await reorderPolicies(updates);
    } catch {
      await fetchRules(); // Revert on failure
    }
  };

  const filteredRules = rules;

  // Header actions
  const headerActions = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={handleShowTemplates}
        style={{ ...styles.btn, ...styles.btnSecondary }}
      >
        📋 Templates
      </button>
      <button
        onClick={() => { setEditingRule(null); setShowBuilder(true); }}
        style={{ ...styles.btn, ...styles.btnPrimary }}
      >
        + New Rule
      </button>
    </div>
  );

  return (
    <PageLayout
      title="Policy Builder"
      description="Define governance rules that control what agents can do"
      actions={headerActions}
    >
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {([
          { id: 'rules' as Tab, label: '🛡️ Rules', count: rules.length },
          { id: 'audit' as Tab, label: '📊 Audit Trail' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#a78bfa' : '#9ca3af',
              background: activeTab === tab.id ? 'rgba(124,58,237,0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #7c3aed' : '2px solid transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all 150ms',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                marginLeft: '6px',
                padding: '1px 6px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                fontSize: '11px',
                fontWeight: 400,
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'rules' && (
        <>
          {/* Search */}
          <div style={{ marginBottom: '16px' }}>
            <input
              style={{ ...styles.input, maxWidth: '400px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search rules by name or description…"
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Loading policy rules…
            </div>
          ) : filteredRules.length === 0 ? (
            <EmptyState
              icon="🛡️"
              title="No Policy Rules"
              description="Create your first governance rule or import from an industry template."
              action={
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    onClick={handleShowTemplates}
                    style={{ ...styles.btn, ...styles.btnSecondary }}
                  >
                    📋 Import Template
                  </button>
                  <button
                    onClick={() => { setEditingRule(null); setShowBuilder(true); }}
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                  >
                    + New Rule
                  </button>
                </div>
              }
            />
          ) : (
            /* Rules Table */
            <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '30px' }}></th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conditions</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Triggered</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule, index) => (
                    <tr
                      key={rule.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        opacity: rule.enabled ? 1 : 0.5,
                        cursor: 'grab',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {/* Drag handle + priority */}
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textAlign: 'center' }}>
                        <span title={`Priority: ${rule.priority}`}>⠿</span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{rule.name}</div>
                        {rule.description && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rule.description}</div>
                        )}
                      </td>

                      {/* Conditions */}
                      <td style={{ padding: '10px 14px' }}>
                        <ConditionChips conditions={rule.conditions as PolicyCondition[]} />
                      </td>

                      {/* Action */}
                      <td style={{ padding: '10px 14px' }}>
                        <ActionBadge action={rule.action_on_match} />
                        {rule.approval_tier && (
                          <span style={{ ...styles.chip, marginLeft: '6px' }}>{rule.approval_tier}</span>
                        )}
                      </td>

                      {/* Status toggle */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <Toggle
                          checked={rule.enabled}
                          onChange={() => handleToggle(rule)}
                          disabled={togglingId === rule.id}
                        />
                      </td>

                      {/* Last triggered */}
                      <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                        {rule.last_triggered
                          ? new Date(rule.last_triggered).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleEdit(rule)}
                            style={{ ...styles.btn, ...styles.btnGhost, fontSize: '12px' }}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDuplicate(rule)}
                            style={{ ...styles.btn, ...styles.btnGhost, fontSize: '12px' }}
                            title="Duplicate"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => setVersionHistoryRule(rule)}
                            style={{ ...styles.btn, ...styles.btnGhost, fontSize: '12px' }}
                            title="Version History"
                          >
                            🕐
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            style={{ ...styles.btn, ...styles.btnGhost, fontSize: '12px', color: '#f87171' }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer summary */}
              <div style={{
                padding: '10px 14px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}>
                <span>{filteredRules.length} rules · {filteredRules.filter(r => r.enabled).length} active</span>
                <span>Rules evaluated highest priority first</span>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'audit' && <AuditTrailView />}

      {/* Rule Builder Modal */}
      {showBuilder && (
        <RuleBuilder
          rule={editingRule}
          onSave={handleSaveRule}
          onClose={() => { setShowBuilder(false); setEditingRule(null); }}
        />
      )}

      {/* Template Library Modal */}
      {showTemplates && (
        <TemplateLibrary
          templates={templates}
          onImport={handleImportTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Version History Modal (P2) */}
      {versionHistoryRule && (
        <VersionHistoryModal
          rule={versionHistoryRule}
          onRevert={async (version) => {
            try {
              await revertPolicy(versionHistoryRule.id, version);
              setVersionHistoryRule(null);
              await fetchRules();
            } catch {
              // Toast will show from API client
            }
          }}
          onClose={() => setVersionHistoryRule(null)}
        />
      )}
    </PageLayout>
  );
}
