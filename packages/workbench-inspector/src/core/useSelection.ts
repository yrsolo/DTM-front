import { useInspectorContext } from "../runtime/InspectorContext";

export function useSelection() {
  const { getNodeById, state, setSelectedNodeId } = useInspectorContext();

  return {
    selectedNode: getNodeById(state.selectedNodeId),
    selectedNodeId: state.selectedNodeId,
    selectNode: setSelectedNodeId,
  };
}
