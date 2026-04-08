/**
 * RuntimeControlPanel Component
 * 
 * Runtime control and emergency actions panel
 */

import React from 'react';
import { AlertOctagon } from 'lucide-react';

interface RuntimeStatus {
  operatingMode: string;
  governanceLock: 'active' | 'inactive';
  reconciliationInterval: string;
  emergencyHaltEnabled: boolean;
}

interface RuntimeControlPanelProps {
  status: RuntimeStatus;
  onEmergencyHalt?: () => void;
  loading?: boolean;
}

export function RuntimeControlPanel({ 
  status, 
  onEmergencyHalt, 
  loading = false 
}: RuntimeControlPanelProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#12131a] to-[#1a1b26] border border-[rgba(255,255,255,0.08)] rounded-3xl p-10 flex flex-col animate-pulse">
        <div className="h-5 w-32 bg-[rgba(255,255,255,0.1)] rounded mb-8" />
        <div className="space-y-8">
          <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded" />
          <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded" />
          <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#12131a] to-[#1a1b26] border border-[rgba(255,255,255,0.08)] rounded-3xl p-10 flex flex-col">
      {/* Header */}
      <h3 className="text-[15px] font-bold text-[rgba(255,255,255,0.55)] uppercase tracking-[0.2em] mb-8">
        Runtime Control
      </h3>
      
      {/* Status Items */}
      <div className="space-y-8 flex-1">
        {/* Operating Mode */}
        <div className="flex items-center justify-between">
          <span className="text-[15px] text-[rgba(255,255,255,0.7)]">Operating Mode</span>
          <span className="px-4 py-1 bg-amber-600/20 border border-amber-600/40 rounded-lg text-[13px] font-bold text-amber-400">
            {status.operatingMode}
          </span>
        </div>
        
        {/* Governance Lock */}
        <div className="flex items-center justify-between">
          <span className="text-[15px] text-[rgba(255,255,255,0.7)]">Governance Lock</span>
          <div className="flex items-center gap-3">
            <span className={`text-[15px] font-bold font-mono ${
              status.governanceLock === 'active' ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {status.governanceLock.toUpperCase()}
            </span>
            <div className={`w-4 h-4 rounded-full ${
              status.governanceLock === 'active' 
                ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' 
                : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
            }`} />
          </div>
        </div>
        
        {/* Reconciliation Interval */}
        <div className="flex items-center justify-between">
          <span className="text-[15px] text-[rgba(255,255,255,0.7)]">Reconciliation</span>
          <span className="text-[15px] text-white font-bold font-mono">
            {status.reconciliationInterval}
          </span>
        </div>
        
        {/* Emergency Halt Button */}
        {status.emergencyHaltEnabled && (
          <div className="pt-8">
            <button
              onClick={onEmergencyHalt}
              className="w-full py-4 bg-red-600/10 border border-red-600/40 text-red-500 text-[14px] font-bold rounded-2xl hover:bg-red-600/20 transition-all flex items-center justify-center gap-3"
            >
              <AlertOctagon className="w-5 h-5" />
              INITIATE EMERGENCY HALT
            </button>
          </div>
        )}
      </div>
      
      {/* Operator Context */}
      <div className="mt-10 p-6 bg-black/30 rounded-2xl">
        <div className="text-[11px] font-bold text-[rgba(255,255,255,0.35)] uppercase tracking-[0.1em] mb-2">
          Operator Context
        </div>
        <p className="text-[13px] text-[rgba(255,255,255,0.55)]">
          Manual override is currently disabled. Contact Admin Level 5 for structural policy changes.
        </p>
      </div>
    </div>
  );
}
