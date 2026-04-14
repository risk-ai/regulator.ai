/**
 * Customer Portal — Vienna OS
 * Billing management, plan upgrade/downgrade via Stripe portal
 */

'use client';

import React, { useEffect, useState } from 'react';

export default function PortalPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to Stripe customer portal
    async function redirectToPortal() {
      try {
        const response = await fetch('https://console.regulator.ai/api/v1/billing/portal', {
          method: 'POST',
          credentials: 'include',
        });

        const data = await response.json();

        if (data.success && data.portal_url) {
          // Redirect to Stripe portal
          window.location.href = data.portal_url;
        } else {
          setError('Failed to load billing portal. Please try again or contact support.');
          setLoading(false);
        }
      } catch (err) {
        setError('Network error. Please check your connection and try again.');
        setLoading(false);
      }
    }

    redirectToPortal();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e6e1dc] flex items-center justify-center">
      <div className="max-w-md w-full px-6 text-center">
        {loading ? (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Loading Billing Portal...</h1>
            <p className="text-white/60">
              Redirecting you to Stripe for secure billing management.
            </p>
          </>
        ) : error ? (
          <>
            <div className="text-6xl mb-6">⚠️</div>
            <h1 className="text-2xl font-bold text-white mb-3">Portal Unavailable</h1>
            <p className="text-white/60 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
              >
                Try Again
              </button>
              <a
                href="https://console.regulator.ai/settings?tab=billing"
                className="block w-full px-6 py-3 bg-white/5 text-white border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                Go to Console Settings
              </a>
              <a
                href="mailto:support@regulator.ai"
                className="block text-sm text-amber-400 hover:text-amber-300"
              >
                Contact Support →
              </a>
            </div>
          </>
        ) : null}

        <p className="text-xs text-white/40 mt-12">
          Powered by Stripe • Secure payment processing
        </p>
      </div>
    </div>
  );
}
