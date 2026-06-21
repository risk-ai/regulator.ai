/**
 * Accept Invitation Page
 * Handles team invitation links: /accept-invite?token=<token>
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link — no token provided.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/team/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim() || undefined, password: password || undefined }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0d0d14',
    padding: '24px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#12131a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '4px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  if (!token) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ color: '#e2e8f0', marginBottom: '8px' }}>Invalid Link</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              This invitation link is missing a token. Please use the link from your email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: '#e2e8f0', marginBottom: '8px' }}>Invitation Accepted!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Your account has been set up. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏛️</div>
          <h1 style={{ color: '#e2e8f0', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
            Join Vienna OS Workspace
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            You've been invited to collaborate on AI governance.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Your Name <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></label>
            <input
              type="text"
              placeholder="Jane Smith"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Password <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional — skip if using SSO)</span></label>
            <input
              type="password"
              placeholder="Choose a password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {password && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {error && (
            <div style={{
              marginBottom: '16px',
              padding: '10px 14px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '4px',
              color: '#ef4444',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? 'rgba(99,102,241,0.5)' : '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Setting up account...' : 'Accept Invitation'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          By accepting, you agree to Vienna OS terms of service
        </p>
      </div>
    </div>
  );
}
