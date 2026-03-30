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
          {/* Email */}
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
              Email <span style={{ color: '#7c3aed' }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError(); }}
              placeholder="you@company.com"
              autoComplete="email"
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

          {/* Name (register only) */}
          {mode === 'register' && (
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="name" style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                autoComplete="name"
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
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
              Password <span style={{ color: '#7c3aed' }}>*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError(); }}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
            {mode === 'register' && (
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>
                Minimum 8 characters, include letters and numbers
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#7F1D1D',
              border: '1px solid #991B1B',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#FCA5A5',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            style={{
              width: '100%',
              background: loading ? '#4c1d95' : '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              opacity: (!email.trim() || !password.trim()) ? 0.5 : 1,
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          {/* Switch mode */}
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7c3aed',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    font: 'inherit',
                  }}
                >
                  Sign up
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
                    color: '#7c3aed',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    font: 'inherit',
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>

        {/* Footer */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: '#475569' }}>
          <p style={{ margin: '0 0 4px 0' }}>Powered by Vienna OS</p>
          <p style={{ margin: 0 }}>
            <a href="https://regulator.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', textDecoration: 'none' }}>
              Learn more
            </a>
            {' • '}
            <a href="https://docs.regulator.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', textDecoration: 'none' }}>
              Documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
