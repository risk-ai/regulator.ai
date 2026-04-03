/**
 * Integrations Page — Vienna OS
 * 
 * Integration Hub: manage Slack, Email, Webhook, and GitHub adapters
 * for governance event dispatch.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { useResponsive } from '../hooks/useResponsive.js';
import {
  listIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  toggleIntegration,
  getIntegrationEvents,
  getIntegrationTypes,
  type Integration,
  type IntegrationEvent,
  type ConfigSchema,
  type ConfigField,
  type TestResult,
  type IntegrationStats,
} from '../api/integrations.js';

// ── Constants ──────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  slack: '💬',
  email: '📧',
  webhook: '🔗',
  github: '🐙',
};

const EVENT_TYPES = [
  { value: 'approval_required', label: 'Approval Required' },
  { value: 'approval_resolved', label: 'Approval Resolved' },
  { value: 'action_executed', label: 'Action Executed' },
  { value: 'action_failed', label: 'Action Failed' },
  { value: 'policy_violation', label: 'Policy Violation' },
  { value: 'alert', label: 'Alert' },
];

// ── Styles ──────────────────────────────────

const styles = {
  card: {
    background: 'var(--bg-primary)',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    background: `${color}22`,
    color,
  } as React.CSSProperties),
  button: (variant: 'primary' | 'danger' | 'ghost' | 'success') => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      primary: { bg: '#7c3aed', text: '#fff', border: '#7c3aed' },
      danger: { bg: '#ef4444', text: '#fff', border: '#ef4444' },
      ghost: { bg: 'transparent', text: 'var(--text-secondary)', border: 'var(--border-subtle)' },
      success: { bg: '#22c55e', text: '#fff', border: '#22c55e' },
    };
    const c = colors[variant];
    return {
      padding: '8px 16px',
      borderRadius: '8px',
      border: `1px solid ${c.border}`,
      background: c.bg,
      color: c.text,
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'opacity 150ms',
    } as React.CSSProperties;
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--bg-app)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '12px',
  } as React.CSSProperties,
};

// ── Main Component ──────────────────────────────────

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [schemas, setSchemas] = useState<ConfigSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'edit'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { isMobile } = useResponsive();

  const load = useCallback(async () => {
    try {
      const [ints, types] = await Promise.all([listIntegrations(), getIntegrationTypes()]);
      setIntegrations(ints);
      setSchemas(types);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <PageLayout title="Integrations" description="Loading...">
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>Loading integrations...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Integrations" description="Connect Vienna governance events to external services">
      {view === 'list' && (
        <IntegrationList
          integrations={integrations}
          schemas={schemas}
          onSelect={(id) => { setSelectedId(id); setView('detail'); }}
          onAdd={() => setView('create')}
          onToggle={async (id) => {
            await toggleIntegration(id);
            load();
          }}
        />
      )}
      {view === 'create' && (
        selectedType ? (
          <IntegrationForm
            schema={schemas.find(s => s.type === selectedType)!}
            onSave={async (data) => {
              await createIntegration({ ...data, type: selectedType });
              setSelectedType(null);
              setView('list');
              load();
            }}
            onCancel={() => { setSelectedType(null); setView('list'); }}
          />
        ) : (
          <TypePicker
            schemas={schemas}
            onSelect={(type) => setSelectedType(type)}
            onCancel={() => setView('list')}
          />
        )
      )}
      {view === 'detail' && selectedId && (
        <IntegrationDetail
          id={selectedId}
          schemas={schemas}
          onBack={() => { setSelectedId(null); setView('list'); load(); }}
          onEdit={() => setView('edit')}
          onDelete={async () => {
            await deleteIntegration(selectedId);
            setSelectedId(null);
            setView('list');
            load();
          }}
        />
      )}
      {view === 'edit' && selectedId && (
        <IntegrationEdit
          id={selectedId}
          schemas={schemas}
          onSave={async () => {
            setView('detail');
          }}
          onCancel={() => setView('detail')}
        />
      )}
    </PageLayout>
  );
}

// ── Integration List ──────────────────────────────────

function IntegrationList({ integrations, schemas, onSelect, onAdd, onToggle }: {
  integrations: Integration[];
  schemas: ConfigSchema[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={styles.sectionTitle}>Configured Integrations</h2>
        <button style={styles.button('primary')} onClick={onAdd}>+ Add Integration</button>
      </div>

      {integrations.length === 0 ? (
        <div style={{
          ...styles.card,
          textAlign: 'center',
          padding: '48px',
          cursor: 'default',
          color: 'var(--text-tertiary)',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔌</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>No integrations configured</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Add a Slack, Email, Webhook, or GitHub integration to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {integrations.map(int => (
            <IntegrationCard key={int.id} integration={int} onClick={() => onSelect(int.id)} onToggle={(e) => { e.stopPropagation(); onToggle(int.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationCard({ integration, onClick, onToggle }: {
  integration: Integration;
  onClick: () => void;
  onToggle: (e: React.MouseEvent) => void;
}) {
  const icon = TYPE_ICONS[integration.type] || '🔌';
  const isHealthy = integration.consecutive_failures === 0 && integration.enabled;
  const isDegraded = integration.consecutive_failures > 0 && integration.consecutive_failures < 5 && integration.enabled;
  const isFailing = integration.consecutive_failures >= 5 || !integration.enabled;

  const statusColor = isFailing ? '#ef4444' : isDegraded ? '#f59e0b' : '#22c55e';
  const statusLabel = !integration.enabled ? 'Disabled' : isFailing ? 'Failing' : isDegraded ? 'Degraded' : 'Healthy';

  return (
    <div
      style={styles.card}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed44'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '24px' }}>{icon}</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{integration.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{integration.type}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={styles.badge(statusColor)}>{statusLabel}</span>
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
              opacity: 0.6,
            }}
            title={integration.enabled ? 'Disable' : 'Enable'}
          >
            {integration.enabled ? '⏸' : '▶️'}
          </button>
        </div>
      </div>

      {integration.description && (
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>{integration.description}</div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
        {integration.event_count !== undefined && (
          <span>📊 {integration.event_count} events</span>
        )}
        {integration.last_success && (
          <span>✅ {timeAgo(integration.last_success)}</span>
        )}
        {integration.last_failure && (
          <span>❌ {timeAgo(integration.last_failure)}</span>
        )}
      </div>
    </div>
  );
}

// ── Type Picker ──────────────────────────────────

function TypePicker({ schemas, onSelect, onCancel }: {
  schemas: ConfigSchema[];
  onSelect: (type: string) => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={styles.sectionTitle}>Choose Integration Type</h2>
        <button style={styles.button('ghost')} onClick={onCancel}>← Back</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {schemas.map(schema => (
          <div
            key={schema.type}
            style={{ ...styles.card, display: 'flex', gap: '16px', alignItems: 'center' }}
            onClick={() => onSelect(schema.type)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed44'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
          >
            <span style={{ fontSize: '32px' }}>{schema.icon}</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{schema.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{schema.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Integration Form (Create) ──────────────────────────────────

function IntegrationForm({ schema, onSave, onCancel, initialValues }: {
  schema: ConfigSchema;
  onSave: (data: { name: string; description?: string; config: Record<string, any>; event_types: string[]; filters: Record<string, any> }) => Promise<void>;
  onCancel: () => void;
  initialValues?: { name?: string; description?: string; config?: Record<string, any>; event_types?: string[]; filters?: Record<string, any> };
}) {
  const [name, setName] = useState(initialValues?.name || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [config, setConfig] = useState<Record<string, any>>(initialValues?.config || {});
  const [eventTypes, setEventTypes] = useState<string[]>(initialValues?.event_types || ['approval_required']);
  const [filters, setFilters] = useState<Record<string, any>>(initialValues?.filters || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name, description: description || undefined, config, event_types: eventTypes, filters });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={styles.sectionTitle}>{schema.icon} Configure {schema.label}</h2>
        <button style={styles.button('ghost')} onClick={onCancel}>← Back</button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#ef444422', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontSize: '13px' }}>{error}</div>
      )}

      {/* Name & Description */}
      <div>
        <label style={styles.label}>Name *</label>
        <input style={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder={`My ${schema.label} Integration`} />
      </div>
      <div>
        <label style={styles.label}>Description</label>
        <input style={styles.input} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
      </div>

      {/* Config Fields */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
        <h3 style={{ ...styles.sectionTitle, fontSize: '12px' }}>Connection</h3>
        {schema.fields.map(field => (
          <ConfigFieldInput key={field.key} field={field} value={config[field.key]} onChange={val => setConfig(prev => ({ ...prev, [field.key]: val }))} />
        ))}
      </div>

      {/* Event Types */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
        <h3 style={{ ...styles.sectionTitle, fontSize: '12px' }}>Event Types</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {EVENT_TYPES.map(et => (
            <label key={et.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={eventTypes.includes(et.value)}
                onChange={e => {
                  if (e.target.checked) setEventTypes(prev => [...prev, et.value]);
                  else setEventTypes(prev => prev.filter(t => t !== et.value));
                }}
              />
              {et.label}
            </label>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
        <h3 style={{ ...styles.sectionTitle, fontSize: '12px' }}>Filters (optional)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={styles.label}>Risk Tiers (comma-separated)</label>
            <input
              style={styles.input}
              value={(filters.risk_tiers || []).join(', ')}
              onChange={e => setFilters(prev => ({ ...prev, risk_tiers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              placeholder="T1, T2"
            />
          </div>
          <div>
            <label style={styles.label}>Agent IDs (comma-separated)</label>
            <input
              style={styles.input}
              value={(filters.agents || []).join(', ')}
              onChange={e => setFilters(prev => ({ ...prev, agents: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              placeholder="agent-1, agent-2"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
        <button style={styles.button('primary')} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Integration'}
        </button>
        <button style={styles.button('ghost')} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Config Field Input ──────────────────────────────────

function ConfigFieldInput({ field, value, onChange }: { field: ConfigField; value: any; onChange: (val: any) => void }) {
  if (field.type === 'select') {
    return (
      <div style={{ marginBottom: '12px' }}>
        <label style={styles.label}>{field.label}{field.required ? ' *' : ''}</label>
        <select
          style={{ ...styles.input, cursor: 'pointer' }}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {field.help && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{field.help}</div>}
      </div>
    );
  }

  if (field.type === 'multi-text') {
    const items = Array.isArray(value) ? value : (value ? [value] : []);
    return (
      <div style={{ marginBottom: '12px' }}>
        <label style={styles.label}>{field.label}{field.required ? ' *' : ''}</label>
        {items.map((item: string, i: number) => (
          <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
            <input
              style={styles.input}
              value={item}
              onChange={e => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={field.placeholder}
            />
            <button
              style={{ ...styles.button('ghost'), padding: '4px 8px', fontSize: '12px' }}
              onClick={() => onChange(items.filter((_: any, j: number) => j !== i))}
            >×</button>
          </div>
        ))}
        <button
          style={{ ...styles.button('ghost'), padding: '4px 8px', fontSize: '11px' }}
          onClick={() => onChange([...items, ''])}
        >+ Add</button>
        {field.help && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{field.help}</div>}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={styles.label}>{field.label}{field.required ? ' *' : ''}</label>
      <input
        style={styles.input}
        type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
        value={value || ''}
        onChange={e => onChange(field.type === 'number' ? (e.target.value ? parseInt(e.target.value) : undefined) : e.target.value)}
        placeholder={field.placeholder}
      />
      {field.help && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{field.help}</div>}
    </div>
  );
}

// ── Integration Detail ──────────────────────────────────

function IntegrationDetail({ id, schemas, onBack, onEdit, onDelete }: {
  id: string;
  schemas: ConfigSchema[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [integration, setIntegration] = useState<(Integration & { stats?: IntegrationStats }) | null>(null);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [int, evts] = await Promise.all([
          getIntegration(id),
          getIntegrationEvents(id).catch(() => ({ data: [] as IntegrationEvent[], total: 0 })),
        ]);
        setIntegration(int);
        // evts might be the array directly or { data, total }
        setEvents(Array.isArray(evts) ? evts : (evts as any)?.data || evts || []);
      } catch (err) {
        console.error('Failed to load integration:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testIntegration(id);
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  if (loading || !integration) {
    return <div style={{ padding: '24px', color: 'var(--text-tertiary)' }}>Loading...</div>;
  }

  const icon = TYPE_ICONS[integration.type] || '🔌';
  const schema = schemas.find(s => s.type === integration.type);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={styles.button('ghost')} onClick={onBack}>←</button>
          <span style={{ fontSize: '28px' }}>{icon}</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{integration.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{integration.type} • {integration.enabled ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={styles.button('primary')} onClick={handleTest} disabled={testing}>
            {testing ? 'Testing...' : '🔌 Test Connection'}
          </button>
          <button style={styles.button('ghost')} onClick={onEdit}>Edit</button>
          {!confirmDelete ? (
            <button style={styles.button('danger')} onClick={() => setConfirmDelete(true)}>Delete</button>
          ) : (
            <button style={styles.button('danger')} onClick={onDelete}>Confirm Delete</button>
          )}
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div style={{
          padding: '12px 16px',
          background: testResult.success ? '#22c55e22' : '#ef444422',
          border: `1px solid ${testResult.success ? '#22c55e' : '#ef4444'}`,
          borderRadius: '8px',
          color: testResult.success ? '#22c55e' : '#ef4444',
          fontSize: '13px',
        }}>
          {testResult.success ? '✅' : '❌'} {testResult.message}
        </div>
      )}

      {/* Stats */}
      {integration.stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Events', value: integration.stats.total_events, icon: '📊' },
            { label: 'Successes', value: integration.stats.success_count, icon: '✅' },
            { label: 'Failures', value: integration.stats.failure_count, icon: '❌' },
            { label: 'Avg Latency', value: `${integration.stats.avg_latency_ms}ms`, icon: '⏱' },
          ].map(stat => (
            <div key={stat.label} style={{ ...styles.card, cursor: 'default', textAlign: 'center' }}>
              <div style={{ fontSize: '20px' }}>{stat.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Config Summary */}
      <div style={styles.card}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '8px' }}>Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
          {Object.entries(integration.config).map(([key, val]) => (
            <div key={key} style={{ fontSize: '12px' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{key}: </span>
              <span style={{ color: 'var(--text-secondary)' }}>{typeof val === 'string' && val.includes('•') ? val : String(val)}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Events: </span>
          {(integration.event_types || []).map((et: string) => (
            <span key={et} style={{ ...styles.badge('#7c3aed'), marginRight: '4px' }}>{et}</span>
          ))}
        </div>
      </div>

      {/* Event Log */}
      <div>
        <h3 style={styles.sectionTitle}>Event Log</h3>
        {events.length === 0 ? (
          <div style={{ ...styles.card, cursor: 'default', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            No events yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {events.map(evt => (
              <div key={evt.id}>
                <div
                  style={{
                    ...styles.card,
                    padding: '10px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: expandedEvent === evt.id ? '8px 8px 0 0' : '8px',
                  }}
                  onClick={() => setExpandedEvent(expandedEvent === evt.id ? null : evt.id)}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px' }}>{evt.success ? '✅' : '❌'}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{evt.event_type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {evt.latency_ms != null && <span>{evt.latency_ms}ms</span>}
                    {evt.response_status && <span>HTTP {evt.response_status}</span>}
                    <span>{timeAgo(evt.created_at)}</span>
                  </div>
                </div>
                {expandedEvent === evt.id && (
                  <div style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    padding: '12px 16px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}>
                    {evt.error_message && <div style={{ color: '#ef4444', marginBottom: '8px' }}>Error: {evt.error_message}</div>}
                    <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>Payload:</div>
                    <pre style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                    {evt.response_body && (
                      <>
                        <div style={{ color: 'var(--text-tertiary)', marginTop: '8px', marginBottom: '4px' }}>Response:</div>
                        <pre style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                          {evt.response_body.slice(0, 1000)}
                        </pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Integration Edit ──────────────────────────────────

function IntegrationEdit({ id, schemas, onSave, onCancel }: {
  id: string;
  schemas: ConfigSchema[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIntegration(id).then(int => { setIntegration(int); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading || !integration) return <div style={{ padding: '24px', color: 'var(--text-tertiary)' }}>Loading...</div>;

  const schema = schemas.find(s => s.type === integration.type);
  if (!schema) return <div style={{ padding: '24px', color: '#ef4444' }}>Unknown type: {integration.type}</div>;

  return (
    <IntegrationForm
      schema={schema}
      initialValues={{
        name: integration.name,
        description: integration.description || '',
        config: integration.config,
        event_types: integration.event_types,
        filters: integration.filters,
      }}
      onSave={async (data) => {
        await updateIntegration(id, data);
        onSave();
      }}
      onCancel={onCancel}
    />
  );
}

// ── Helpers ──────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
