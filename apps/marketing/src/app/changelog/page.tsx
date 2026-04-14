/**
 * Changelog Page — Vienna OS
 * Product updates, feature releases, and improvements
 */

import React from 'react';

export const metadata = {
  title: 'Changelog | Vienna OS',
  description: 'Product updates, feature releases, and improvements for Vienna OS',
};

const CHANGELOG_ENTRIES = [
  {
    date: '2026-04-14',
    version: 'v1.3.0',
    title: 'Team Management & RBAC',
    items: [
      'Team Management: Invite users, assign roles (Admin/Operator/Viewer)',
      'Role-based access control (RBAC) across console',
      'Simulation/Sandbox mode for testing policies',
      'Integrations API for Slack, Email, Webhooks, GitHub',
    ],
  },
  {
    date: '2026-04-08',
    version: 'v1.2.0',
    title: 'Console UI Overhaul',
    items: [
      'Terminal gold theme applied to all pages',
      'Premium dashboard with animated globe',
      'Fleet management with agent trust scores',
      'Compliance reports with PDF/CSV export',
      'Real-time governance live view',
    ],
  },
  {
    date: '2026-03-31',
    version: 'v1.1.0',
    title: 'Authentication & Billing',
    items: [
      'Google OAuth + GitHub OAuth login',
      'Stripe billing integration (Team $49/mo, Business $99/mo)',
      'JWT auth enforcement on all API routes',
      'Rate limiting optimized for production traffic',
    ],
  },
  {
    date: '2026-03-29',
    version: 'v1.0.0',
    title: 'Vienna OS Launch',
    items: [
      'Full governance pipeline: Intent → Policy → Risk → Warrant → Execute → Audit',
      'Policy Builder with visual rule editor',
      'Approval workflows with tier-based routing',
      'Execution ledger with tamper-proof warrants',
      'API-first design with REST endpoints',
      'Python & Node.js SDKs published',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e6e1dc]">
      {/* Header */}
      <div className="border-b border-white/[0.08] bg-[#12131a]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">📋</span>
            <h1 className="text-4xl font-bold text-white">Changelog</h1>
          </div>
          <p className="text-lg text-white/60 max-w-2xl">
            Product updates, feature releases, and improvements for Vienna OS.
          </p>
        </div>
      </div>

      {/* Changelog Entries */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-12">
          {CHANGELOG_ENTRIES.map((entry, idx) => (
            <div key={idx} className="relative pl-8 border-l-2 border-amber-500/30">
              {/* Date Badge */}
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-amber-500 border-2 border-[#0a0a0f]" />

              {/* Content */}
              <div className="mb-2">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-mono text-white/40">{entry.date}</span>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                    {entry.version}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-3">{entry.title}</h2>
              </div>

              <ul className="space-y-2">
                {entry.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2 text-white/70">
                    <span className="text-amber-500 mt-1.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 pt-8 border-t border-white/[0.08] text-center">
          <p className="text-white/60 mb-4">Stay updated on the latest features</p>
          <a
            href="https://console.regulator.ai"
            className="inline-block px-6 py-3 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            Go to Console →
          </a>
        </div>
      </div>
    </div>
  );
}
