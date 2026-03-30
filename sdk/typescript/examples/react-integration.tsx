/**
 * React Integration Example for Vienna OS
 * Copy these patterns into your frontend
 */

import React, { useState, useEffect } from 'react';
import { ViennaClient } from '@vienna-os/sdk';
import type { Approval, ExecutionResult } from '@vienna-os/sdk';

// Initialize client (do this once, maybe in a context provider)
const vienna = new ViennaClient({
  baseUrl: 'https://console.regulator.ai/api/v1'
});

/**
 * Example 1: Login Component
 */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { token, user } = await vienna.login(email, password);
      
      // Store token
      localStorage.setItem('vienna_token', token);
      localStorage.setItem('vienna_user', JSON.stringify(user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

/**
 * Example 2: Approval Dashboard
 */
export function ApprovalDashboard() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadApprovals();
  }, [filter]);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await vienna.getApprovals({ 
        status: filter,
        // tier: 'T1' // optional filter
      });
      setApprovals(data);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      await vienna.approve(
        approvalId,
        'current-user@example.com', // Get from stored user
        'Approved via dashboard'
      );
      
      // Reload approvals
      loadApprovals();
      
      // Show success toast
      alert('Action approved!');
    } catch (err: any) {
      alert('Approval failed: ' + err.message);
    }
  };

  const handleReject = async (approvalId: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;

    try {
      await vienna.reject(
        approvalId,
        'current-user@example.com',
        reason
      );
      
      loadApprovals();
      alert('Action rejected!');
    } catch (err: any) {
      alert('Rejection failed: ' + err.message);
    }
  };

  if (loading) return <div>Loading approvals...</div>;

  return (
    <div className="approval-dashboard">
      <div className="filters">
        <button onClick={() => setFilter('pending')}>Pending</button>
        <button onClick={() => setFilter('approved')}>Approved</button>
        <button onClick={() => setFilter('rejected')}>Rejected</button>
      </div>

      <div className="approvals-list">
        {approvals.length === 0 ? (
          <p>No {filter} approvals</p>
        ) : (
          approvals.map((approval) => (
            <div key={approval.approval_id} className="approval-card">
              <div className="approval-header">
                <span className={`tier tier-${approval.required_tier}`}>
                  {approval.required_tier}
                </span>
                <span className="status">{approval.status}</span>
              </div>
              
              <div className="approval-body">
                <h3>{approval.action_summary}</h3>
                <p>{approval.risk_summary}</p>
                <small>Requested: {new Date(approval.requested_at!).toLocaleString()}</small>
              </div>

              {approval.status === 'pending' && (
                <div className="approval-actions">
                  <button 
                    onClick={() => handleApprove(approval.approval_id)}
                    className="btn-approve"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleReject(approval.approval_id)}
                    className="btn-reject"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Example 3: Execute Action with Feedback
 */
export function ActionExecutor() {
  const [action, setAction] = useState('');
  const [agentId, setAgentId] = useState('');
  const [tier, setTier] = useState<'T0' | 'T1' | 'T2' | 'T3'>('T0');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    setLoading(true);
    setResult(null);

    try {
      const execResult = await vienna.execute({
        action,
        agentId,
        tier,
        context: {
          // Add any context data
          timestamp: new Date().toISOString()
        }
      });

      setResult(execResult);

      if (execResult.requires_approval) {
        alert(`Action submitted for approval. Execution ID: ${execResult.execution_id}`);
      } else {
        alert(`Action executed! Warrant ID: ${execResult.warrant_id}`);
      }
    } catch (err: any) {
      alert('Execution failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="action-executor">
      <h2>Execute Action</h2>
      
      <input
        type="text"
        value={action}
        onChange={(e) => setAction(e.target.value)}
        placeholder="Action (e.g., send_email)"
      />
      
      <input
        type="text"
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        placeholder="Agent ID"
      />

      <select value={tier} onChange={(e) => setTier(e.target.value as any)}>
        <option value="T0">T0 (Low Risk)</option>
        <option value="T1">T1 (Medium Risk)</option>
        <option value="T2">T2 (High Risk)</option>
        <option value="T3">T3 (Critical)</option>
      </select>

      <button onClick={handleExecute} disabled={loading || !action || !agentId}>
        {loading ? 'Executing...' : 'Execute'}
      </button>

      {result && (
        <div className="result">
          <h3>Result:</h3>
          <p>Execution ID: {result.execution_id}</p>
          <p>Status: {result.status}</p>
          {result.warrant_id && <p>Warrant: {result.warrant_id}</p>}
          {result.requires_approval && (
            <p className="warning">⏳ Waiting for approval</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Real-time Event Listener
 */
export function RealtimeEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = vienna.createEventStream(
      (event) => {
        console.log('New event:', event);
        setEvents(prev => [event, ...prev].slice(0, 20)); // Keep last 20

        // Show notification for specific events
        if (event.type === 'execution.approval_required') {
          new Notification('New Approval Required', {
            body: `Execution ${event.execution_id} needs approval`
          });
        }
      },
      (error) => {
        console.error('Event stream error:', error);
        setConnected(false);
      }
    );

    setConnected(true);

    // Cleanup
    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, []);

  return (
    <div className="realtime-events">
      <div className="status">
        {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <h3>Recent Events:</h3>
      <div className="events-list">
        {events.map((event, idx) => (
          <div key={idx} className="event">
            <strong>{event.type}</strong>
            <small>{new Date(event.timestamp).toLocaleTimeString()}</small>
            <pre>{JSON.stringify(event, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example 5: Policy List Component
 */
export function PolicyList() {
  const [policies, setPolicies] = useState<any[]>([]);

  useEffect(() => {
    vienna.getPolicies({ enabled: true }).then(setPolicies);
  }, []);

  return (
    <div className="policy-list">
      {policies.map(policy => (
        <div key={policy.id} className="policy-card">
          <h3>{policy.name}</h3>
          <p>{policy.description}</p>
          <span className="tier">{policy.tier}</span>
          <span className="priority">Priority: {policy.priority}</span>
        </div>
      ))}
    </div>
  );
}

// CSS Suggestions (Tailwind alternatives shown in comments)
const styles = `
.approval-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  /* @apply border rounded-lg p-4 mb-4 */
}

.tier-T0 { background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; }
.tier-T1 { background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; }
.tier-T2 { background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; }
.tier-T3 { background: #7c2d12; color: white; padding: 4px 8px; border-radius: 4px; }

.btn-approve {
  background: #10b981;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  /* @apply bg-green-500 text-white px-4 py-2 rounded */
}

.btn-reject {
  background: #ef4444;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  /* @apply bg-red-500 text-white px-4 py-2 rounded */
}
`;
