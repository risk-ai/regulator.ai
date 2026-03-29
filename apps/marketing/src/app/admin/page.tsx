'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================
interface DashboardData {
  proposals: { total: number; pending: number; approved: number; last_hour: number };
  agents: { total: number; active: number };
  warrants: { total: number; active: number };
  alerts: { unresolved: number };
  timestamp: string;
}

interface BootstrapData {
  operator: string;
  version: string;
  stats: {
    totalProposals: number;
    approvedWarrants: number;
    deniedRequests: number;
    pendingApprovals: number;
    activeAgents: number;
    totalAgents: number;
    totalPolicies: number;
    complianceScore: number;
  };
  recentActivity: Array<{ id: string; type: string; actor: string; riskTier: string; timestamp: string; details: any }>;
  systemHealth: Record<string, string>;
}

interface QuickStats {
  total_actions: number;
  compliance_rate: number;
  policy_violations: number;
  avg_approval_time_minutes: number;
  unauthorized_executions: number;
  fleet_health_score: number;
}

interface UserInfo {
  operator: string;
  email: string;
  role: string;
}

// ============================================================================
// API Helpers
// ============================================================================
const API = 'https://console.regulator.ai/api/v1';

async function apiGet(path: string, cookie?: string) {
  const res = await fetch(`${API}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  return json.data || json;
}

async function apiPost(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `${res.status}`);
  return json.data || json;
}

// ============================================================================
// Components
// ============================================================================
function StatCard({ label, value, sub, color = '#3b82f6' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function HealthDot({ status }: { status: string }) {
  const color = status === 'healthy' ? '#22c55e' : status === 'degraded' ? '#f59e0b' : '#ef4444';
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 8 }} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 24, marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h2>
      {children}
    </div>
  );
}

// ============================================================================
// Login Screen
// ============================================================================
function LoginScreen({ onLogin }: { onLogin: (user: UserInfo) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiPost('/auth/login', { email, password });
      onLogin({ operator: data.operator, email: data.email || email, role: data.role });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <form onSubmit={handleSubmit} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 40, width: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f9fafb', marginBottom: 8 }}>🛡️ Vienna OS Admin</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>regulator.ai management dashboard</p>
        {error && <div style={{ background: '#7f1d1d33', border: '1px solid #991b1b', borderRadius: 8, padding: '8px 12px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ca3af', marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
            style={{ width: '100%', padding: '10px 14px', background: '#0a0a0f', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ca3af', marginBottom: 6 }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            style={{ width: '100%', padding: '10px 14px', background: '#0a0a0f', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

// ============================================================================
// Main Dashboard
// ============================================================================
export default function AdminPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [health, setHealth] = useState<DashboardData | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [compliance, setCompliance] = useState<QuickStats | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Check existing session
  useEffect(() => {
    apiGet('/auth/session').then(data => {
      if (data.authenticated) setUser({ operator: data.operator, email: data.email || '', role: data.role || 'admin' });
    }).catch(() => {}).finally(() => setCheckingSession(false));
  }, []);

  // Load dashboard data
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [h, b, c] = await Promise.all([
        apiGet('/runtime/health'),
        apiGet('/dashboard/bootstrap'),
        apiGet('/compliance/quick-stats'),
      ]);
      setHealth(h);
      setBootstrap(b);
      setCompliance(c);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (!user) return; const i = setInterval(refresh, 30000); return () => clearInterval(i); }, [user, refresh]);

  const handleLogout = async () => {
    await apiPost('/auth/logout', {}).catch(() => {});
    setUser(null);
  };

  if (checkingSession) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Loading...</div>;
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  const stats = bootstrap?.stats;
  const sys = bootstrap?.systemHealth || {};

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e5e7eb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#111827', borderBottom: '1px solid #1f2937', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f9fafb' }}>Vienna OS</span>
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>Admin Dashboard</span>
          </div>
          <span style={{ background: '#065f4622', color: '#34d399', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600, marginLeft: 8 }}>● LIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Updated {lastRefresh.toLocaleTimeString()}</span>
          <button onClick={refresh} style={{ background: 'none', border: '1px solid #374151', borderRadius: 6, color: '#9ca3af', padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>↻ Refresh</button>
          <a href="https://console.regulator.ai" target="_blank" style={{ background: '#1e40af', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>Open Console →</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{user.operator}</span>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Logout</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Key Metrics */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatCard label="Total Proposals" value={health?.proposals?.total || stats?.totalProposals || 0} sub={`${health?.proposals?.last_hour || 0} in last hour`} color="#3b82f6" />
          <StatCard label="Active Warrants" value={health?.warrants?.active || 0} sub={`${health?.warrants?.total || stats?.approvedWarrants || 0} total issued`} color="#22c55e" />
          <StatCard label="Pending Approvals" value={health?.proposals?.pending || stats?.pendingApprovals || 0} color={health?.proposals?.pending ? '#f59e0b' : '#22c55e'} />
          <StatCard label="Active Agents" value={`${health?.agents?.active || stats?.activeAgents || 0}/${health?.agents?.total || stats?.totalAgents || 0}`} color="#8b5cf6" />
          <StatCard label="Compliance" value={`${compliance?.compliance_rate || stats?.complianceScore || 0}%`} sub={`${compliance?.policy_violations || 0} violations`} color={(compliance?.compliance_rate || 0) >= 90 ? '#22c55e' : '#f59e0b'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* System Health */}
          <Section title="🏥 System Health">
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(sys).map(([service, status]) => (
                <div key={service} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1f2937' }}>
                  <span style={{ fontSize: 13, color: '#d1d5db' }}>{service.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                  <span style={{ display: 'flex', alignItems: 'center' }}><HealthDot status={status as string} /><span style={{ fontSize: 12, color: status === 'healthy' ? '#22c55e' : '#f59e0b' }}>{(status as string).toUpperCase()}</span></span>
                </div>
              ))}
              {Object.keys(sys).length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>Loading health data...</div>}
            </div>
          </Section>

          {/* Compliance Overview */}
          <Section title="📊 Compliance Overview">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 12, background: '#0a0a0f', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{compliance?.total_actions || 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Actions Governed</div>
              </div>
              <div style={{ padding: 12, background: '#0a0a0f', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{compliance?.fleet_health_score || 0}/100</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Fleet Health</div>
              </div>
              <div style={{ padding: 12, background: '#0a0a0f', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{compliance?.avg_approval_time_minutes || 0}m</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Avg Approval Time</div>
              </div>
              <div style={{ padding: 12, background: '#0a0a0f', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: (compliance?.unauthorized_executions || 0) > 0 ? '#ef4444' : '#22c55e' }}>{compliance?.unauthorized_executions || 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Unauthorized</div>
              </div>
            </div>
          </Section>
        </div>

        {/* Recent Activity */}
        <Section title="📋 Recent Activity">
          {bootstrap?.recentActivity && bootstrap.recentActivity.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {bootstrap.recentActivity.slice(0, 15).map((event, i) => {
                const eventLabels: Record<string, string> = {
                  operator_login: '🔑 Operator signed in',
                  user_registered: '👤 New user registered',
                  proposal_submitted: '📝 Proposal submitted',
                  policy_evaluated: '🛡️ Policy evaluated',
                  warrant_issued: '✅ Warrant issued',
                  execution_completed: '⚡ Execution completed',
                  verification_passed: '✓ Verification passed',
                  proposal_denied: '❌ Proposal denied',
                  auto_approved: '🟢 Auto-approved',
                  proposal_auto_approved: '🟢 Auto-approved',
                  proposal_pending_review: '⏳ Pending review',
                  api_key_created: '🔐 API key created',
                  password_reset_requested: '🔄 Password reset',
                  execution_verified: '✓ Execution verified',
                };
                const label = eventLabels[event.type] || `📌 ${event.type?.replace(/_/g, ' ')}`;
                const age = formatAge(event.timestamp);
                return (
                  <div key={event.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 14 ? '1px solid #1f2937' : 'none' }}>
                    <div>
                      <span style={{ fontSize: 13, color: '#e5e7eb' }}>{label}</span>
                      {event.riskTier && <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 8, background: '#1f2937', padding: '1px 6px', borderRadius: 3 }}>{event.riskTier}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{event.actor}</span>
                      <span style={{ fontSize: 11, color: '#4b5563', minWidth: 60, textAlign: 'right' }}>{age}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: 20 }}>No recent activity</div>
          )}
        </Section>

        {/* Quick Links */}
        <Section title="🔗 Quick Links">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Operator Console', href: 'https://console.regulator.ai', icon: '🖥️' },
              { label: 'Marketing Site', href: 'https://regulator.ai', icon: '🌐' },
              { label: 'API Docs', href: 'https://regulator.ai/docs', icon: '📖' },
              { label: 'GitHub', href: 'https://github.com/risk-ai/regulator.ai', icon: '🐙' },
              { label: 'Stripe Dashboard', href: 'https://dashboard.stripe.com', icon: '💳' },
              { label: 'GA4 Analytics', href: 'https://analytics.google.com/analytics/web/#/p/G-7LZLG0D79N', icon: '📊' },
              { label: 'Vercel', href: 'https://vercel.com/ai-ventures', icon: '▲' },
              { label: 'Neon DB', href: 'https://console.neon.tech', icon: '🗄️' },
            ].map(link => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#0a0a0f', border: '1px solid #1f2937', borderRadius: 8, textDecoration: 'none', color: '#d1d5db', fontSize: 13, transition: 'border-color 150ms' }}>
                <span style={{ fontSize: 16 }}>{link.icon}</span>{link.label}
              </a>
            ))}
          </div>
        </Section>

        {/* Business Metrics */}
        <Section title="📈 Business Metrics">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ padding: 16, background: '#0a0a0f', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>MRR</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>$0</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Target: $10K in 90 days</div>
            </div>
            <div style={{ padding: 16, background: '#0a0a0f', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Customers</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>0</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Target: 20 in 90 days</div>
            </div>
            <div style={{ padding: 16, background: '#0a0a0f', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>GitHub Stars</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>0</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Target: 3K in 90 days</div>
            </div>
          </div>
        </Section>

        <div style={{ textAlign: 'center', padding: '24px 0', color: '#374151', fontSize: 11 }}>
          Vienna OS v1.0 • regulator.ai • © 2026 Technetwork 2 LLC dba ai.ventures
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================
function formatAge(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
