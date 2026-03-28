"use client";

import { useState, useMemo } from "react";
import { Shield, DollarSign, Clock, AlertTriangle, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ROICalculator() {
  const [agents, setAgents] = useState(10);
  const [actionsPerDay, setActionsPerDay] = useState(500);
  const [avgIncidentCost, setAvgIncidentCost] = useState(50000);
  const [incidentsPerYear, setIncidentsPerYear] = useState(4);
  const [complianceHoursPerWeek, setComplianceHoursPerWeek] = useState(20);
  const [hourlyRate, setHourlyRate] = useState(150);

  const roi = useMemo(() => {
    // Cost of incidents without governance
    const annualIncidentCost = avgIncidentCost * incidentsPerYear;
    
    // Vienna OS prevents ~85% of incidents (conservative)
    const incidentSavings = annualIncidentCost * 0.85;
    
    // Manual compliance audit savings (automated reporting)
    const weeklyComplianceCost = complianceHoursPerWeek * hourlyRate;
    const annualComplianceCost = weeklyComplianceCost * 52;
    // Vienna OS automates ~70% of compliance work
    const complianceSavings = annualComplianceCost * 0.70;
    
    // Downtime reduction (agents governed = fewer runaway scenarios)
    const downtimeHoursPerIncident = 4;
    const downtimeSavings = incidentsPerYear * downtimeHoursPerIncident * 500 * 0.85; // $500/hr opportunity cost
    
    // Vienna OS cost (estimated based on tier)
    let viennaCost: number;
    if (agents <= 5) viennaCost = 0; // Free tier
    else if (agents <= 25) viennaCost = 49 * 12; // Team
    else viennaCost = 99 * 12; // Business
    
    const totalSavings = incidentSavings + complianceSavings + downtimeSavings;
    const netSavings = totalSavings - viennaCost;
    const roiPercent = viennaCost > 0 ? ((netSavings / viennaCost) * 100) : Infinity;
    const paybackDays = viennaCost > 0 ? Math.ceil((viennaCost / totalSavings) * 365) : 0;

    return {
      annualIncidentCost,
      incidentSavings,
      complianceSavings,
      downtimeSavings,
      totalSavings,
      viennaCost,
      netSavings,
      roiPercent,
      paybackDays,
    };
  }, [agents, actionsPerDay, avgIncidentCost, incidentsPerYear, complianceHoursPerWeek, hourlyRate]);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-navy-950 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
        <Link href="/" className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-8 transition">
          <Shield className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">ROI Calculator</h1>
        <p className="text-xl text-slate-300 max-w-3xl">
          Estimate the cost savings of governing your AI agents with Vienna OS.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-200">Your Environment</h2>
            
            <div>
              <label className="block text-sm text-slate-400 mb-2">Number of AI agents</label>
              <input
                type="range" min={1} max={100} value={agents}
                onChange={(e) => setAgents(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">1</span>
                <span className="text-violet-400 font-medium">{agents} agents</span>
                <span className="text-slate-500">100</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Actions per day (all agents combined)</label>
              <input
                type="range" min={50} max={10000} step={50} value={actionsPerDay}
                onChange={(e) => setActionsPerDay(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">50</span>
                <span className="text-violet-400 font-medium">{actionsPerDay.toLocaleString()}/day</span>
                <span className="text-slate-500">10K</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Average cost per AI incident</label>
              <input
                type="range" min={5000} max={500000} step={5000} value={avgIncidentCost}
                onChange={(e) => setAvgIncidentCost(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">$5K</span>
                <span className="text-violet-400 font-medium">{fmt(avgIncidentCost)}</span>
                <span className="text-slate-500">$500K</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Estimated AI incidents per year (without governance)</label>
              <input
                type="range" min={1} max={24} value={incidentsPerYear}
                onChange={(e) => setIncidentsPerYear(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">1</span>
                <span className="text-violet-400 font-medium">{incidentsPerYear}/year</span>
                <span className="text-slate-500">24</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Hours spent on compliance/audit per week</label>
              <input
                type="range" min={0} max={80} value={complianceHoursPerWeek}
                onChange={(e) => setComplianceHoursPerWeek(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">0</span>
                <span className="text-violet-400 font-medium">{complianceHoursPerWeek} hrs/week</span>
                <span className="text-slate-500">80</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Fully loaded hourly rate (compliance team)</label>
              <input
                type="range" min={50} max={400} step={10} value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">$50</span>
                <span className="text-violet-400 font-medium">{fmt(hourlyRate)}/hr</span>
                <span className="text-slate-500">$400</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-200">Estimated Annual Savings</h2>

            {/* Hero ROI number */}
            <div className="bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/30 rounded-2xl p-8 text-center">
              <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">Net Annual Savings</p>
              <p className="text-5xl font-bold text-emerald-400">{fmt(roi.netSavings)}</p>
              {roi.viennaCost > 0 && (
                <p className="text-sm text-slate-400 mt-2">
                  {roi.roiPercent === Infinity ? "∞" : Math.round(roi.roiPercent).toLocaleString()}% ROI &middot; Payback in {roi.paybackDays} days
                </p>
              )}
              {roi.viennaCost === 0 && (
                <p className="text-sm text-emerald-400 mt-2">Free tier — no cost!</p>
              )}
            </div>

            {/* Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-medium">Incident Prevention</p>
                    <p className="text-xs text-slate-400">85% reduction in AI agent incidents</p>
                  </div>
                </div>
                <p className="text-emerald-400 font-medium">{fmt(roi.incidentSavings)}</p>
              </div>

              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium">Compliance Automation</p>
                    <p className="text-xs text-slate-400">70% reduction in manual audit work</p>
                  </div>
                </div>
                <p className="text-emerald-400 font-medium">{fmt(roi.complianceSavings)}</p>
              </div>

              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-sm font-medium">Downtime Reduction</p>
                    <p className="text-xs text-slate-400">Fewer outages from runaway agents</p>
                  </div>
                </div>
                <p className="text-emerald-400 font-medium">{fmt(roi.downtimeSavings)}</p>
              </div>

              <div className="flex items-center justify-between bg-slate-900/50 border border-violet-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-violet-400" />
                  <div>
                    <p className="text-sm font-medium">Vienna OS Cost</p>
                    <p className="text-xs text-slate-400">
                      {agents <= 5 ? "Community (Free)" : agents <= 25 ? "Team ($49/mo)" : "Business ($99/mo)"}
                    </p>
                  </div>
                </div>
                <p className="text-slate-400 font-medium">-{fmt(roi.viennaCost)}</p>
              </div>
            </div>

            {/* Without governance */}
            <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
              <p className="text-xs text-red-400 uppercase tracking-wider mb-1 font-medium">Without Governance</p>
              <p className="text-2xl font-bold text-red-400">{fmt(roi.annualIncidentCost)}</p>
              <p className="text-xs text-slate-400 mt-1">
                Estimated annual cost from {incidentsPerYear} uncontrolled AI incidents
              </p>
            </div>

            {/* CTA */}
            <div className="flex gap-3 pt-4">
              <Link
                href="/signup"
                className="flex-1 text-center px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition"
              >
                Start Free
              </Link>
              <Link
                href="/try"
                className="flex-1 text-center px-6 py-3 border border-slate-600 hover:border-slate-400 rounded-lg font-medium transition"
              >
                Try Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Methodology note */}
        <div className="mt-16 text-center">
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            Estimates based on industry averages. Incident prevention rate (85%) based on governance-controlled execution reducing unauthorized actions.
            Compliance automation rate (70%) based on automated audit trail generation replacing manual reporting.
            Actual results vary by organization. See{" "}
            <Link href="/case-studies" className="text-violet-400 hover:underline">case studies</Link> for real-world examples.
          </p>
        </div>
      </div>
    </main>
  );
}
