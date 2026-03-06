'use client';

import React from 'react';
import PremiumLayout from '@/layout/PremiumLayout';
import { useNodeStateStore } from '@/modules/nodeState';
import { FileText, AlertCircle, Clock, ShieldCheck, Activity, ArrowRight, Zap, BarChart3, Shield } from 'lucide-react';

const ReportsPage: React.FC = () => {
  const simulationResults = useNodeStateStore((s) => s.simulationResults);
  const backendResult = useNodeStateStore((s) => s.backendResult);

  const hasResults = !!simulationResults && !!backendResult;
  const isResilient = backendResult?.resilience_summary?.is_resilient === true;

  return (
    <PremiumLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8 overflow-y-auto h-full custom-scrollbar">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#111]">Security Report</h1>
          <p className="text-[13px] text-[#9CA3AF]">
            {hasResults ? `Generated from simulation ${backendResult.request_id?.slice(0, 8) || ''}` : 'Run a simulation to generate a report'}
          </p>
        </header>

        {hasResults ? (
          <div className="space-y-6">
            {/* Resilient Architecture Banner */}
            {isResilient && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-600" />
                <div>
                  <h3 className="text-[14px] font-semibold text-emerald-700">Resilient Architecture</h3>
                  <p className="text-[12px] text-emerald-600 mt-0.5">
                    {backendResult?.resilience_summary?.reason || 'No viable attack paths were identified. The system demonstrates strong defensive posture.'}
                  </p>
                </div>
              </div>
            )}

            {/* Report Header Card */}
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#111] rounded-lg flex items-center justify-center">
                    <FileText size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#111]">Attack Simulation Report</h3>
                    <p className="text-[11px] text-[#9CA3AF] font-mono">
                      {backendResult.version || 'v1.0.0'} · {backendResult.execution_time ? `${backendResult.execution_time}s` : '--'}
                    </p>
                  </div>
                </div>
                <SeverityBadge severity={simulationResults.severity} />
              </div>
            </div>

            {/* Section 1: Risk Score */}
            <ReportSection
              icon={<AlertCircle size={14} />}
              title="Risk Assessment"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ReportMetric label="Risk Score" value={backendResult.risk_score?.toFixed(1) ?? '--'} />
                <ReportMetric label="Severity" value={simulationResults.severity || '--'} />
                <ReportMetric label="Advanced Risk" value={backendResult.advanced_risk?.toFixed(2) ?? '--'} />
                <ReportMetric label="Attack Paths" value={String(simulationResults.attackPaths ?? 0)} />
              </div>
            </ReportSection>

            {/* Section 2: Attack Path */}
            <ReportSection
              icon={<Zap size={14} />}
              title="Attack Path"
            >
              {backendResult.primary_path && backendResult.primary_path.length > 0 ? (
                <div>
                  <p className="text-[11px] text-[#9CA3AF] mb-3">
                    Entry: <span className="font-mono text-[#111]">{backendResult.entry_point}</span> → Target: <span className="font-mono text-[#111]">{backendResult.target}</span>
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {backendResult.primary_path.map((node: string, i: number) => (
                      <React.Fragment key={i}>
                        <span className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-[12px] font-mono text-[#DC2626] font-medium">
                          {node}
                        </span>
                        {i < backendResult.primary_path.length - 1 && (
                          <ArrowRight size={12} className="text-[#D1D5DB]" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  {backendResult.vulnerability_chain && backendResult.vulnerability_chain.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Vulnerability Chain</h5>
                      <ol className="space-y-1">
                        {backendResult.vulnerability_chain.map((v: string, i: number) => (
                          <li key={i} className="text-[12px] text-[#374151] leading-relaxed">
                            <span className="text-[#9CA3AF] tabular-nums mr-2">{i + 1}.</span> {v}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState message="No attack path identified" />
              )}
            </ReportSection>

            {/* Section 3: Breach Time */}
            <ReportSection
              icon={<Clock size={14} />}
              title="Breach Time Estimate"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <ReportMetric label="Total Time" value={simulationResults.estimatedBreachTime || '--'} />
                <ReportMetric label="Confidence" value={`${simulationResults.confidenceScore ?? 0}%`} />
                {simulationResults.monteCarloRate != null && simulationResults.monteCarloRate > 0 && (
                  <ReportMetric label="Monte Carlo Success" value={`${simulationResults.monteCarloRate.toFixed(1)}%`} />
                )}
              </div>
              {backendResult.breach_time_data?.breakdown && backendResult.breach_time_data.breakdown.length > 0 && (
                <div>
                  <h5 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Step Breakdown</h5>
                  <div className="space-y-1.5">
                    {backendResult.breach_time_data.breakdown.map((step: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[12px] py-1.5 border-b border-[#F3F4F6] last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[#9CA3AF] tabular-nums w-5">{i + 1}.</span>
                          <span className="font-mono text-[#374151]">{step.node}</span>
                          <span className="text-[#9CA3AF]">· {step.step_type}</span>
                        </div>
                        <span className="font-semibold text-[#111] tabular-nums">{step.adjusted_minutes}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ReportSection>

            {/* Section 4: Confidence Score */}
            <ReportSection
              icon={<ShieldCheck size={14} />}
              title="Confidence Analysis"
            >
              <div className="grid grid-cols-2 gap-4 mb-4">
                <ReportMetric label="Score" value={`${simulationResults.confidenceScore ?? 0}%`} />
                <ReportMetric label="Label" value={backendResult.confidence_label || '--'} />
              </div>
              {backendResult.confidence_factors && Object.keys(backendResult.confidence_factors).length > 0 && (
                <div>
                  <h5 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Contributing Factors</h5>
                  <div className="space-y-1.5">
                    {Object.entries(backendResult.confidence_factors).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-[12px] py-1 border-b border-[#F3F4F6] last:border-0">
                        <span className="text-[#6B7280] capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-[#111] tabular-nums">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ReportSection>

            {/* Section 5: Business Impact */}
            <ReportSection
              icon={<BarChart3 size={14} />}
              title="Business Impact"
            >
              {backendResult.business_impact ? (
                <div className="space-y-4">
                  {backendResult.business_impact.data_risk && (
                    <ImpactBlock label="Data Risk" content={backendResult.business_impact.data_risk} />
                  )}
                  {backendResult.business_impact.operational_risk && (
                    <ImpactBlock label="Operational Risk" content={backendResult.business_impact.operational_risk} />
                  )}
                  {backendResult.business_impact.compliance_risk && (
                    <ImpactBlock label="Compliance Risk" content={backendResult.business_impact.compliance_risk} />
                  )}
                  {backendResult.business_impact.summary_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {backendResult.business_impact.summary_tags.map((tag: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-[#F3F4F6] border border-[#E5E5E5] rounded text-[10px] font-mono text-[#6B7280]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState message="No business impact data available" />
              )}
            </ReportSection>

            {/* Section 6: Defender Recommendations */}
            {backendResult.defender_recommendations && backendResult.defender_recommendations.length > 0 && (
              <ReportSection
                icon={<Shield size={14} />}
                title="Defender Recommendations"
              >
                <div className="space-y-2">
                  {backendResult.defender_recommendations.map((rec: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b border-[#F3F4F6] last:border-0">
                      <span className="text-[11px] font-semibold text-[#9CA3AF] tabular-nums mt-0.5">{i + 1}.</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-mono text-[#111] font-medium">{rec.node}</span>
                          <span className="text-[11px] font-semibold text-[#DC2626] tabular-nums">
                            Priority: {rec.priority_score}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">{rec.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ReportSection>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#E5E5E5] rounded-xl">
            <FileText size={40} className="text-[#D1D5DB] mb-4" />
            <h3 className="text-[15px] font-semibold text-[#374151] mb-1">No Report Available</h3>
            <p className="text-[13px] text-[#9CA3AF] text-center max-w-[320px]">
              Run an attack simulation first. The report will be generated automatically from the simulation results.
            </p>
          </div>
        )}
      </div>
    </PremiumLayout>
  );
};

/* ── Sub-Components ─── */

const ReportSection = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="bg-white border border-[#E5E5E5] rounded-xl p-6">
    <h3 className="text-[11px] text-[#9CA3AF] uppercase font-semibold tracking-wider flex items-center gap-2 mb-4">
      {icon} {title}
    </h3>
    {children}
  </div>
);

const ReportMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-lg p-3">
    <span className="text-[10px] text-[#9CA3AF] uppercase font-semibold tracking-wide block mb-0.5">{label}</span>
    <span className="text-[16px] font-semibold text-[#111] tabular-nums">{value}</span>
  </div>
);

const SeverityBadge = ({ severity }: { severity?: string }) => {
  const color = severity === 'Critical' ? 'bg-purple-100 text-purple-700 border-purple-200'
    : severity === 'High' ? 'bg-red-50 text-[#DC2626] border-red-100'
      : severity === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-emerald-50 text-emerald-700 border-emerald-100';
  return (
    <span className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase border ${color}`}>
      {severity || 'N/A'}
    </span>
  );
};

const ImpactBlock = ({ label, content }: { label: string; content: string }) => (
  <div>
    <h5 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">{label}</h5>
    <p className="text-[12px] text-[#374151] leading-relaxed whitespace-pre-wrap">{content}</p>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="h-16 flex items-center justify-center border border-dashed border-[#E5E5E5] rounded-lg">
    <p className="text-[12px] text-[#9CA3AF]">{message}</p>
  </div>
);

export default ReportsPage;
