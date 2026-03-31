/**
 * API Keys Page — Vienna OS
 * 
 * Manage API keys for programmatic access to the Vienna OS console.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { apiClient } from '../api/client.js';

// ============================================================================
// Types
// ============================================================================

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
  revoked: boolean;
}

interface NewApiKeyResponse {
  id: string;
  name: string;
  api_key: string;
  expires_at: string;
  warning: string;
}

interface CreateApiKeyRequest {
  name: string;
  expires_in_days: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchApiKeys(): Promise<ApiKey[]> {
  return apiClient.get<ApiKey[]>('/api-keys');
}

async function createApiKey(data: CreateApiKeyRequest): Promise<NewApiKeyResponse> {
  return apiClient.post<NewApiKeyResponse, CreateApiKeyRequest>('/api-keys', data);
}

async function revokeApiKey(id: string): Promise<void> {
  return apiClient.post(`/api-keys/${id}/revoke`, {});
}

// ============================================================================
// API Keys Page
// ============================================================================

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState<NewApiKeyResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchApiKeys();
      setKeys(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreateKey = async (name: string, expiresInDays: number) => {
    setCreating(true);
    try {
      const result = await createApiKey({ name, expires_in_days: expiresInDays });
      setNewKey(result);
      setShowCreateModal(false);
      await loadKeys(); // Refresh the list
    } catch (err: any) {
      alert(`Failed to create API key: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`Revoke API key "${name}"? This action cannot be undone.`)) {
      return;
    }

    setRevoking(id);
    try {
      await revokeApiKey(id);
      await loadKeys(); // Refresh the list
    } catch (err: any) {
      alert(`Failed to revoke API key: ${err.message}`);
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return '—';
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (key: ApiKey) => {
    if (key.revoked) {
      return { text: 'Revoked', color: '#6b7280' };
    }
    
    const now = new Date();
    const expires = new Date(key.expires_at);
    
    if (expires < now) {
      return { text: 'Expired', color: '#f87171' };
    }
    
    // Check if expiring soon (within 7 days)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (expires < sevenDaysFromNow) {
      return { text: 'Expiring Soon', color: '#fbbf24' };
    }
    
    return { text: 'Active', color: '#4ade80' };
  };

  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageLayout
      title="API Keys"
      description="Manage API keys for programmatic access"
      actions={
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            background: 'rgba(124, 58, 237, 0.08)',
            color: '#a78bfa',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Create API Key
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

        {/* New Key Display */}
        {newKey && (
          <div style={{
            background: 'rgba(74, 222, 128, 0.06)',
            border: '1px solid rgba(74, 222, 128, 0.2)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#4ade80',
              marginBottom: '12px',
            }}>
              ✓ API Key Created
            </h3>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              marginBottom: '12px',
            }}>
              {newKey.warning}
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '8px 12px',
            }}>
              <code style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-primary)',
                wordBreak: 'break-all',
              }}>
                {newKey.api_key}
              </code>
              <button
                onClick={() => copyToClipboard(newKey.api_key)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                  background: copied ? 'rgba(74, 222, 128, 0.15)' : 'rgba(74, 222, 128, 0.08)',
                  color: '#4ade80',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.2s',
                }}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setNewKey(null)}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* API Keys Table */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                border: '2px solid var(--border-subtle)',
                borderTop: '2px solid #7c3aed',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
              }}>
                Loading API keys...
              </p>
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: '#f87171', fontSize: '12px' }}>
                {error}
              </p>
              <button
                onClick={loadKeys}
                style={{
                  marginTop: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  background: 'rgba(124, 58, 237, 0.08)',
                  color: '#a78bfa',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Retry
              </button>
            </div>
          ) : keys.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}>
                No API keys found
              </p>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-tertiary)',
              }}>
                Create your first API key to get started
              </p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 140px 140px 140px 100px',
                gap: '16px',
                padding: '16px 20px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                <div>Name</div>
                <div>Key Prefix</div>
                <div>Created</div>
                <div>Last Used</div>
                <div>Expires</div>
                <div>Status</div>
                <div></div>
              </div>

              {/* Table Rows */}
              {keys.map((key) => {
                const status = getStatusBadge(key);
                const isRevoked = key.revoked;
                const isExpired = new Date(key.expires_at) < new Date();
                
                return (
                  <div
                    key={key.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px 140px 140px 140px 100px',
                      gap: '16px',
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                      opacity: isRevoked || isExpired ? 0.6 : 1,
                    }}
                  >
                    <div>
                      <div style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '2px',
                      }}>
                        {key.name}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-tertiary)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {key.id.substring(0, 8)}...
                      </div>
                    </div>
                    
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                    }}>
                      {key.key_prefix}
                    </div>
                    
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(key.created_at)}
                    </div>
                    
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(key.last_used_at)}
                    </div>
                    
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(key.expires_at)}
                    </div>
                    
                    <div>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: `${status.color}20`,
                        color: status.color,
                      }}>
                        {status.text}
                      </span>
                    </div>
                    
                    <div>
                      {!isRevoked && !isExpired && (
                        <button
                          onClick={() => handleRevokeKey(key.id, key.name)}
                          disabled={revoking === key.id}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(248, 113, 113, 0.3)',
                            background: 'rgba(248, 113, 113, 0.08)',
                            color: '#f87171',
                            fontSize: '10px',
                            fontWeight: 600,
                            cursor: revoking === key.id ? 'wait' : 'pointer',
                            fontFamily: 'inherit',
                            opacity: revoking === key.id ? 0.6 : 1,
                          }}
                        >
                          {revoking === key.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Rate Limit Info */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '14px',
          }}>
            API Usage
          </h3>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Rate Limit</span>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}>
              60 req/min per key
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Authentication</span>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}>
              Bearer Token
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Base URL</span>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}>
              {window.location.origin}/api/v1
            </span>
          </div>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateKey}
          creating={creating}
        />
      )}
    </PageLayout>
  );
}

// ============================================================================
// Create API Key Modal
// ============================================================================

interface CreateApiKeyModalProps {
  onClose: () => void;
  onCreate: (name: string, expiresInDays: number) => void;
  creating: boolean;
}

function CreateApiKeyModal({ onClose, onCreate, creating }: CreateApiKeyModalProps) {
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(90);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), expiresInDays);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '24px',
        width: '400px',
        maxWidth: '90vw',
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '16px',
        }}>
          Create API Key
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              marginBottom: '6px',
            }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API Key"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              marginBottom: '6px',
            }}>
              Expires In
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: creating ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity: creating ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                background: 'rgba(124, 58, 237, 0.08)',
                color: '#a78bfa',
                fontSize: '12px',
                fontWeight: 600,
                cursor: (creating || !name.trim()) ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity: (creating || !name.trim()) ? 0.6 : 1,
              }}
            >
              {creating ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}