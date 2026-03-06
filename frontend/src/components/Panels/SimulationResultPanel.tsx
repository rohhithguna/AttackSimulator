'use client';

import React, { useState } from 'react';
import { AlertCircle, Clock, ShieldCheck, Activity, Shield, ArrowRight, RotateCcw, ShieldAlert, Zap, BarChart3, AlertTriangle } from 'lucide-react';
import { useNodeStore } from '../../modules/nodeState';

const SimulationResultPanel: React.FC = () => {
  const {
    simulationResults,
    backendResult,
    isSimulating,
    recommendations,
    applyMitigation,
    isMitigationActive,
    revertMitigation,
    originalRiskScore
  } = useNodeStore();
  const [activeTab, setActiveTab] = useState<'metrics' | 'paths' | 'defender' | 'ai'>('metrics');
  const [aiSubTab, setAiSubTab] = useState<'edge' | 'cloud'>('edge');

  if (!simulationResults && !isSimulating) return null;

  // Handle resilient architecture case
  const isResilient = backendResult?.resilience_summary?.is_resilient === true;

  const severity = simulationResults?.severity || backendResult?.severity;
  const severityColor = severity === 'Critical' ? 'text-purple-600' : severity === 'High' ? 'text-[#DC2626]' : severity === 'Medium' ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div>
      {/* Mitigation Banner */}
      {isMitigationActive && (
        <div className="bg-[#F3F4F6] border-b border-[#E5E5E5] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={13} className="text-[#111]" />
            <span className="text-[11px] font-semibold text-[#111]">Mitigation Active</span>
          </div>
          <button
            onClick={revertMitigation}
            className="flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#111] transition-colors"
          >
            <RotateCcw size={11} /> Revert
          </button>
        </div>
      )}

      {/* Resilient Architecture Banner */}
      {isResilient && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span className="text-[12px] font-medium text-emerald-700">
            Resilient Architecture — No viable attack paths found
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <TabButton active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} label="Metrics" />
        <TabButton active={activeTab === 'paths'} onClick={() => setActiveTab('paths')} label="Paths" />
        <TabButton active={activeTab === 'defender'} onClick={() => setActiveTab('defender')} label="Defender" highlight={recommendations.length > 0} />
        <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} label="AI" />
      </div>

      <div className="p-4">
        {activeTab === 'metrics' && (
          <div className="space-y-3">
            <MetricRow
              icon={<AlertCircle size={16} />}
              label="Risk Score"
              value={isSimulating ? '...' : `${backendResult?.risk_score?.toFixed(1) ?? simulationResults?.riskScore ?? '--'}`}
              suffix={severity ? <span className={`text-[11px] font-semibold ${severityColor}`}>{severity}</span> : null}
              delta={isMitigationActive && originalRiskScore ? {
                value: Math.round(((originalRiskScore - (simulationResults?.riskScore || 0)) / originalRiskScore) * 100),
              } : undefined}
            />
            <MetricRow
              icon={<Activity size={16} />}
              label="Attack Paths"
              value={isSimulating ? '...' : String(simulationResults?.attackPaths ?? '--')}
            />
            <MetricRow
              icon={<Clock size={16} />}
              label="Breach Time"
              value={isSimulating ? '...' : simulationResults?.estimatedBreachTime ?? '--'}
            />
            <MetricRow
              icon={<ShieldCheck size={16} />}
              label="Confidence"
              value={isSimulating ? '...' : `${simulationResults?.confidenceScore ?? '--'}%`}
            />
            {backendResult?.exploit_probability !== undefined && (
              <MetricRow
                icon={<Zap size={16} />}
                label="Exploit Prob"
                value={`${(backendResult.exploit_probability * 100).toFixed(0)}%`}
              />
            )}
            {simulationResults?.monteCarloRate !== undefined && (
              <MetricRow
                icon={<BarChart3 size={16} />}
                label="Monte Carlo"
                value={`${simulationResults.monteCarloRate.toFixed(1)}%`}
              />
            )}
          </div>
        )}

        {activeTab === 'paths' && (
          <div className="space-y-3">
            {backendResult?.primary_path ? (
              <div>
                <div className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide mb-2">Primary Attack Vector</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {backendResult.primary_path.map((node: string, i: number) => (
                    <React.Fragment key={i}>
                      <span className="px-2.5 py-1 bg-red-50 border border-red-100 rounded text-[12px] font-mono text-[#DC2626] font-medium">
                        {node}
                      </span>
                      {i < backendResult.primary_path.length - 1 && (
                        <ArrowRight size={12} className="text-[#D1D5DB]" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                {backendResult.secondary_paths && backendResult.secondary_paths.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] text-[#9CA3AF] mb-2">
                      {backendResult.secondary_paths.length} Secondary
                    </div>
                    {backendResult.secondary_paths.slice(0, 2).map((path: string[], pi: number) => (
                      <div key={pi} className="flex items-center gap-1 mt-1">
                        {path.map((node: string, i: number) => (
                          <React.Fragment key={i}>
                            <span className="text-[11px] font-mono text-[#6B7280]">{node}</span>
                            {i < path.length - 1 && <ArrowRight size={10} className="text-[#D1D5DB]" />}
                          </React.Fragment>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center border border-dashed border-[#E5E5E5] rounded-lg">
                <p className="text-[12px] text-[#9CA3AF]">
                  {isSimulating ? 'Analyzing...' : 'Run simulation to see attack paths'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'defender' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Defensive Actions</h4>
              <span className="text-[11px] text-[#D1D5DB]">{recommendations.length}</span>
            </div>

            {recommendations.length > 0 ? (
              <div className="space-y-2">
                {recommendations.slice(0, 4).map((rec) => (
                  <RecCard
                    key={rec.id}
                    rec={rec}
                    onSimulate={() => applyMitigation(rec)}
                    isActive={isMitigationActive}
                  />
                ))}
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center border border-dashed border-[#E5E5E5] rounded-lg">
                <p className="text-[12px] text-[#9CA3AF]">Run simulation for defense recommendations</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-3">
            {/* AI Analysis Header */}
            <div className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">AI Analysis</div>

            {/* Edge / Cloud Sub-tabs */}
            <div className="flex gap-1 bg-[#F3F4F6] p-1 rounded-lg">
              <button
                onClick={() => setAiSubTab('edge')}
                className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${aiSubTab === 'edge'
                  ? 'bg-white text-[#111] shadow-sm'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
                  }`}
              >
                Edge AI
              </button>
              <button
                onClick={() => setAiSubTab('cloud')}
                className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${aiSubTab === 'cloud'
                  ? 'bg-white text-[#111] shadow-sm'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
                  }`}
              >
                Cloud AI
              </button>
            </div>

            {/* AI Content */}
            <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
              {aiSubTab === 'edge' && (
                <AIProviderPanel
                  data={backendResult?.ai?.edge_ai}
                  providerLabel="Edge Intelligence"
                  unavailableMsg="Edge Intelligence unavailable in this environment."
                />
              )}
              {aiSubTab === 'cloud' && (
                <AIProviderPanel
                  data={backendResult?.ai?.cloud_ai}
                  providerLabel="Cloud Intelligence"
                  unavailableMsg="Cloud AI unavailable. Configure GEMINI_API_KEY to enable."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Sub-components ───────────────────────────────── */

const MetricRow = ({ icon, label, value, suffix, delta }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: React.ReactNode;
  delta?: { value: number };
}) => (
  <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0">
    <div className="flex items-center gap-2.5">
      <div className="text-[#9CA3AF]">{icon}</div>
      <span className="text-[12px] text-[#6B7280]">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-[14px] font-semibold text-[#111] tabular-nums">{value}</span>
      {suffix}
      {delta && (
        <span className="text-[11px] text-emerald-600 font-medium">-{delta.value}%</span>
      )}
    </div>
  </div>
);

const AIProviderPanel = ({ data, providerLabel, unavailableMsg }: {
  data?: { insight?: string; error?: string | null; provider?: string; model?: string };
  providerLabel: string;
  unavailableMsg: string;
}) => {
  if (!data || data.error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-[#E5E5E5] rounded-lg">
        <AlertTriangle size={24} className="text-[#D1D5DB] mb-3" />
        <h5 className="text-[13px] font-semibold text-[#374151] mb-1">{providerLabel} Unavailable</h5>
        <p className="text-[11px] text-[#9CA3AF] text-center leading-relaxed max-w-[260px]">
          {data?.error || unavailableMsg}
        </p>
        <p className="text-[11px] text-[#9CA3AF] text-center mt-2">
          Simulation results are still valid.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.provider && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">{data.provider}</span>
          {data.model && <span className="text-[10px] text-[#D1D5DB]">· {data.model}</span>}
        </div>
      )}
      <p className="text-[12px] text-[#374151] leading-relaxed whitespace-pre-wrap">{data.insight}</p>
    </div>
  );
};

const TabButton = ({ active, onClick, label, highlight }: { active: boolean; onClick: () => void; label: string; highlight?: boolean }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 text-[11px] font-semibold transition-colors relative ${active ? 'text-[#111] border-b-2 border-[#111]' : 'text-[#9CA3AF] hover:text-[#6B7280]'
      }`}
  >
    {label}
    {highlight && !active && (
      <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#DC2626] rounded-full" />
    )}
  </button>
);

const RecCard = ({ rec, onSimulate, isActive }: { rec: any; onSimulate: () => void; isActive: boolean }) => (
  <div className="bg-white border border-[#E5E5E5] p-3 rounded-lg hover:border-[#D1D5DB] transition-colors">
    <div className="flex items-start justify-between gap-3 mb-2">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-[#9CA3AF]" />
        <h5 className="text-[12px] font-medium text-[#111] line-clamp-1">{rec.description}</h5>
      </div>
      <span className="text-[13px] font-semibold text-emerald-600 tabular-nums shrink-0">{rec.estimatedRiskReduction}%</span>
    </div>
    <button
      disabled={isActive}
      onClick={onSimulate}
      className={`w-full py-1.5 rounded-md text-[11px] font-medium border transition-colors ${isActive
        ? 'border-[#E5E5E5] text-[#D1D5DB] cursor-not-allowed'
        : 'border-[#E5E5E5] text-[#6B7280] hover:bg-[#111] hover:text-white hover:border-[#111]'
        }`}
    >
      Simulate Fix
    </button>
  </div>
);

export default SimulationResultPanel;
