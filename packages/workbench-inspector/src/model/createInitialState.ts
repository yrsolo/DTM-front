import type { InspectorActivation, InspectorState } from "../contracts/types";

function getInitialPanelPosition() {
  if (typeof window === "undefined") {
    return { x: 24, y: 24 };
  }

  return {
    x: Math.max(24, window.innerWidth - 344),
    y: 24,
  };
}

export function createInitialInspectorState(activation: InspectorActivation): InspectorState {
  return {
    enabled: activation.enabled,
    hoveredNodeId: null,
    selectedNodeId: null,
    panelOpen: false,
    panelPosition: getInitialPanelPosition(),
    pickMode: "off",
    debug: activation.debug ?? false,
    hierarchy: {
      expandedNodeIds: [],
      markedNodeIds: [],
      query: "",
      focusMode: "all",
      treeFilterMode: "smart",
    },
  };
}
