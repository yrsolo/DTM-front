import { useInspectorContext } from "../runtime/InspectorContext";

export function useSelection() {
  const { adapter, state, setSelectedTargetId } = useInspectorContext();

  return {
    selectedTarget: state.selectedTargetId ? adapter.getTargetById(state.selectedTargetId) : null,
    selectedTargetId: state.selectedTargetId,
    selectTarget: setSelectedTargetId,
  };
}
