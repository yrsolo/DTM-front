import type { InspectorActivation, InspectorPanelSize, InspectorState } from "../contracts/types";

function getInitialPanelPosition() {
  if (typeof window === "undefined") {
    return { x: 24, y: 24 };
  }

  return {
    x: Math.max(24, window.innerWidth - 344),
    y: 24,
  };
}

function getInitialPanelSize(): InspectorPanelSize {
  if (typeof window === "undefined") {
    return { width: 980, height: 700 };
  }

  return {
    width: Math.max(760, Math.min(1120, window.innerWidth - 32)),
    height: Math.max(520, Math.min(820, window.innerHeight - 32)),
  };
}

export function createInitialInspectorState(activation: InspectorActivation): InspectorState {
  return {
    enabled: activation.enabled,
    hoveredNodeId: null,
    selectedNodeId: null,
    panelOpen: false,
    panelPosition: getInitialPanelPosition(),
    panelSize: getInitialPanelSize(),
    treePaneWidth: 360,
    pickMode: "off",
    debug: activation.debug ?? false,
    hierarchy: {
      expandedNodeIds: [],
      markedNodeIds: [],
      query: "",
      focusMode: "all",
      treeFilterMode: "smart",
      hideInvisible: true,
      autoRefreshTree: false,
    },
  };
}
