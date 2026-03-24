import React from "react";

import type {
  InspectorActivation,
  InspectorAdapter,
  InspectorFocusMode,
  InspectorNode,
  InspectorPanelPosition,
  InspectorPickMode,
  InspectorState,
  InspectorTreeFilterMode,
} from "../contracts/types";
import { createInitialInspectorState } from "../model/createInitialState";
import { scanInspectorDom } from "../utils/domInspector";

type InspectorContextValue = {
  activation: InspectorActivation;
  adapter: InspectorAdapter;
  state: InspectorState;
  rootNodes: InspectorNode[];
  getNodeById: (nodeId: string | null | undefined) => InspectorNode | null;
  getNodeElement: (nodeId: string | null | undefined) => Element | null;
  refreshNodes: () => void;
  resolveNodeFromElement: (element: Element | null) => InspectorNode | null;
  setHoveredNodeId: (nodeId: string | null) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  setPanelPosition: (position: InspectorPanelPosition) => void;
  setPickMode: (mode: InspectorPickMode) => void;
  setHierarchyQuery: (query: string) => void;
  setFocusMode: (focusMode: InspectorFocusMode) => void;
  setTreeFilterMode: (mode: InspectorTreeFilterMode) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  toggleNodeMarked: (nodeId: string) => void;
};

const InspectorContext = React.createContext<InspectorContextValue | null>(null);

const DISABLED_ACTIVATION: InspectorActivation = {
  enabled: false,
  source: "disabled",
};
const INSPECTOR_UI_STORAGE_KEY = "dtm.workbenchInspector.ui.v3";

function readStoredInspectorState(): Partial<InspectorState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(INSPECTOR_UI_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<InspectorState>;
  } catch {
    return null;
  }
}

function mergeStoredInspectorState(state: InspectorState, stored: Partial<InspectorState> | null): InspectorState {
  if (!stored) return state;

  return {
    ...state,
    panelOpen: typeof stored.panelOpen === "boolean" ? stored.panelOpen : state.panelOpen,
    panelPosition:
      stored.panelPosition &&
      typeof stored.panelPosition.x === "number" &&
      typeof stored.panelPosition.y === "number"
        ? stored.panelPosition
        : state.panelPosition,
    pickMode: stored.pickMode === "on" || stored.pickMode === "off" ? stored.pickMode : state.pickMode,
    hierarchy: {
      ...state.hierarchy,
      expandedNodeIds: Array.isArray(stored.hierarchy?.expandedNodeIds)
        ? stored.hierarchy.expandedNodeIds.filter((value): value is string => typeof value === "string")
        : state.hierarchy.expandedNodeIds,
      markedNodeIds: Array.isArray(stored.hierarchy?.markedNodeIds)
        ? stored.hierarchy.markedNodeIds.filter((value): value is string => typeof value === "string")
        : state.hierarchy.markedNodeIds,
      query: typeof stored.hierarchy?.query === "string" ? stored.hierarchy.query : state.hierarchy.query,
      focusMode:
        stored.hierarchy?.focusMode === "all" || stored.hierarchy?.focusMode === "marked"
          ? stored.hierarchy.focusMode
          : state.hierarchy.focusMode,
      treeFilterMode:
        stored.hierarchy?.treeFilterMode === "all" || stored.hierarchy?.treeFilterMode === "smart"
          ? stored.hierarchy.treeFilterMode
          : state.hierarchy.treeFilterMode,
    },
  };
}

const DISABLED_ADAPTER: InspectorAdapter = {
  isEnabled() {
    return false;
  },
};

export function InspectorProvider(props: {
  activation?: InspectorActivation;
  adapter?: InspectorAdapter;
  children: React.ReactNode;
}) {
  const activation = props.activation ?? DISABLED_ACTIVATION;
  const adapter = props.adapter ?? DISABLED_ADAPTER;
  const [state, setState] = React.useState<InspectorState>(() =>
    mergeStoredInspectorState(createInitialInspectorState(activation), readStoredInspectorState())
  );
  const [refreshToken, setRefreshToken] = React.useState(0);

  React.useEffect(() => {
    setState((prev) => ({
      ...prev,
      enabled: activation.enabled && adapter.isEnabled(),
      debug: activation.debug ?? false,
    }));
  }, [activation, adapter]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        INSPECTOR_UI_STORAGE_KEY,
        JSON.stringify({
          panelOpen: state.panelOpen,
          panelPosition: state.panelPosition,
          pickMode: state.pickMode,
          hierarchy: state.hierarchy,
        })
      );
    } catch {
      // ignore storage write errors
    }
  }, [state.hierarchy, state.panelOpen, state.panelPosition, state.pickMode]);

  const scanResult = React.useMemo(
    () => (state.enabled ? scanInspectorDom(state.hierarchy.treeFilterMode) : { rootNodes: [], nodesById: new Map(), elementsById: new Map() }),
    [refreshToken, state.enabled, state.hierarchy.treeFilterMode]
  );

  React.useEffect(() => {
    if (!state.enabled) return;
    const handleViewportChange = () => setRefreshToken((value) => value + 1);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [state.enabled]);

  const value = React.useMemo<InspectorContextValue>(
    () => ({
      activation,
      adapter,
      state,
      rootNodes: scanResult.rootNodes,
      getNodeById: (nodeId) => (nodeId ? scanResult.nodesById.get(nodeId) ?? null : null),
      getNodeElement: (nodeId) => (nodeId ? scanResult.elementsById.get(nodeId) ?? null : null),
      refreshNodes: () => setRefreshToken((token) => token + 1),
      resolveNodeFromElement: (element) => {
        const chain: Element[] = [];
        let current = element;
        while (current) {
          chain.push(current);
          current = current.parentElement;
        }
        for (const candidate of chain) {
          for (const [nodeId, nodeElement] of scanResult.elementsById.entries()) {
            if (nodeElement === candidate) {
              return scanResult.nodesById.get(nodeId) ?? null;
            }
          }
        }
        return null;
      },
      setHoveredNodeId: (nodeId) => {
        setState((prev) => (prev.hoveredNodeId === nodeId ? prev : { ...prev, hoveredNodeId: nodeId }));
      },
      setSelectedNodeId: (nodeId) => {
        setState((prev) => (prev.selectedNodeId === nodeId ? prev : { ...prev, selectedNodeId: nodeId }));
      },
      setPanelOpen: (open) => {
        setState((prev) => (prev.panelOpen === open ? prev : { ...prev, panelOpen: open }));
      },
      setPanelPosition: (position) => {
        setState((prev) =>
          prev.panelPosition.x === position.x && prev.panelPosition.y === position.y
            ? prev
            : { ...prev, panelPosition: position }
        );
      },
      setPickMode: (mode) => {
        setState((prev) => (prev.pickMode === mode ? prev : { ...prev, pickMode: mode }));
      },
      setHierarchyQuery: (query) => {
        setState((prev) =>
          prev.hierarchy.query === query ? prev : { ...prev, hierarchy: { ...prev.hierarchy, query } }
        );
      },
      setFocusMode: (focusMode) => {
        setState((prev) =>
          prev.hierarchy.focusMode === focusMode ? prev : { ...prev, hierarchy: { ...prev.hierarchy, focusMode } }
        );
      },
      setTreeFilterMode: (mode) => {
        setState((prev) =>
          prev.hierarchy.treeFilterMode === mode ? prev : { ...prev, hierarchy: { ...prev.hierarchy, treeFilterMode: mode } }
        );
      },
      toggleNodeExpanded: (nodeId) => {
        setState((prev) => {
          const isExpanded = prev.hierarchy.expandedNodeIds.includes(nodeId);
          return {
            ...prev,
            hierarchy: {
              ...prev.hierarchy,
              expandedNodeIds: isExpanded
                ? prev.hierarchy.expandedNodeIds.filter((id) => id !== nodeId)
                : [...prev.hierarchy.expandedNodeIds, nodeId],
            },
          };
        });
      },
      toggleNodeMarked: (nodeId) => {
        setState((prev) => {
          const isMarked = prev.hierarchy.markedNodeIds.includes(nodeId);
          return {
            ...prev,
            hierarchy: {
              ...prev.hierarchy,
              markedNodeIds: isMarked
                ? prev.hierarchy.markedNodeIds.filter((id) => id !== nodeId)
                : [...prev.hierarchy.markedNodeIds, nodeId],
            },
          };
        });
      },
    }),
    [activation, adapter, scanResult.elementsById, scanResult.nodesById, scanResult.rootNodes, state]
  );

  return <InspectorContext.Provider value={value}>{props.children}</InspectorContext.Provider>;
}

export function useInspectorContext(): InspectorContextValue {
  const ctx = React.useContext(InspectorContext);
  if (!ctx) {
    throw new Error("Inspector components must be used inside InspectorProvider");
  }
  return ctx;
}
