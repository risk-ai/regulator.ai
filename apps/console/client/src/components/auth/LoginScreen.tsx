/**
 * Login Screen
 * 
 * Operator authentication gate for Vienna Console.
 * Dark theme, Vienna OS branding.
 */

import React, { useState, FormEvent } from 'react';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

export function LoginScreen() {
  const [username, setUsername] = useState('vienna');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuthStore();
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      return;
    }
    
    // Current auth system uses password-only
    // Username field is for future multi-operator support
    await login(password);
  };
  
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Vienna OS Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">
                Vienna<span className="text-purple-400">OS</span>
              </h1>
              <p className="text-sm text-slate-400">
                Operator Console
              </p>
            </div>
          </div>
          <p className="text-slate-500 text-sm">
            Governed AI Execution Layer
          </p>
        </div>
        
        {/* Login Card */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 shadow-2xl">
          {/* Error display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-red-400 hover:text-red-300 transition"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Operator Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
                placeholder="vienna"
              />
            </div>
            
            {/* Password input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            
            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-navy-800 disabled:bg-navy-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>
          
          {/* Demo credentials hint */}
          <div className="mt-6 pt-6 border-t border-navy-700">
            <p className="text-xs text-slate-500 text-center">
              Demo credentials: <span className="text-purple-400 font-mono">vienna</span> / <span className="text-purple-400 font-mono">vienna2024</span>
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600">
            Vienna OS v8.0 — Governed AI Execution Layer
          </p>
          <p className="text-xs text-slate-700 mt-1">
            Built at Cornell Law × ai.ventures
          </p>
        </div>
      </div>
    </div>
  );
}
