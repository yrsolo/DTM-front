import type { InspectorActivation, InspectorState } from "../contracts/types";

export function createInitialInspectorState(activation: InspectorActivation): InspectorState {
  return {
    enabled: activation.enabled,
    hoveredTargetId: null,
    selectedTargetId: null,
    panelOpen: false,
    debug: activation.debug ?? false,
  };
}
