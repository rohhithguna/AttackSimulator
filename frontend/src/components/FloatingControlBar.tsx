'use client';

import React from 'react';
import { Play, Pause, RotateCw, Loader2, LayoutGrid, AlignHorizontalDistributeCenter, RotateCcw, Trash2 } from 'lucide-react';
import { useNodeStateStore } from '../modules/nodeState';

const DEMO_SCENARIO_LIST = [
    "Public Web Breach",
    "Zero-Trust Segmented Network",
    "Dual Entry Intrusion",
    "Exposed Database Crisis",
    "Cloud Microservice Compromise",
    "Insider Workstation Breach",
    "VPN Lateral Movement",
    "Load Balanced Web Infrastructure",
    "IoT Network Pivot",
    "Monitoring Bypass Attack",
];

const FloatingControlBar: React.FC = () => {
    const {
        runSimulation,
        isSimulating,
        loadDemoScenario,
        heatmapEnabled,
        toggleHeatmap,
        focusModeEnabled,
        toggleFocusMode,
        autoArrange,
        resetSimulation,
        resetCanvas,
        attackPath,
        isPlaying,
        attackPlaybackStep,
        startPlayback,
        pausePlayback,
        replayPlayback,
    } = useNodeStateStore();

    const hasAttackPath = attackPath.length > 0;
    const playbackFinished = attackPlaybackStep >= attackPath.length - 1 && attackPath.length > 0;

    return (
        <div
            className="absolute z-30 pointer-events-none"
            style={{ top: '8px', left: '12px', right: '210px' }}
        >
            <div
                className="pointer-events-auto flex items-center px-[16px] py-[5px] whitespace-nowrap"
                style={{
                    borderRadius: '18px',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(3px)',
                    background: 'rgba(255,255,255,0.02)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    gap: '20px',
                    justifyContent: 'center',
                }}
            >
                {/* Run Simulation */}
                <button
                    onClick={runSimulation}
                    disabled={isSimulating}
                    className={`inline-flex items-center gap-[5px] py-[2px] text-[11px] font-medium transition-all whitespace-nowrap rounded-[6px] ${isSimulating
                        ? 'opacity-50 cursor-not-allowed text-[#888]'
                        : 'text-[#111] hover:text-black'
                        }`}
                >
                    {isSimulating ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Play size={12} className="fill-[#111]" />
                    )}
                    Run Simulation
                </button>

                {/* Playback Controls */}
                {hasAttackPath && (
                    <div className="flex items-center gap-[3px] border-l border-[#E5E5E5] pl-[8px]">
                        {/* Play / Pause Toggle */}
                        {isPlaying ? (
                            <button
                                onClick={pausePlayback}
                                title="Pause Playback"
                                className="inline-flex items-center gap-[4px] text-[11px] font-medium text-[#DC2626] hover:text-[#B91C1C] transition-colors whitespace-nowrap px-[5px] py-[2px] rounded-[6px] hover:bg-red-50"
                            >
                                <Pause size={11} />
                                Pause
                            </button>
                        ) : (
                            <button
                                onClick={startPlayback}
                                title="Play Attack Path"
                                className="inline-flex items-center gap-[4px] text-[11px] font-medium text-[#444] hover:text-[#DC2626] transition-colors whitespace-nowrap px-[5px] py-[2px] rounded-[6px] hover:bg-red-50"
                            >
                                <Play size={11} className="fill-current" />
                                {attackPlaybackStep < 0 ? 'Play' : playbackFinished ? 'Play' : 'Resume'}
                            </button>
                        )}

                        {/* Replay */}
                        <button
                            onClick={replayPlayback}
                            title="Replay"
                            className="inline-flex items-center gap-[4px] text-[11px] font-medium text-[#444] hover:text-[#111] transition-colors whitespace-nowrap px-[4px] py-[2px] rounded-[6px] hover:bg-black/[0.04]"
                        >
                            <RotateCw size={11} />
                            Replay
                        </button>

                        {/* Playback step indicator */}
                        {attackPlaybackStep >= 0 && (
                            <span className="text-[10px] font-mono text-[#9CA3AF] ml-[4px] tabular-nums">
                                {attackPlaybackStep + 1}/{attackPath.length}
                            </span>
                        )}
                    </div>
                )}

                {/* Heatmap Toggle */}
                <div className="flex items-center gap-[5px] whitespace-nowrap">
                    <span className="text-[11px] font-medium text-[#444]">Heatmap</span>
                    <button
                        onClick={toggleHeatmap}
                        className="relative rounded-full transition-all duration-200 shrink-0"
                        style={{
                            width: '28px',
                            height: '16px',
                            background: heatmapEnabled
                                ? 'linear-gradient(135deg, #111 0%, #333 100%)'
                                : '#d4d4d4',
                            boxShadow: heatmapEnabled ? '0 1px 4px rgba(0,0,0,0.2)' : 'inset 0 1px 2px rgba(0,0,0,0.08)',
                        }}
                    >
                        <div
                            className="absolute bg-white rounded-full shadow-sm transition-transform duration-200"
                            style={{
                                width: '12px',
                                height: '12px',
                                top: '2px',
                                left: '2px',
                                transform: heatmapEnabled ? 'translateX(12px)' : 'translateX(0)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            }}
                        />
                    </button>
                </div>

                {/* Focus Mode Toggle */}
                <div className="flex items-center gap-[5px] whitespace-nowrap">
                    <span className="text-[11px] font-medium text-[#444]">Focus Mode</span>
                    <button
                        onClick={toggleFocusMode}
                        className="relative rounded-full transition-all duration-200 shrink-0"
                        style={{
                            width: '28px',
                            height: '16px',
                            background: focusModeEnabled
                                ? 'linear-gradient(135deg, #111 0%, #333 100%)'
                                : '#d4d4d4',
                            boxShadow: focusModeEnabled ? '0 1px 4px rgba(0,0,0,0.2)' : 'inset 0 1px 2px rgba(0,0,0,0.08)',
                        }}
                    >
                        <div
                            className="absolute bg-white rounded-full shadow-sm transition-transform duration-200"
                            style={{
                                width: '12px',
                                height: '12px',
                                top: '2px',
                                left: '2px',
                                transform: focusModeEnabled ? 'translateX(12px)' : 'translateX(0)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            }}
                        />
                    </button>
                </div>

                {/* Load Demo Scenario */}
                <div className="relative inline-flex items-center gap-[4px] rounded-[6px] hover:bg-black/[0.04] transition-colors py-[2px] shrink-0 whitespace-nowrap cursor-pointer">
                    <LayoutGrid size={11} className="text-[#444] pointer-events-none shrink-0" />
                    <select
                        onChange={(e) => {
                            if (e.target.value) {
                                loadDemoScenario(e.target.value);
                                e.target.value = '';
                            }
                        }}
                        defaultValue=""
                        className="text-[11px] font-medium text-[#444] bg-transparent appearance-none outline-none cursor-pointer pr-1"
                    >
                        <option value="" disabled>Load Demo Scenario</option>
                        {DEMO_SCENARIO_LIST.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Auto Align */}
                <button
                    onClick={autoArrange}
                    title="Auto Align"
                    className="inline-flex items-center gap-[4px] text-[11px] font-medium text-[#444] hover:text-[#111] transition-colors whitespace-nowrap px-[4px] py-[2px] rounded-[6px] hover:bg-black/[0.04]"
                >
                    <AlignHorizontalDistributeCenter size={11} />
                    Auto Align
                </button>

                {/* Reset */}
                <button
                    onClick={resetSimulation}
                    title="Reset"
                    className="text-[#444] hover:text-[#111] hover:bg-black/[0.04] p-[3px] rounded-[6px] transition-colors"
                >
                    <RotateCcw size={11} />
                </button>

                {/* Delete */}
                <button
                    onClick={resetCanvas}
                    title="Clear Canvas"
                    className="text-[#444] hover:text-[#DC2626] hover:bg-red-50 p-[3px] rounded-[6px] transition-colors"
                >
                    <Trash2 size={11} />
                </button>


            </div>
        </div>
    );
};

export default FloatingControlBar;
