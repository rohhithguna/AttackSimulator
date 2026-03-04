'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings2, 
  Globe, 
  ShieldAlert, 
  Activity, 
  Database,
  Lock,
  ChevronRight
} from 'lucide-react';
import { useNodeStateStore } from '../../modules/nodeState';

const NodeConfigPanel: React.FC = () => {
  const nodes = useNodeStateStore((state) => state.nodes);
  const selectedNodeId = useNodeStateStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useNodeStateStore((state) => state.setSelectedNodeId);
  const updateNodeData = useNodeStateStore((state) => state.updateNodeData);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) return null;

  const { data } = selectedNode;

  const handleUpdate = (field: string, value: any) => {
    updateNodeData(selectedNode.id, { [field]: value });
  };

  return (
    <AnimatePresence>
      {selectedNodeId && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-[400px] bg-black/80 backdrop-blur-xl border-l border-gray-800 z-[100] shadow-2xl overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 p-6 flex items-center justify-between border-b border-gray-900 bg-black/40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg">
                <Settings2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Node Config</h2>
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter">ID: {selectedNode.id}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedNodeId(null)}
              className="p-2 hover:bg-gray-900 border border-transparent hover:border-gray-800 rounded-lg transition-all text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">General Information</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-mono uppercase">Node Name</label>
                  <input
                    type="text"
                    value={data.label}
                    onChange={(e) => handleUpdate('label', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition-all font-mono"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-300 font-mono">Public Exposure</span>
                  </div>
                  <button
                    onClick={() => handleUpdate('publicExposure', !data.publicExposure)}
                    className={`
                      w-10 h-5 rounded-full relative transition-all duration-300
                      ${data.publicExposure ? 'bg-white' : 'bg-gray-800'}
                    `}
                  >
                    <div className={`
                      absolute top-1 w-3 h-3 rounded-full transition-all duration-300
                      ${data.publicExposure ? 'right-1 bg-black' : 'left-1 bg-gray-500'}
                    `} />
                  </button>
                </div>
              </div>
            </div>

            {/* Network */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Network Access</h3>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-mono uppercase">Open Ports (comma separated)</label>
                <div className="flex items-center gap-2 p-3 bg-gray-900 border border-gray-800 rounded-lg">
                  <Activity className="w-4 h-4 text-gray-600" />
                  <input
                    type="text"
                    value={data.ports?.join(', ')}
                    onChange={(e) => handleUpdate('ports', e.target.value.split(',').map(s => s.trim()))}
                    className="flex-1 bg-transparent text-xs text-white focus:outline-none font-mono"
                    placeholder="80, 443, 22..."
                  />
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Security State</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-mono uppercase">Privilege Level</label>
                  <select
                    value={data.privilegeLevel}
                    onChange={(e) => handleUpdate('privilegeLevel', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none appearance-none font-mono"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-mono uppercase">Data Criticality</label>
                  <select
                    value={data.dataCriticality}
                    onChange={(e) => handleUpdate('dataCriticality', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none appearance-none font-mono"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-mono uppercase">Vulnerabilities</label>
                <div className="space-y-2">
                  {data.vulnerabilitiesList.map((vuln, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                        <span className="text-[10px] text-red-200 font-mono uppercase">{vuln}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const newList = data.vulnerabilitiesList.filter((_, idx) => idx !== i);
                          updateNodeData(selectedNode.id, {
                            vulnerabilitiesList: newList,
                            vulnerabilities: newList.length
                          });
                        }}
                        className="text-red-900 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="CVE-XXXX-XXXX"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value;
                          if (val) {
                            const newList = [...data.vulnerabilitiesList, val];
                            updateNodeData(selectedNode.id, {
                              vulnerabilitiesList: newList,
                              vulnerabilities: newList.length
                            });
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                      className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-[10px] text-white focus:outline-none focus:border-red-900 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 border-t border-gray-900 mt-auto">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-3 h-3 text-white" />
                <span className="text-[10px] font-mono text-white uppercase tracking-widest">Asset Value</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed font-mono">
                Asset value is calculated based on privilege level and data criticality. 
                Current risk score: <span className="text-white">{(data.privilegeLevel === 'High' ? 5 : 2) * (data.dataCriticality === 'High' ? 5 : 2)}</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NodeConfigPanel;
