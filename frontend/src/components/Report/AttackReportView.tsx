'use client';

import React, { useState } from 'react';
import { useNodeStateStore } from '@/modules/nodeState';
import SimulationResultPanel from '@/components/Panels/SimulationResultPanel';
import AttackTimeline from '@/components/Panels/AttackTimeline';
import SimulationWorkspace from '@/components/Canvas/SimulationWorkspace';
import { ShieldAlert, ArrowRight, Activity, Clock, Shield, Target, Sparkles, Copy, Check, ChevronRight, AlertTriangle } from 'lucide-react';

export default function AttackReportView() {
    const { viewMode, reportTab, setReportTab, simulationResults, backendResult, isSimulating, activeMitigations, simulationDirty, attackPath } = useNodeStateStore();

    if (viewMode !== 'report') return null;

    const riskScore = backendResult?.risk_score?.toFixed(1) ?? (simulationResults?.riskScore ? (simulationResults.riskScore / 10).toFixed(1) : '—');
    const severity = simulationResults?.severity || backendResult?.severity;
    const isHigh = severity === 'High' || severity === 'Critical';
    const isAiTab = reportTab === 'ai';

    return (
        <div className={`w-full h-full flex flex-col overflow-hidden relative ${isAiTab ? 'bg-transparent pointer-events-none' : 'bg-[#FAFAFA]'}`}>

            {/* Sticky Info Bar + Tabs */}
            <div
                className={`sticky top-0 z-30 shrink-0 ${isAiTab ? 'pointer-events-auto' : ''}`}
                style={{
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    background: isAiTab ? 'rgba(250, 250, 250, 0.7)' : 'rgba(250, 250, 250, 0.85)',
                }}
            >
                {/* Compact Metrics Bar */}
                <div className="flex items-center justify-center px-4 py-2">
                    <div
                        className="flex items-center justify-center gap-6 px-5 py-[6px] rounded-xl"
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            background: 'rgba(255, 255, 255, 0.55)',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
                        }}
                    >
                        <InfoChip
                            icon={<ShieldAlert size={13} className="text-[#6B7280]" />}
                            label="Risk"
                            value={isSimulating ? '...' : simulationDirty ? '—' : riskScore}
                            accent={isHigh && !simulationDirty && !isSimulating ? severity : undefined}
                        />
                        <Divider />
                        <InfoChip
                            icon={<ArrowRight size={13} className="text-[#6B7280]" />}
                            label="Depth"
                            value={isSimulating ? '...' : simulationDirty ? '—' : backendResult?.attack_path ? `${backendResult.attack_path.length}` : '—'}
                        />
                        <Divider />
                        <InfoChip
                            icon={<Activity size={13} className="text-[#6B7280]" />}
                            label="Paths"
                            value={isSimulating ? '...' : String(simulationResults?.attackPaths ?? '—')}
                        />
                        <Divider />
                        <InfoChip
                            icon={<Clock size={13} className="text-[#6B7280]" />}
                            label="Breach"
                            value={isSimulating ? '...' : simulationDirty ? '—' : `${backendResult?.breach_time_data?.total_minutes ?? parseInt(simulationResults?.estimatedBreachTime || '0', 10)}m`}
                        />
                        <Divider />
                        <InfoChip
                            icon={<Shield size={13} className="text-[#6B7280]" />}
                            label="Entry"
                            value={isSimulating ? '...' : String(backendResult?.primary_path ? 1 : '—')}
                        />
                        <Divider />
                        <InfoChip
                            icon={<Target size={13} className="text-[#6B7280]" />}
                            label="Confidence"
                            value={isSimulating ? '...' : simulationDirty ? '—' : `${(backendResult?.confidence_score ? backendResult.confidence_score * 100 : simulationResults?.confidenceScore || 0).toFixed(0)}%`}
                        />
                    </div>
                </div>

                {/* Sticky Tabs Bar */}
                <div className="flex items-center justify-center px-4 pb-2">
                    <div
                        className="flex items-center gap-0.5 p-[3px] rounded-lg"
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            background: 'rgba(255, 255, 255, 0.45)',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                        }}
                    >
                        {['metrics', 'paths', 'timeline', 'defender', 'ai'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setReportTab(tab as any)}
                                className={`px-4 py-[5px] text-[12px] font-medium capitalize rounded-md transition-all ${reportTab === tab
                                    ? 'bg-black text-white shadow-sm'
                                    : 'text-[#6B7280] hover:bg-black/5 hover:text-[#111]'
                                    }`}
                            >
                                {tab === 'ai' ? (
                                    <span className="flex items-center gap-1">
                                        <Sparkles size={11} /> AI
                                    </span>
                                ) : tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-black/[0.06] to-transparent" />
            </div>

            {/* Content Area */}
            {isAiTab ? (
                /* AI Tab: Floating overlay */
                <div className="flex-1 relative overflow-hidden pointer-events-none">

                    {/* Frosted glass AI overlay */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-start p-8 pointer-events-none pt-2">
                        <AIInsightPanel
                            backendResult={backendResult}
                            simulationResults={simulationResults}
                            attackPath={attackPath}
                            severity={severity}
                        />
                    </div>
                </div>
            ) : (
                /* Other tabs: normal scrollable content */
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="w-full max-w-4xl mx-auto px-6 pt-6 pb-12 flex flex-col">
                        {reportTab === 'timeline' ? (
                            <AttackTimeline />
                        ) : (
                            <SimulationResultPanel />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── AI Insight Panel ────────────────────────────── */

const AIInsightPanel = ({ backendResult, simulationResults, attackPath, severity }: {
    backendResult: any;
    simulationResults: any;
    attackPath: string[];
    severity?: string;
}) => {
    const [copied, setCopied] = useState(false);
    const [aiSubTab, setAiSubTab] = useState<'edge' | 'cloud'>('edge');

    const edgeAi = backendResult?.ai?.edge_ai;
    const cloudAi = backendResult?.ai?.cloud_ai;
    const activeData = aiSubTab === 'edge' ? edgeAi : cloudAi;
    const insightText = activeData?.insight || '';

    const pathNodes = backendResult?.primary_path || backendResult?.attack_path || [];
    const breachTime = backendResult?.breach_time_data?.total_minutes ?? parseInt(simulationResults?.estimatedBreachTime || '0', 10);
    const pathLength = pathNodes.length;

    const handleCopy = async () => {
        if (insightText) {
            await navigator.clipboard.writeText(insightText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div
            className="pointer-events-auto w-full max-w-[680px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                background: 'rgba(255, 255, 255, 0.2)',
                boxShadow: '0 16px 64px rgba(0,0,0,0.12), 0 2px 12px rgba(0,0,0,0.06)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
            }}
        >
            {/* Header */}
            <div className="px-6 pt-5 pb-3 shrink-0">
                {/* AI Badge */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.06]">
                            <Sparkles size={11} className="text-[#111]" />
                            <span className="text-[10px] font-bold text-[#111] uppercase tracking-widest">AI Security Insight</span>
                        </div>
                        {activeData?.model && (
                            <span className="text-[10px] text-[#9CA3AF] font-mono">
                                Model: {activeData.model}
                            </span>
                        )}
                    </div>

                    {/* Copy button */}
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[#6B7280] hover:bg-black/5 transition-colors"
                        disabled={!insightText}
                    >
                        {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        {copied ? 'Copied' : 'Copy Analysis'}
                    </button>
                </div>

                {/* Attack Path Display */}
                {pathNodes.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
                        {pathNodes.map((node: string, i: number) => (
                            <React.Fragment key={i}>
                                <span
                                    className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full shrink-0"
                                    style={{
                                        background: i === 0
                                            ? 'rgba(17,17,17,0.08)'
                                            : i === pathNodes.length - 1
                                                ? 'rgba(220,38,38,0.08)'
                                                : 'rgba(107,114,128,0.06)',
                                        color: i === pathNodes.length - 1 ? '#DC2626' : '#111',
                                    }}
                                >
                                    {node}
                                </span>
                                {i < pathNodes.length - 1 && (
                                    <ChevronRight size={10} className="text-[#D1D5DB] shrink-0" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Risk Summary Row */}
                <div className="flex items-center gap-3">
                    {severity && (
                        <span
                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded-full"
                            style={{
                                color: severity === 'Critical' || severity === 'High' ? '#DC2626' : '#F59E0B',
                                background: severity === 'Critical' || severity === 'High' ? 'rgba(220,38,38,0.06)' : 'rgba(245,158,11,0.06)',
                                border: `1px solid ${severity === 'Critical' || severity === 'High' ? 'rgba(220,38,38,0.15)' : 'rgba(245,158,11,0.15)'}`,
                            }}
                        >
                            {severity} Risk
                        </span>
                    )}
                    {pathLength > 0 && (
                        <span className="text-[10px] text-[#6B7280] font-medium">{pathLength} Steps</span>
                    )}
                    {breachTime > 0 && (
                        <>
                            <span className="text-[10px] text-[#D1D5DB]">•</span>
                            <span className="text-[10px] text-[#6B7280] font-medium">Breach {breachTime}m</span>
                        </>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-black/[0.06] mx-5" />

            {/* AI Provider Toggle */}
            <div className="px-6 pt-3 pb-2 shrink-0 flex items-center justify-center gap-1">
                <button
                    onClick={() => setAiSubTab('edge')}
                    className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${aiSubTab === 'edge' ? 'bg-black text-white shadow-sm' : 'text-[#6B7280] hover:bg-black/5'
                        }`}
                >
                    Edge AI
                </button>
                <button
                    onClick={() => setAiSubTab('cloud')}
                    className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${aiSubTab === 'cloud' ? 'bg-black text-white shadow-sm' : 'text-[#6B7280] hover:bg-black/5'
                        }`}
                >
                    Cloud AI
                </button>
            </div>

            {/* Analysis Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-5 custom-scrollbar">
                {activeData && !activeData.error ? (
                    <div className="pt-2">
                        {activeData.provider && (
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider bg-black/[0.03] px-2 py-0.5 rounded">
                                    {activeData.provider}
                                </span>
                                {activeData.model && (
                                    <span className="text-[10px] text-[#D1D5DB] font-mono">v{activeData.model}</span>
                                )}
                            </div>
                        )}
                        <p className="text-[13px] text-[#374151] leading-[1.85] whitespace-pre-wrap">{activeData.insight}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <AlertTriangle size={28} className="text-[#D1D5DB] mb-3" />
                        <h5 className="text-[13px] font-semibold text-[#374151] mb-1">
                            {aiSubTab === 'edge' ? 'Edge AI' : 'Cloud AI'} Unavailable
                        </h5>
                        <p className="text-[12px] text-[#9CA3AF] max-w-[260px]">
                            {activeData?.error || (aiSubTab === 'edge'
                                ? 'Edge AI not available. Run LM Studio locally.'
                                : 'Cloud AI unavailable. Configure GEMINI_API_KEY.'
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── Sub-components ──────────────────────────────── */

const InfoChip = ({ icon, label, value, accent }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent?: string;
}) => (
    <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] text-[#9CA3AF] font-medium">{label}</span>
        <span className="text-[12px] font-bold text-[#111] tabular-nums">{value}</span>
        {accent && (
            <span className="text-[9px] font-bold text-[#DC2626] uppercase ml-0.5">{accent}</span>
        )}
    </div>
);

const Divider = () => (
    <div className="w-px h-3 bg-black/[0.08]" />
);
