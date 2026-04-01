/**
 * Login Screen — Vienna OS
 * 
 * Premium dark theme with subtle gradients, OAuth options,
 * and polished form design.
 */

import React, { useState, FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore.js';

export function LoginScreen() {
  // Auto-detect register mode from URL params (?mode=register or ?plan=...)
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = (urlParams.get('mode') === 'register' || urlParams.has('plan')) ? 'register' : 'login';
  const selectedPlan = urlParams.get('plan') || '';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const { login, register, loading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    if (mode === 'register') {
      await register({ 
        email: email.trim(), 
        password, 
        name: name.trim() || undefined, 
        company: company.trim() || undefined 
      });
    } else {
      await login(email.trim(), password);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    clearError();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '14px',
    color: '#e2e8f0',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '6px',
    fontWeight: 500,
    letterSpacing: '0.01em',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B0E17 0%, #0D1224 50%, #0F0B1E 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(124, 58, 237, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            marginBottom: '16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
          </div>
          <h1 style={{ 
            fontSize: '22px', 
            fontWeight: 700, 
            color: '#f1f5f9', 
            letterSpacing: '-0.02em',
            margin: '0 0 6px 0',
          }}>
            Vienna<span style={{ color: '#a78bfa' }}>OS</span> Console
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            {mode === 'login' 
              ? 'Sign in to manage your AI governance' 
              : 'Create your operator account'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(17, 24, 39, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(148, 163, 184, 0.08)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.02) inset',
        }}>
          {/* OAuth buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <a
              href="/api/v1/auth/google"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                borderRadius: '10px',
                color: '#cbd5e1',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </a>
            <a
              href="/api/v1/auth/github"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                borderRadius: '10px',
                color: '#cbd5e1',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
          </div>

          {/* Divider */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '20px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(148, 163, 184, 0.08)' }} />
            <span style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              or continue with email
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(148, 163, 184, 0.08)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                placeholder="you@company.com"
                autoComplete="email"
                required
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.4)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.08)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Name (register only) */}
            {mode === 'register' && (
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor="name" style={labelStyle}>Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.4)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}

            {/* Company (register only) */}
            {mode === 'register' && (
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor="company" style={labelStyle}>Organization</label>
                <input
                  id="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.4)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}

            {/* Password */}
            <div style={{ marginBottom: '22px' }}>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.4)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.08)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {mode === 'register' && (
                <p style={{ fontSize: '11px', color: '#475569', margin: '6px 0 0 0' }}>
                  Minimum 8 characters with letters and numbers
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(127, 29, 29, 0.3)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              style={{
                width: '100%',
                background: loading ? 'rgba(124, 58, 237, 0.5)' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: (!email.trim() || !password.trim()) ? 0.5 : 1,
                boxShadow: loading ? 'none' : '0 2px 8px rgba(124, 58, 237, 0.25)',
                letterSpacing: '0.01em',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
                  </svg>
                  Signing in...
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Switch mode */}
          <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            {mode === 'login' ? (
              <>
                New to Vienna OS?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a78bfa',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    padding: 0,
                    font: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a78bfa',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    padding: 0,
                    font: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
          <p style={{ margin: '0 0 6px 0' }}>
            <a href="https://regulator.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'none' }}>
              regulator.ai
            </a>
            {' · '}
            <a href="https://regulator.ai/docs" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'none' }}>
              Documentation
            </a>
            {' · '}
            <a href="https://github.com/risk-ai/vienna-os" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'none' }}>
              GitHub
            </a>
          </p>
          <p style={{ margin: 0, color: '#334155' }}>
            © 2026 Vienna OS · Execution governance for autonomous AI
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
