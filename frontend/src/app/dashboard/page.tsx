'use client';

import React from 'react';
import PremiumLayout from '@/layout/PremiumLayout';
import { useNodeStateStore } from '@/modules/nodeState';
import { BarChart3, Shield, Activity, AlertTriangle, Clock, ShieldCheck, Zap, GitBranch } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const nodes = useNodeStateStore((s) => s.nodes);
  const edges = useNodeStateStore((s) => s.edges);
  const simulationResults = useNodeStateStore((s) => s.simulationResults);
  const backendResult = useNodeStateStore((s) => s.backendResult);
  const attackPath = useNodeStateStore((s) => s.attackPath);
  const simulationDirty = useNodeStateStore((s) => s.simulationDirty);

  const exposedCount = nodes.filter(n => n.data?.publicExposure).length;
  const compromisedCount = nodes.filter(n => n.data?.compromised).length;
  const hasResults = !!simulationResults;
  const isResilient = backendResult?.resilience_summary?.is_resilient === true;

  return (
    <PremiumLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8 overflow-y-auto h-full custom-scrollbar">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#111]">Security Dashboard</h1>
          <p className="text-[13px] text-[#9CA3AF]">
            {hasResults ? 'Showing results from last simulation' : 'Run a simulation to populate dashboard'}
          </p>
        </header>

        {/* Stale simulation warning */}
        {simulationDirty && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <p className="text-[13px] text-amber-700 font-medium">
              Simulation results outdated. Run simulation again.
            </p>
          </div>
        )}

        {/* Top Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Shield} label="Total Nodes" value={String(nodes.length)} />
          <StatCard icon={GitBranch} label="Connections" value={String(edges.length)} />
          <StatCard
            icon={AlertTriangle}
            label="Exposed"
            value={String(exposedCount)}
            highlight={exposedCount > 0}
          />
          <StatCard
            icon={Activity}
            label="Compromised"
            value={String(compromisedCount)}
            highlight={compromisedCount > 0}
          />
        </div>

        {/* Simulation Results */}
        {hasResults ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resilient Architecture Banner */}
            {isResilient && (
              <div className="md:col-span-2 bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-600" />
                <div>
                  <h3 className="text-[14px] font-semibold text-emerald-700">Resilient Architecture</h3>
                  <p className="text-[12px] text-emerald-600 mt-0.5">
                    {backendResult?.resilience_summary?.reason || 'No viable attack paths found'}
                  </p>
                </div>
              </div>
            )}

            {/* Risk & Scoring */}
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-4">
              <h3 className="text-[11px] text-[#9CA3AF] uppercase font-semibold tracking-wider flex items-center gap-2">
                <AlertTriangle size={13} />
                Risk Assessment
              </h3>
              <div className="space-y-3">
                <MetricRow
                  label="Risk Score"
                  value={backendResult?.risk_score?.toFixed(1) ?? String(simulationResults.riskScore ?? 0)}
                  color={
                    simulationResults.severity === 'Critical' ? 'text-purple-600'
                      : simulationResults.severity === 'High' ? 'text-[#DC2626]'
                        : simulationResults.severity === 'Medium' ? 'text-amber-600'
                          : 'text-emerald-600'
                  }
                />
                <MetricRow label="Severity" value={simulationResults.severity || '--'} />
                <MetricRow label="Attack Paths" value={String(simulationResults.attackPaths ?? 0)} />
                <MetricRow label="Attack Path Length" value={String(attackPath.length)} />
                {simulationResults.exploitProbability != null && simulationResults.exploitProbability > 0 && (
                  <MetricRow
                    label="Breach Probability"
                    value={`${(simulationResults.exploitProbability * 100).toFixed(1)}%`}
                  />
                )}
              </div>
            </div>

            {/* Timing & Confidence */}
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-4">
              <h3 className="text-[11px] text-[#9CA3AF] uppercase font-semibold tracking-wider flex items-center gap-2">
                <Clock size={13} />
                Timing & Confidence
              </h3>
              <div className="space-y-3">
                <MetricRow label="Breach Time" value={simulationResults.estimatedBreachTime || '--'} />
                <MetricRow label="Confidence" value={`${simulationResults.confidenceScore ?? 0}%`} />
                {simulationResults.monteCarloRate != null && simulationResults.monteCarloRate > 0 && (
                  <MetricRow label="Monte Carlo Rate" value={`${simulationResults.monteCarloRate.toFixed(1)}%`} />
                )}
              </div>
            </div>

            {/* Attack Path Display */}
            {backendResult?.primary_path && backendResult.primary_path.length > 0 && (
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 md:col-span-2">
                <h3 className="text-[11px] text-[#9CA3AF] uppercase font-semibold tracking-wider flex items-center gap-2 mb-4">
                  <Zap size={13} />
                  Primary Attack Vector
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {backendResult.primary_path.map((node: string, i: number) => (
                    <React.Fragment key={i}>
                      <span className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-[12px] font-mono text-[#DC2626] font-medium">
                        {node}
                      </span>
                      {i < backendResult.primary_path.length - 1 && (
                        <span className="text-[#D1D5DB]">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Business Impact */}
            {backendResult?.business_impact && (
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 md:col-span-2">
                <h3 className="text-[11px] text-[#9CA3AF] uppercase font-semibold tracking-wider flex items-center gap-2 mb-4">
                  <ShieldCheck size={13} />
                  Business Impact
                </h3>
                <div className="space-y-3">
                  {backendResult.business_impact.data_risk && (
                    <ImpactItem label="Data Risk" content={backendResult.business_impact.data_risk} />
                  )}
                  {backendResult.business_impact.operational_risk && (
                    <ImpactItem label="Operational" content={backendResult.business_impact.operational_risk} />
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#E5E5E5] rounded-xl">
            <BarChart3 size={40} className="text-[#D1D5DB] mb-4" />
            <h3 className="text-[15px] font-semibold text-[#374151] mb-1">No Simulation Data</h3>
            <p className="text-[13px] text-[#9CA3AF] text-center max-w-[320px]">
              Build your infrastructure graph and run a simulation to populate this dashboard with real security metrics.
            </p>
          </div>
        )}
      </div>
    </PremiumLayout>
  );
};

/* ── Sub-Components ─── */

const StatCard = ({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="bg-white border border-[#E5E5E5] p-5 rounded-xl">
    <div className="flex items-center gap-2 text-[#9CA3AF] mb-2">
      <Icon size={14} strokeWidth={1.5} />
      <span className="text-[10px] uppercase font-semibold tracking-wider">{label}</span>
    </div>
    <span className={`text-2xl font-semibold tabular-nums ${highlight ? 'text-[#DC2626]' : 'text-[#111]'}`}>
      {value}
    </span>
  </div>
);

const MetricRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0">
    <span className="text-[12px] text-[#6B7280]">{label}</span>
    <span className={`text-[14px] font-semibold tabular-nums ${color || 'text-[#111]'}`}>{value}</span>
  </div>
);

const ImpactItem = ({ label, content }: { label: string; content: string }) => (
  <div>
    <h5 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">{label}</h5>
    <p className="text-[12px] text-[#374151] leading-relaxed">{content.substring(0, 200)}{content.length > 200 ? '...' : ''}</p>
  </div>
);

export default DashboardPage;
