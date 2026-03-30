/**
 * Webhook Manager — Vienna OS
 * 
 * Configure webhook endpoints for pipeline event notifications.
 */

import React, { useState, useEffect } from 'react';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
  created_at: string;
}

const EVENT_OPTIONS = [
  { value: '*', label: 'All events' },
  { value: 'warrant_issued', label: 'Warrant issued' },
  { value: 'proposal_pending', label: 'Proposal pending approval' },
  { value: 'proposal_denied', label: 'Proposal denied' },
  { value: 'execution_completed', label: 'Execution completed' },
  { value: 'execution_failed', label: 'Execution failed' },
  { value: 'warrant_revoked', label: 'Warrant revoked' },
  { value: 'warrant_expired', label: 'Warrant expired' },
];

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['*']);
  const [adding, setAdding] = useState(false);

  const loadWebhooks = () => {
    fetch('/api/v1/webhooks', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setWebhooks(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadWebhooks(); }, []);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    try {
      await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: newUrl, events: newEvents }),
      });
      setNewUrl('');
      setShowAdd(false);
      loadWebhooks();
    } catch {} finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    await fetch(`/api/v1/webhooks/${id}`, { method: 'DELETE', credentials: 'include' });
    loadWebhooks();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Webhooks</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Receive HTTP callbacks for pipeline events</div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#7c3aed', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
        >
          + Add Webhook
        </button>
      </div>

      {showAdd && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
          <input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks/vienna"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', background: 'var(--bg-primary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {EVENT_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newEvents.includes(opt.value)}
                  onChange={e => {
                    if (opt.value === '*') { setNewEvents(e.target.checked ? ['*'] : []); return; }
                    setNewEvents(prev => {
                      const filtered = prev.filter(v => v !== '*');
                      return e.target.checked ? [...filtered, opt.value] : filtered.filter(v => v !== opt.value);
                    });
                  }}
                  style={{ accentColor: '#7c3aed' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <button onClick={handleAdd} disabled={adding || !newUrl.trim()} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: adding ? 'var(--bg-tertiary)' : '#7c3aed', border: 'none', color: '#fff', cursor: adding ? 'default' : 'pointer', fontFamily: 'var(--font-sans)' }}>
            {adding ? 'Creating...' : 'Create Webhook'}
          </button>
        </div>
      )}

      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading...</div>
        ) : webhooks.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            No webhooks configured. Add one to receive pipeline event notifications.
          </div>
        ) : webhooks.map((wh, i) => (
          <div key={wh.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
            borderBottom: i < webhooks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: wh.enabled ? '#4ade80' : '#94a3b8' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.url}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Events: {Array.isArray(wh.events) ? wh.events.join(', ') : '*'}
              </div>
            </div>
            <button onClick={() => handleDelete(wh.id)} style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '10px', background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.2)', color: '#f87171', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
