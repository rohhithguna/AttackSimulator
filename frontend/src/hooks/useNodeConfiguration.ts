import { useNodeStateStore } from '../modules/nodeState';

export const useNodeConfiguration = () => {
  const nodes = useNodeStateStore((state) => state.nodes);
  const selectedNodeId = useNodeStateStore((state) => state.selectedNodeId);
  const updateNodeData = useNodeStateStore((state) => state.updateNodeData);
  const setSelectedNodeId = useNodeStateStore((state) => state.setSelectedNodeId);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;

  const updateConfiguration = (data: any) => {
    if (selectedNodeId) {
      updateNodeData(selectedNodeId, data);
    }
  };

  const closePanel = () => {
    setSelectedNodeId(null);
  };

  return {
    selectedNode,
    updateConfiguration,
    closePanel,
  };
};
