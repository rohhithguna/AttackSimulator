'use client';

import React from 'react';
import { ShieldAlert, ArrowRight, ShieldCheck, Zap, BarChart3, Target, Activity, Clock } from 'lucide-react';
import { useNodeStateStore } from '../../modules/nodeState';

const SimulationResultPanel: React.FC = () => {
  const {
    simulationResults,
    backendResult,
    isSimulating,
    recommendations,
    applyMitigation,
    activeMitigations,
    removeMitigation,
    clearMitigations,
    simulationDirty,
    reportTab,
  } = useNodeStateStore();

  if (!isSimulating && !simulationResults && !simulationDirty) return null;

  return (
    <div className="w-full flex flex-col pb-12">

      {/* Metrics Tab */}
      {reportTab === 'metrics' && (
        <div className="grid grid-cols-3 gap-4">
          {/* Risk Score Card */}
          <MetricCard
            label="Risk Score"
            value={isSimulating ? '...' : simulationDirty ? '—' : `${backendResult?.risk_score?.toFixed(1) ?? (simulationResults?.riskScore ? (simulationResults.riskScore / 10).toFixed(1) : '—')}`}
            icon={<ShieldAlert size={14} />}
          >
            {(() => {
              const score = backendResult?.risk_score ?? (simulationResults?.riskScore ? simulationResults.riskScore / 10 : 0);
              const pct = Math.min(100, (score / 10) * 100);
              const color = pct > 70 ? '#DC2626' : pct > 40 ? '#F59E0B' : '#10B981';
              return (
                <div className="w-full h-[4px] rounded-full bg-[#F3F4F6] overflow-hidden mt-2">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                </div>
              );
            })()}
          </MetricCard>

          {/* Confidence Card with Ring */}
          <MetricCard
            label="Confidence"
            value={isSimulating ? '...' : simulationDirty ? '—' : `${(backendResult?.confidence_score ? backendResult.confidence_score * 100 : simulationResults?.confidenceScore || 0).toFixed(0)}%`}
            icon={<Target size={14} />}
          >
            {(() => {
              const conf = backendResult?.confidence_score ? backendResult.confidence_score * 100 : simulationResults?.confidenceScore || 0;
              const pct = Math.min(100, conf);
              const r = 16; const c = 2 * Math.PI * r;
              const offset = c - (pct / 100) * c;
              return (
                <div className="flex items-center justify-center mt-2">
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r={r} fill="none" stroke="#F3F4F6" strokeWidth="3" />
                    <circle cx="20" cy="20" r={r} fill="none" stroke="#111" strokeWidth="3"
                      strokeDasharray={c} strokeDashoffset={offset}
                      strokeLinecap="round" transform="rotate(-90 20 20)"
                      style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                    />
                    <text x="20" y="20" textAnchor="middle" dominantBaseline="central"
                      className="text-[9px] font-bold fill-[#111]">{pct.toFixed(0)}</text>
                  </svg>
                </div>
              );
            })()}
          </MetricCard>

          {/* Attack Depth with Progress */}
          <MetricCard
            label="Attack Depth"
            value={isSimulating ? '...' : simulationDirty ? '—' : backendResult?.attack_path ? `${backendResult.attack_path.length} steps` : '—'}
            icon={<ArrowRight size={14} />}
          >
            {(() => {
              const depth = backendResult?.attack_path?.length || 0;
              const max = 10;
              const pct = Math.min(100, (depth / max) * 100);
              return (
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: Math.min(depth, 8) }).map((_, i) => (
                    <div key={i} className="flex-1 h-[5px] rounded-full bg-[#111] transition-all duration-300"
                      style={{ opacity: 0.3 + (0.7 * (i + 1) / Math.max(depth, 1)) }} />
                  ))}
                  {depth === 0 && <div className="flex-1 h-[5px] rounded-full bg-[#F3F4F6]" />}
                </div>
              );
            })()}
          </MetricCard>

          {/* Exploit Probability with Bar */}
          <MetricCard
            label="Exploit Probability"
            value={isSimulating ? '...' : backendResult?.exploit_probability !== undefined ? `${(backendResult.exploit_probability * 100).toFixed(0)}%` : '—'}
            icon={<Zap size={14} />}
          >
            {(() => {
              const prob = backendResult?.exploit_probability ? backendResult.exploit_probability * 100 : 0;
              const color = prob > 75 ? '#DC2626' : prob > 50 ? '#F59E0B' : prob > 25 ? '#3B82F6' : '#10B981';
              return (
                <div className="w-full h-[6px] rounded-full bg-[#F3F4F6] overflow-hidden mt-2 relative">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${prob}%`, background: color }} />
                </div>
              );
            })()}
          </MetricCard>

          {/* Monte Carlo Rate with Mini Bars */}
          <MetricCard
            label="Monte Carlo Rate"
            value={isSimulating ? '...' : simulationResults?.monteCarloRate !== undefined ? `${simulationResults.monteCarloRate.toFixed(1)}%` : '—'}
            icon={<BarChart3 size={14} />}
          >
            {(() => {
              const rate = simulationResults?.monteCarloRate || 0;
              const bars = [rate * 0.4, rate * 0.7, rate, rate * 0.85, rate * 0.55];
              return (
                <div className="flex items-end gap-[3px] h-[24px] mt-2">
                  {bars.map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm transition-all duration-300"
                      style={{
                        height: `${Math.max(3, (h / 100) * 24)}px`,
                        background: h > 60 ? '#DC2626' : h > 30 ? '#F59E0B' : '#D1D5DB',
                        opacity: 0.5 + (i === 2 ? 0.5 : 0.2),
                      }} />
                  ))}
                </div>
              );
            })()}
          </MetricCard>

          {/* Attack Paths Count */}
          <MetricCard
            label="Attack Paths"
            value={isSimulating ? '...' : String(simulationResults?.attackPaths ?? '—')}
            icon={<Activity size={14} />}
          >
            {(() => {
              const count = simulationResults?.attackPaths || 0;
              return (
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                    <div key={i} className="w-[6px] h-[6px] rounded-full bg-[#111]"
                      style={{ opacity: 0.3 + (0.7 * (i + 1) / Math.max(count, 1)) }} />
                  ))}
                  {count > 5 && <span className="text-[9px] text-[#9CA3AF] ml-0.5">+{count - 5}</span>}
                  {count === 0 && <div className="w-[6px] h-[6px] rounded-full bg-[#E5E5E5]" />}
                </div>
              );
            })()}
          </MetricCard>
        </div>
      )}

      {/* Paths Tab */}
      {reportTab === 'paths' && (
        <div className="flex flex-col gap-10 w-full">
          {/* Primary Attack Path */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#DC2626]" />
              <h3 className="text-[13px] font-bold text-[#111] uppercase tracking-wider">Primary Attack Path</h3>
            </div>
            {backendResult?.primary_path && backendResult.primary_path.length > 0 ? (
              <PrimaryPathFlow path={backendResult.primary_path} />
            ) : (
              <div className="text-[13px] text-[#9CA3AF] pl-4">No primary path found</div>
            )}
          </div>

          {/* Secondary Attack Path */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
              <h3 className="text-[13px] font-bold text-[#6B7280] uppercase tracking-wider">Secondary Attack Path</h3>
            </div>
            {backendResult?.secondary_paths && backendResult.secondary_paths.length > 0 && backendResult.secondary_paths[0].length > 0 ? (
              <SecondaryPathFlow path={backendResult.secondary_paths[0]} />
            ) : (
              <div className="text-[13px] text-[#9CA3AF] pl-4">No secondary path found</div>
            )}
          </div>
        </div>
      )}

      {/* Defender Tab */}
      {reportTab === 'defender' && (
        <div className="flex flex-col gap-5 w-full max-w-3xl mx-auto">

          {/* Active fixes banner */}
          {activeMitigations.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/50">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span className="text-[12px] font-semibold text-emerald-700">{activeMitigations.length} Active {activeMitigations.length === 1 ? 'Fix' : 'Fixes'} Applied</span>
              </div>
              <button
                onClick={clearMitigations}
                className="text-[11px] text-[#DC2626] font-medium hover:underline"
              >
                Clear All
              </button>
            </div>
          )}

          {recommendations.length > 0 ? (
            <>
              {/* Recommended Fix Hero */}
              {(() => {
                const best = recommendations[0];
                const bestImpact = best.estimatedRiskReduction || 0;
                const bestActive = activeMitigations.some(m => m.id === best.id);
                const bestStage = getAttackStage(best.type);
                return (
                  <div
                    className="rounded-xl px-5 py-4 border"
                    style={{
                      background: bestActive ? 'rgba(16,185,129,0.04)' : 'rgba(220,38,38,0.02)',
                      borderColor: bestActive ? 'rgba(16,185,129,0.2)' : 'rgba(220,38,38,0.12)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-bold text-[#DC2626] uppercase tracking-wider bg-red-50 border border-red-100 px-1.5 py-[1px] rounded-full">
                        Recommended Fix
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-bold text-[#111] mb-1">{best.description}</h4>
                        <div className="flex items-center gap-3 text-[11px] text-[#6B7280]">
                          <span>Stops: <strong className="text-[#111]">{bestStage}</strong></span>
                          <span>•</span>
                          <span>Nodes: <strong className="text-[#111]">{best.affectedNodes?.length || 1}</strong></span>
                        </div>
                        {/* Risk reduction bar */}
                        <div className="flex items-center gap-2 mt-2.5">
                          <div className="flex-1 h-[6px] rounded-full bg-[#F3F4F6] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${bestImpact}%`,
                                background: bestImpact > 50 ? '#DC2626' : bestImpact > 25 ? '#F59E0B' : '#9CA3AF',
                              }}
                            />
                          </div>
                          <span className="text-[12px] font-bold text-[#111] tabular-nums w-[36px] text-right">{bestImpact}%</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {bestActive ? (
                          <button
                            onClick={() => removeMitigation(best)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                          >
                            <ShieldCheck size={12} /> Applied
                          </button>
                        ) : (
                          <button
                            onClick={() => applyMitigation(best)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-black text-white hover:bg-gray-800 shadow-sm transition-colors"
                          >
                            Simulate Fix
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Grouped Fixes */}
              {(() => {
                const stages = groupByStage(recommendations.slice(1));
                return Object.entries(stages).map(([stage, recs]) => (
                  <div key={stage}>
                    <div className="flex items-center gap-2 mb-2.5 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]" />
                      <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">{stage} Defense</h3>
                      <div className="flex-1 h-px bg-[#F3F4F6]" />
                    </div>
                    <div className="space-y-1.5">
                      {(recs as any[]).map((rec: any) => (
                        <DefenderRow
                          key={rec.id}
                          rec={rec}
                          isActive={activeMitigations.some(m => m.id === rec.id)}
                          onSimulate={() => applyMitigation(rec)}
                          onRemove={() => removeMitigation(rec)}
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </>
          ) : (
            <div className="text-[14px] text-[#9CA3AF] text-center mt-12">
              Run simulation to generate defense recommendations.
            </div>
          )}
        </div>
      )}

    </div>
  );
};

/* ── Sub-components ───────────────────────────────── */

const MetricCard = ({ icon, label, value, children }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  children?: React.ReactNode;
}) => (
  <div
    className="rounded-xl p-4 flex flex-col"
    style={{
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      background: 'rgba(255, 255, 255, 0.7)',
      border: '1px solid rgba(0, 0, 0, 0.06)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
    }}
  >
    <div className="flex items-center gap-1.5 mb-1">
      <div className="text-[#9CA3AF]">{icon}</div>
      <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide">{label}</span>
    </div>
    <div className="text-[18px] font-bold text-[#111] tabular-nums">{value}</div>
    {children}
  </div>
);

/* ── Primary Path with Flow Animation ─────────────── */
const PrimaryPathFlow = ({ path }: { path: string[] }) => {
  return (
    <div className="relative w-full">
      <div className="flex items-center justify-center gap-6 py-4 overflow-x-auto custom-scrollbar">
        {path.map((node, index) => (
          <React.Fragment key={index}>
            {/* Node Pill */}
            <div className="relative flex flex-col items-center shrink-0">
              <div
                className="relative px-5 py-2.5 rounded-full font-mono text-[13px] font-semibold text-white z-10 overflow-hidden"
                style={{
                  background: index === 0
                    ? 'linear-gradient(135deg, #111 0%, #333 100%)'
                    : index === path.length - 1
                      ? 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)'
                      : 'linear-gradient(135deg, #374151 0%, #4B5563 100%)',
                  boxShadow: index === path.length - 1
                    ? '0 0 16px rgba(220,38,38,0.3), 0 2px 8px rgba(0,0,0,0.15)'
                    : '0 2px 8px rgba(0,0,0,0.12)',
                }}
              >
                {node}
                {/* Sweep glow overlay */}
                <div
                  className="absolute inset-0 pointer-events-none z-20"
                  style={{
                    background: 'linear-gradient(90deg, rgba(220,38,38,0) 0%, rgba(220,38,38,0.4) 50%, rgba(220,38,38,0) 100%)',
                    animation: `pathNodeSweep 1.2s infinite linear ${index * 0.25}s`,
                  }}
                />
              </div>
              {/* Step label */}
              <span className="text-[9px] font-bold text-[#9CA3AF] mt-1.5 uppercase tracking-wider">
                {index === 0 ? 'Entry' : index === path.length - 1 ? 'Target' : `Step ${index + 1}`}
              </span>
            </div>

            {/* Animated Arrow */}
            {index < path.length - 1 && (
              <div className="relative flex items-center shrink-0" style={{ width: '48px', height: '2px' }}>
                {/* Static track */}
                <div className="absolute inset-0 bg-[#E5E5E5] rounded-full" />
                {/* Animated flow */}
                <div
                  className="absolute inset-0 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, #DC2626 40%, #DC2626 60%, transparent 100%)',
                      animation: `pathArrowFlow 1.2s infinite linear ${index * 0.2}s`,
                      width: '200%',
                    }}
                  />
                </div>
                {/* Arrowhead */}
                <div
                  className="absolute -right-[3px] w-0 h-0"
                  style={{
                    borderTop: '4px solid transparent',
                    borderBottom: '4px solid transparent',
                    borderLeft: '5px solid #DC2626',
                    filter: 'drop-shadow(0 0 2px rgba(220,38,38,0.4))',
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <style>{`
        @keyframes pathNodeSweep {
          0% { transform: translateX(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes pathArrowFlow {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
      `}</style>
    </div>
  );
};

/* ── Secondary Path (Simple, No Animation) ────────── */
const SecondaryPathFlow = ({ path }: { path: string[] }) => {
  return (
    <div className="flex items-center justify-center gap-6 py-3 overflow-x-auto custom-scrollbar">
      {path.map((node, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center shrink-0">
            <div
              className="px-4 py-2 rounded-full font-mono text-[12px] font-medium text-[#6B7280] border border-[#D1D5DB] bg-white"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              {node}
            </div>
            <span className="text-[9px] text-[#D1D5DB] mt-1 uppercase tracking-wider font-medium">
              {index === 0 ? 'Entry' : index === path.length - 1 ? 'Target' : `Step ${index + 1}`}
            </span>
          </div>
          {index < path.length - 1 && (
            <div className="flex items-center shrink-0">
              <div className="w-8 h-px bg-[#D1D5DB]" />
              <div
                className="w-0 h-0"
                style={{
                  borderTop: '3px solid transparent',
                  borderBottom: '3px solid transparent',
                  borderLeft: '4px solid #D1D5DB',
                }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/* ── Attack Stage Helper ──────────────────────────── */
const getAttackStage = (type: string): string => {
  switch (type) {
    case 'PATCH_VULNERABILITY': return 'Initial Access';
    case 'NETWORK_SEGMENTATION': return 'Lateral Movement';
    case 'PRIVILEGE_RESTRICTION': return 'Privilege Escalation';
    case 'SERVICE_HARDENING': return 'Data Access';
    case 'ACCESS_CONTROL_FIX': return 'Target Defense';
    default: return 'General';
  }
};

const groupByStage = (recs: any[]): Record<string, any[]> => {
  const groups: Record<string, any[]> = {};
  recs.forEach(rec => {
    const stage = getAttackStage(rec.type);
    if (!groups[stage]) groups[stage] = [];
    groups[stage].push(rec);
  });
  return groups;
};

/* ── Compact Defense Row ─────────────────────────── */
const DefenderRow = ({ rec, isActive, onSimulate, onRemove }: { rec: any; isActive: boolean; onSimulate: () => void; onRemove: () => void }) => {
  const impact = rec.estimatedRiskReduction || 0;
  const impactLevel = impact > 50 ? 'HIGH' : impact > 25 ? 'MEDIUM' : 'LOW';
  const impactColor = impactLevel === 'HIGH' ? '#DC2626' : impactLevel === 'MEDIUM' ? '#EA580C' : '#9CA3AF';
  const impactBg = impactLevel === 'HIGH' ? 'rgba(220,38,38,0.06)' : impactLevel === 'MEDIUM' ? 'rgba(234,88,12,0.06)' : 'rgba(156,163,175,0.06)';
  const stage = getAttackStage(rec.type);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${isActive
        ? 'border-emerald-200/60 bg-emerald-50/30'
        : 'border-[#F3F4F6] hover:border-[#E5E5E5] bg-white/60'
        }`}
    >
      {/* Impact badge */}
      <span
        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded shrink-0"
        style={{ color: impactColor, background: impactBg, border: `1px solid ${impactColor}15` }}
      >
        {impactLevel}
      </span>

      {/* Description + stage */}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-[#111] truncate">{rec.description}</div>
        <div className="text-[10px] text-[#9CA3AF] mt-0.5">
          Blocks: <span className="text-[#6B7280] font-medium">{stage}</span>
          {rec.affectedNodes?.length > 0 && (
            <span> → <span className="font-mono text-[#6B7280]">{rec.affectedNodes.join(', ')}</span></span>
          )}
        </div>
      </div>

      {/* Risk reduction mini bar */}
      <div className="flex items-center gap-1.5 shrink-0 w-[80px]">
        <div className="flex-1 h-[4px] rounded-full bg-[#F3F4F6] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${impact}%`, background: impactColor }}
          />
        </div>
        <span className="text-[10px] font-bold text-[#6B7280] tabular-nums w-[28px] text-right">{impact}%</span>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {isActive ? (
          <button
            onClick={onRemove}
            className="text-[10px] font-medium text-emerald-600 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors flex items-center gap-1"
          >
            <ShieldCheck size={10} /> Applied
          </button>
        ) : (
          <button
            onClick={onSimulate}
            className="text-[10px] font-medium text-[#111] border border-[#E5E5E5] px-2 py-1 rounded-md hover:bg-black hover:text-white transition-colors"
          >
            Simulate Fix
          </button>
        )}
      </div>
    </div>
  );
};

export default SimulationResultPanel;
