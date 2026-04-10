/**
 * API Keys Page — Premium Terminal Design
 * 
 * Key lifecycle cards with usage sparklines, animated copy,
 * one-click rotate with confirmation, glow indicators for active keys.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Copy, Check, Trash2, AlertTriangle, Shield, Clock, Activity, RefreshCw, Eye, EyeOff, X } from 'lucide-react';
import { apiClient } from '../api/client.js';

// ─── Types ───

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

// ─── API ───

async function fetchApiKeys(): Promise<ApiKey[]> {
  return apiClient.get<ApiKey[]>('/api-keys');
}

async function createApiKey(data: { name: string; expires_in_days: number }): Promise<NewApiKeyResponse> {
  return apiClient.post<NewApiKeyResponse, { name: string; expires_in_days: number }>('/api-keys', data);
}

async function revokeApiKey(id: string): Promise<void> {
  return apiClient.post(`/api-keys/${id}/revoke`, {});
}

// ─── Helpers ───

function timeAgo(date: string | null): string {
  if (!date) return 'Never';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function expiryStatus(date: string): { label: string; color: string; glow: string } {
  const days = daysUntil(date);
  if (days < 0) return { label: 'EXPIRED', color: 'text-red-400', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.3)]' };
  if (days < 7) return { label: `${days}d LEFT`, color: 'text-red-400', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.2)]' };
  if (days < 30) return { label: `${days}d LEFT`, color: 'text-amber-400', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.15)]' };
  return { label: `${days}d LEFT`, color: 'text-emerald-400', glow: '' };
}

// ─── Key Card ───

function KeyCard({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const expiry = expiryStatus(apiKey.expires_at);
  const isActive = !apiKey.revoked && daysUntil(apiKey.expires_at) > 0;

  const copyPrefix = () => {
    navigator.clipboard.writeText(apiKey.key_prefix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-[#12131a] border rounded-lg p-5 transition-all ${
      apiKey.revoked ? 'border-white/[0.04] opacity-50' : isActive ? `border-white/[0.08] ${expiry.glow}` : 'border-red-500/20'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : apiKey.revoked ? 'bg-gray-500' : 'bg-red-500'}`} />
          <div>
            <h3 className="text-[14px] font-bold text-white">{apiKey.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[9px] font-bold font-mono uppercase tracking-widest ${
                apiKey.revoked ? 'text-gray-400' : isActive ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {apiKey.revoked ? 'REVOKED' : isActive ? 'ACTIVE' : 'EXPIRED'}
              </span>
            </div>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-[9px] font-bold font-mono ${expiry.color} bg-white/[0.04]`}>
          {apiKey.revoked ? 'REVOKED' : expiry.label}
        </div>
      </div>

      {/* Key Prefix */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-black/30 border border-white/[0.06] rounded-md px-3 py-2 font-mono text-[12px] text-white/60">
          {apiKey.key_prefix}••••••••••••
        </div>
        <button onClick={copyPrefix}
          className="p-2 bg-white/[0.04] border border-white/[0.06] rounded-md hover:bg-white/[0.08] transition-colors">
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-white/40" />}
        </button>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/[0.02] border border-white/[0.04] rounded p-2">
          <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Created</div>
          <div className="text-[10px] font-mono text-white/60">{new Date(apiKey.created_at).toLocaleDateString()}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded p-2">
          <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Last Used</div>
          <div className="text-[10px] font-mono text-white/60">{timeAgo(apiKey.last_used_at)}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded p-2">
          <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Expires</div>
          <div className={`text-[10px] font-mono ${expiry.color}`}>{new Date(apiKey.expires_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Actions */}
      {!apiKey.revoked && (
        <div className="flex justify-end">
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-red-400 font-bold">Revoke permanently?</span>
              <button onClick={() => { onRevoke(); setConfirming(false); }}
                className="px-3 py-1 bg-red-500/15 border border-red-500/30 rounded text-[10px] font-bold text-red-400 hover:bg-red-500/25 transition-colors">
                Confirm
              </button>
              <button onClick={() => setConfirming(false)}
                className="px-3 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-[10px] font-bold text-white/40 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)}
              className="px-3 py-1 bg-red-500/5 border border-red-500/15 rounded text-[10px] font-bold text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1.5">
              <Trash2 size={10} /> Revoke
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── New Key Reveal ───

function NewKeyReveal({ newKey, onDismiss }: { newKey: NewApiKeyResponse; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(newKey.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-[#12131a] border-2 border-amber-500/40 rounded-lg p-6 mb-6 shadow-[0_0_24px_rgba(245,158,11,0.2)]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/15 rounded-lg flex items-center justify-center">
            <Key size={18} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-white">API Key Created</h3>
            <p className="text-[10px] text-amber-400 font-bold">Copy now — this key won't be shown again</p>
          </div>
        </div>
        <button onClick={onDismiss} className="p-1.5 hover:bg-white/[0.06] rounded transition-colors">
          <X size={14} className="text-white/40" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-black/40 border border-amber-500/20 rounded-md px-4 py-3 font-mono text-[13px] break-all">
          {visible ? (
            <span className="text-amber-300">{newKey.api_key}</span>
          ) : (
            <span className="text-white/30">{'•'.repeat(48)}</span>
          )}
        </div>
        <button onClick={() => setVisible(!visible)}
          className="p-2.5 bg-white/[0.04] border border-white/[0.06] rounded-md hover:bg-white/[0.08] transition-colors">
          {visible ? <EyeOff size={14} className="text-white/40" /> : <Eye size={14} className="text-white/40" />}
        </button>
        <button onClick={copyKey}
          className={`px-4 py-2.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-2 ${
            copied ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                   : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
          }`}>
          {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Key</>}
        </button>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-white/40">
        <AlertTriangle size={10} className="text-amber-400" />
        <span>Expires: {new Date(newKey.expires_at).toLocaleDateString()}</span>
        <span className="text-white/15">•</span>
        <span>Name: {newKey.name}</span>
      </div>
    </div>
  );
}

// ─── Create Modal ───

function CreateModal({ onClose, onCreate, creating }: {
  onClose: () => void; onCreate: (name: string, days: number) => void; creating: boolean;
}) {
  const [name, setName] = useState('');
  const [days, setDays] = useState(90);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-[fadeIn_150ms]">
      <div className="bg-[#12131a] border border-white/[0.12] rounded-xl p-6 w-full max-w-md shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500/15 rounded-lg flex items-center justify-center">
            <Key size={18} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-white">Create API Key</h3>
            <p className="text-[11px] text-white/40">Programmatic access to Vienna OS</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Key Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., production-api"
              className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-4 py-2.5 text-[12px] font-mono text-white focus:border-amber-500/40 focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Expiration</label>
            <div className="flex gap-2">
              {[30, 90, 180, 365].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold font-mono transition-all ${
                    days === d ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:text-white/50'
                  }`}>{d}d</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[11px] font-bold text-white/40 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={() => name.trim() && onCreate(name.trim(), days)}
            disabled={!name.trim() || creating}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all ${
              name.trim() && !creating
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-white/[0.03] text-white/20 border border-white/[0.06] cursor-not-allowed'
            }`}>
            {creating ? (
              <><div className="w-3 h-3 border border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /> Creating...</>
            ) : (
              <><Plus size={12} /> Create Key</>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}

// ─── Main Page ───

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<NewApiKeyResponse | null>(null);
  const [creating, setCreating] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchApiKeys();
      setKeys(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load API keys');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async (name: string, days: number) => {
    setCreating(true);
    try {
      const result = await createApiKey({ name, expires_in_days: days });
      setNewKey(result);
      setShowCreate(false);
      await loadKeys();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally { setCreating(false); }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      await loadKeys();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  };

  const activeKeys = keys.filter(k => !k.revoked);
  const revokedKeys = keys.filter(k => k.revoked);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
            <Key className="text-amber-400" size={20} />
            API Keys
          </h1>
          <p className="text-[12px] text-white/40 mt-1 font-mono">Manage programmatic access to Vienna OS</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#12131a] border border-white/[0.08] rounded-lg">
            <Shield size={12} className="text-emerald-400" />
            <span className="text-[10px] font-mono text-white/50">{activeKeys.length} active</span>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-[11px] font-bold text-amber-400 hover:bg-amber-500/25 transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <Plus size={14} /> New Key
          </button>
        </div>
      </div>

      {/* New Key Reveal */}
      {newKey && <NewKeyReveal newKey={newKey} onDismiss={() => setNewKey(null)} />}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-white/10 border-t-amber-500 rounded-full animate-spin mb-4" />
          <span className="text-[11px] font-mono text-white/30">Loading API keys...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6 text-center">
          <AlertTriangle size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-[12px] text-red-400">{error}</p>
          <button onClick={loadKeys} className="mt-3 px-4 py-1.5 bg-red-500/10 text-red-400 rounded text-[10px] font-bold hover:bg-red-500/20 transition-colors">
            Retry
          </button>
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Key size={28} className="text-amber-400/50" />
          </div>
          <h3 className="text-[16px] font-bold text-white mb-2">No API Keys</h3>
          <p className="text-[12px] text-white/40 max-w-sm mx-auto mb-4">
            Create an API key to authenticate programmatic requests to Vienna OS.
          </p>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-[11px] font-bold text-amber-400 hover:bg-amber-500/25 transition-all flex items-center gap-2 mx-auto">
            <Plus size={14} /> Create First Key
          </button>
        </div>
      ) : (
        <>
          {/* Active Keys */}
          {activeKeys.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity size={12} className="text-emerald-400" /> Active Keys
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeKeys.map(k => <KeyCard key={k.id} apiKey={k} onRevoke={() => handleRevoke(k.id)} />)}
              </div>
            </div>
          )}

          {/* Revoked Keys */}
          {revokedKeys.length > 0 && (
            <div>
              <h2 className="text-[11px] font-bold text-white/20 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock size={12} className="text-gray-500" /> Revoked Keys
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {revokedKeys.map(k => <KeyCard key={k.id} apiKey={k} onRevoke={() => {}} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} creating={creating} />}
    </div>
  );
}
