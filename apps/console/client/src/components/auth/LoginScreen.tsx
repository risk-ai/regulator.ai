/**
 * Login Screen — Vienna OS
 * 
 * Supports both login (existing operators) and registration (new operators).
 * Dark theme with Vienna OS branding.
 */

import React, { useState, FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore.js';

export function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const { login, register, loading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    if (mode === 'register') {
      if (!username.trim() || username.length < 3) return;
      await register({ username: username.trim(), password, email: email.trim() || undefined, company: company.trim() || undefined });
    } else {
      await login(password, username.trim() || undefined);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    clearError();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0F14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Vienna<span style={{ color: '#7c3aed' }}>OS</span>
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            {mode === 'login' ? 'Sign in to the governance console' : 'Create your operator account'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          background: '#111826',
          border: '1px solid #1E293B',
          borderRadius: '12px',
          padding: '24px',
        }}>
          {/* Username */}
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="username" style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
              Username {mode === 'register' && <span style={{ color: '#7c3aed' }}>*</span>}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); clearError(); }}
              placeholder={mode === 'login' ? 'vienna' : 'your-username'}
              autoComplete="username"
              style={{
                width: '100%',
                background: '#0D0F14',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '14px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Email (register only) */}
          {mode === 'register' && (
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                style={{
                  width: '100%',
                  background: '#0D0F14',
                  border: '1px solid #1E293B',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Company (register only) */}
          {mode === 'register' && (
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="company" style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                Company
              </label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corp"
                style={{
                  width: '100%',
                  background: '#0D0F14',
                  border: '1px solid #1E293B',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Password */}
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
              Password <span style={{ color: '#7c3aed' }}>*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError(); }}
              placeholder={mode === 'register' ? 'min 8 characters' : '••••••••'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              style={{
                width: '100%',
                background: '#0D0F14',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '14px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(248, 113, 113, 0.08)',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '14px',
              fontSize: '13px',
              color: '#f87171',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: loading ? '#334155' : '#7c3aed',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 150ms',
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={switchMode}
            style={{
              background: 'none',
              border: 'none',
              color: '#7c3aed',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </button>
        </div>

        {/* Demo credentials hint */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          padding: '12px',
          background: 'rgba(124, 58, 237, 0.05)',
          border: '1px solid rgba(124, 58, 237, 0.1)',
          borderRadius: '8px',
        }}>
          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
            <strong style={{ color: '#94a3b8' }}>Sandbox:</strong> vienna / vienna2024
          </p>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '11px', color: '#334155', margin: 0 }}>
            Built at Cornell Law × ai.ventures
          </p>
        </div>
      </div>
    </div>
  );
}
