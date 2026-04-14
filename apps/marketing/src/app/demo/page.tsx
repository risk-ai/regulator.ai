/**
 * Interactive Demo Page — Vienna OS
 * Embedded console preview with mock data for visitors to try before signing up
 */

'use client';

import React, { useState } from 'react';

const SAMPLE_EVENTS = [
  { time: '14:32:05', type: 'intent', agent: 'Marketing Bot', action: 'send_email', tier: 'T0', status: 'approved' },
  { time: '14:31:48', type: 'approval', agent: 'Finance Agent', action: 'charge_card', tier: 'T2', status: 'pending' },
  { time: '14:31:22', type: 'warrant', agent: 'Data Agent', action: 'update_database', tier: 'T1', status: 'issued' },
  { time: '14:30:55', type: 'execution', agent: 'Marketing Bot', action: 'send_email', tier: 'T0', status: 'completed' },
];

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'policies'>('dashboard');
  const [selectedEvent, setSelectedEvent] = useState(SAMPLE_EVENTS[0]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e6e1dc]">
      {/* Header */}
      <div className="border-b border-white/[0.08] bg-[#12131a]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🎮</span>
            <h1 className="text-4xl font-bold text-white">Interactive Demo</h1>
          </div>
          <p className="text-lg text-white/60 max-w-2xl">
            Try Vienna OS in your browser. Explore the governance pipeline with live sample data.
          </p>
        </div>
      </div>

      {/* Demo Interface */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-[#12131a] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
          {/* Tab Navigation */}
          <div className="flex border-b border-white/[0.08] bg-[#0a0a0f]/50">
            {(['dashboard', 'approvals', 'policies'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? 'text-amber-400 border-b-2 border-amber-500'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-[#0a0a0f] border border-white/[0.08] rounded-lg p-4">
                  <div className="text-xs text-white/40 uppercase mb-2">Proposals Today</div>
                  <div className="text-3xl font-bold text-amber-400">127</div>
                  <div className="text-xs text-green-400 mt-1">+12% vs yesterday</div>
                </div>
                <div className="bg-[#0a0a0f] border border-white/[0.08] rounded-lg p-4">
                  <div className="text-xs text-white/40 uppercase mb-2">Active Agents</div>
                  <div className="text-3xl font-bold text-blue-400">8</div>
                  <div className="text-xs text-white/40 mt-1">All operational</div>
                </div>
                <div className="bg-[#0a0a0f] border border-white/[0.08] rounded-lg p-4">
                  <div className="text-xs text-white/40 uppercase mb-2">Pending Approvals</div>
                  <div className="text-3xl font-bold text-amber-400">3</div>
                  <div className="text-xs text-red-400 mt-1">Requires attention</div>
                </div>
                <div className="bg-[#0a0a0f] border border-white/[0.08] rounded-lg p-4">
                  <div className="text-xs text-white/40 uppercase mb-2">Compliance Score</div>
                  <div className="text-3xl font-bold text-green-400">98</div>
                  <div className="text-xs text-green-400 mt-1">Excellent</div>
                </div>
              </div>

              <div className="bg-[#0a0a0f] border border-white/[0.08] rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white/60 uppercase mb-4">Recent Activity</h3>
                <div className="space-y-2">
                  {SAMPLE_EVENTS.map((event, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedEvent(event)}
                      className="flex items-center justify-between p-3 bg-[#12131a] border border-white/[0.08] rounded-lg cursor-pointer hover:border-amber-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-white/40">{event.time}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          event.type === 'intent' ? 'bg-blue-500/20 text-blue-400' :
                          event.type === 'approval' ? 'bg-amber-500/20 text-amber-400' :
                          event.type === 'warrant' ? 'bg-green-500/20 text-green-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {event.type}
                        </span>
                        <span className="text-sm text-white/80">{event.agent}</span>
                        <span className="text-xs text-white/40">→</span>
                        <span className="text-sm font-mono text-white/60">{event.action}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        event.tier === 'T0' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        event.tier === 'T1' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {event.tier}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Approvals View */}
          {activeTab === 'approvals' && (
            <div className="p-6">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 rounded">T2</span>
                      <span className="text-lg font-bold text-white">High-Risk Action Requires Approval</span>
                    </div>
                    <p className="text-white/60 mb-4">Finance Agent requesting charge_card for $2,500 invoice payment</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Agent:</span>
                        <span className="font-mono text-white">Finance Agent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Action:</span>
                        <span className="font-mono text-white">charge_card</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Risk Tier:</span>
                        <span className="font-semibold text-red-400">T2 (Multi-Party Approval)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-green-500 text-black font-semibold rounded-lg hover:bg-green-400 transition-colors">
                      ✓ Approve
                    </button>
                    <button className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-lg hover:bg-red-500/30 transition-colors">
                      ✕ Deny
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center py-12 text-white/40">
                <p>This is a demo interface. Sign up to manage real approvals.</p>
              </div>
            </div>
          )}

          {/* Policies View */}
          {activeTab === 'policies' && (
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-[#0a0a0f] border border-white/[0.08] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Financial Transaction Policy</h4>
                    <span className="px-2 py-1 text-xs font-semibold bg-green-500/20 text-green-400 rounded">Active</span>
                  </div>
                  <p className="text-sm text-white/60 mb-3">Any charge over $1000 requires multi-party approval</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded">Risk: T2</span>
                    <span className="text-white/40">→</span>
                    <span className="text-white/60">2 approvers required</span>
                  </div>
                </div>

                <div className="bg-[#0a0a0f] border border-white/[0.08] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Marketing Actions</h4>
                    <span className="px-2 py-1 text-xs font-semibold bg-green-500/20 text-green-400 rounded">Active</span>
                  </div>
                  <p className="text-sm text-white/60 mb-3">Email campaigns auto-approve with daily limits</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded">Risk: T0</span>
                    <span className="text-white/40">→</span>
                    <span className="text-white/60">Auto-approved</span>
                  </div>
                </div>

                <div className="bg-[#0a0a0f] border border-white/[0.08] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Database Modifications</h4>
                    <span className="px-2 py-1 text-xs font-semibold bg-green-500/20 text-green-400 rounded">Active</span>
                  </div>
                  <p className="text-sm text-white/60 mb-3">Production DB writes require operator review</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">Risk: T1</span>
                    <span className="text-white/40">→</span>
                    <span className="text-white/60">1 approver required</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-white/60 mb-6">This is a demo environment with sample data.</p>
          <a
            href="https://console.regulator.ai"
            className="inline-block px-8 py-4 bg-amber-500 text-black text-lg font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            Start Your Free Trial →
          </a>
          <p className="text-sm text-white/40 mt-4">No credit card required • 14-day free trial</p>
        </div>
      </div>
    </div>
  );
}
