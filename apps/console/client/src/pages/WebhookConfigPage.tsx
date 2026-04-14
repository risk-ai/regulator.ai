/**
 * Webhook Configuration Page — Vienna OS
 * 
 * Configure webhook notifications for governance events.
 * Slack/Email/Custom URL triggers on approval/denial/warrant events.
 * 
 * Note: This is a UI wrapper around the Integrations API.
 * Backend: /api/v1/integrations (already exists)
 */

import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { addToast } from '../store/toastStore.js';
import { Bell, Plus, Trash2, TestTube } from 'lucide-react';

interface WebhookConfig {
  id: string;
  type: 'slack' | 'email' | 'webhook';
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  event_filters: string[];
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'approval_required', label: 'Approval Required', icon: '⏸️' },
  { value: 'approval_resolved', label: 'Approval Resolved', icon: '✅' },
  { value: 'action_executed', label: 'Action Executed', icon: '▶️' },
  { value: 'action_failed', label: 'Action Failed', icon: '❌' },
  { value: 'policy_violation', label: 'Policy Violation', icon: '⚠️' },
  { value: 'warrant_issued', label: 'Warrant Issued', icon: '🛡️' },
];

export function WebhookConfigPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/integrations', { credentials: 'include' });
      const data = await response.json();
      if (data.success) setWebhooks(data.data);
    } catch (error) {
      addToast('Failed to load webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/integrations/${id}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        addToast('Webhook updated', 'success');
        loadWebhooks();
      }
    } catch (error) {
      addToast('Failed to toggle webhook', 'error');
    }
  };

  const handleTest = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/integrations/${id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        addToast('Test notification sent', 'success');
      } else {
        addToast('Test failed', 'error');
      }
    } catch (error) {
      addToast('Network error', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete webhook "${name}"?`)) return;
    try {
      const response = await fetch(`/api/v1/integrations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        addToast('Webhook deleted', 'success');
        loadWebhooks();
      }
    } catch (error) {
      addToast('Failed to delete webhook', 'error');
    }
  };

  return (
    <PageLayout title="Webhook Notifications" description="Configure alerts for governance events">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Get notified when approvals are required, actions execute, or policies are violated.
          </p>
          <button
            onClick={() => window.location.href = '/integrations'}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Plus size={16} />
            Add Webhook
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
            Loading webhooks...
          </div>
        ) : webhooks.length === 0 ? (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
          }}>
            <Bell size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--text-tertiary)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              No webhooks configured
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
              Set up Slack, email, or custom webhook notifications to stay informed of governance events.
            </p>
            <button
              onClick={() => window.location.href = '/integrations'}
              style={{
                padding: '10px 20px',
                background: '#f59e0b',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add Your First Webhook
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {webhooks.map(webhook => (
              <div key={webhook.id} style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {webhook.name}
                      </h3>
                      <span style={{
                        padding: '3px 8px',
                        background: webhook.type === 'slack' ? 'rgba(99, 102, 241, 0.2)' :
                                   webhook.type === 'email' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: webhook.type === 'slack' ? '#a5b4fc' :
                              webhook.type === 'email' ? '#6ee7b7' : '#fcd34d',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}>
                        {webhook.type}
                      </span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={webhook.enabled}
                          onChange={() => handleToggle(webhook.id)}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Enabled</span>
                      </label>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      {webhook.event_filters.length > 0 ? (
                        <span>Triggers: {webhook.event_filters.join(', ')}</span>
                      ) : (
                        <span>All events</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleTest(webhook.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <TestTube size={14} />
                      Test
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id, webhook.name)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#fca5a5',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Event Filters */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                    MONITORED EVENTS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {EVENT_TYPES.map(event => {
                      const isActive = webhook.event_filters.includes(event.value) || webhook.event_filters.length === 0;
                      return (
                        <span key={event.value} style={{
                          padding: '4px 10px',
                          background: isActive ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-app)',
                          border: isActive ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: isActive ? '#fcd34d' : 'var(--text-tertiary)',
                          opacity: isActive ? 1 : 0.5,
                        }}>
                          {event.icon} {event.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default WebhookConfigPage;
