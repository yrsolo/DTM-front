import React from "react";

import type {
  DraftChange,
  DraftChangeScope,
  SourceNode,
  InspectorActivation,
  InspectorAdapter,
  InspectorFocusMode,
  InspectorNode,
  InspectorPanelPosition,
  InspectorPickMode,
  InspectorState,
  SourceRuntimeBinding,
  SourceRuntimeBindingStatus,
  InspectorTreeFilterMode,
} from "../contracts/types";
import { createInitialInspectorState } from "../model/createInitialState";
import { buildFiberSourceGraph } from "../source-graph/buildFiberSourceGraph";
import { buildInspectorSourceGraph, mapSourceGraphToInspectorTree } from "../source-graph/buildSourceGraph";
import { getInspectorRuntimeRegistrations, resolveInspectorNodeIdFromElement, subscribeInspectorRuntime } from "./InspectorRuntimeRegistry";

type InspectorContextValue = {
  activation: InspectorActivation;
  adapter: InspectorAdapter;
  state: InspectorState;
  draftChanges: DraftChange[];
  debugEvents: string[];
  rootNodes: InspectorNode[];
  sourceRootNodes: SourceNode[];
  getNodeById: (nodeId: string | null | undefined) => InspectorNode | null;
  getNodeElement: (nodeId: string | null | undefined) => Element | null;
  getNodeElementDebug: (nodeId: string | null | undefined) => {
    found: boolean;
    mode: "direct" | "descendant" | "ancestor" | "missing";
    matchedNodeId: string | null;
    tagName: string | null;
  };
  getBindingDebug: (nodeId: string | null | undefined) => {
    bindingKey: string | null;
    canonicalMatches: string[];
    ownerComponentKey: string | null;
    ownerMatches: string[];
    componentName: string | null;
    componentMatches: string[];
  };
  refreshNodes: () => void;
  resolveNodeFromElement: (element: Element | null) => InspectorNode | null;
  setHoveredNodeId: (nodeId: string | null) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  setPanelPosition: (position: InspectorPanelPosition) => void;
  setPickMode: (mode: InspectorPickMode) => void;
  upsertDraftChange: (change: Omit<DraftChange, "id" | "status"> & { id?: string; status?: DraftChange["status"] }) => void;
  removeDraftChange: (draftChangeId: string) => void;
  clearDraftChangesForNode: (sourceNodeId: string) => void;
  setHierarchyQuery: (query: string) => void;
  setFocusMode: (focusMode: InspectorFocusMode) => void;
  setTreeFilterMode: (mode: InspectorTreeFilterMode) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  toggleNodeMarked: (nodeId: string) => void;
};

type RuntimeSourceNodeIndex = {
  nodesById: Map<string, SourceNode>;
  nodesByBindingKey: Map<string, SourceNode[]>;
  nodesByProjectionId: Map<string, SourceNode>;
  nodesByOwnerComponentKey: Map<string, SourceNode[]>;
  nodesByComponentName: Map<string, SourceNode[]>;
};

function findElementForNode(
  nodeId: string | null | undefined,
  nodesById: Map<string, InspectorNode>,
  elementsById: Map<string, Element>
): {
  element: Element | null;
  mode: "direct" | "descendant" | "ancestor" | "missing";
  matchedNodeId: string | null;
} {
  if (!nodeId) {
    return { element: null, mode: "missing", matchedNodeId: null };
  }
  const direct = elementsById.get(nodeId);
  if (direct) {
    return { element: direct, mode: "direct", matchedNodeId: nodeId };
  }
  const node = nodesById.get(nodeId);
  if (!node) {
    return { element: null, mode: "missing", matchedNodeId: null };
  }
  const canUseAncestorFallback =
    node.sourceCategory === "component-definition" ||
    Boolean(node.componentName && /^[A-Z]/.test(node.componentName));
  const stack = [...(node.children ?? [])];
  while (stack.length) {
    const current = stack.shift();
    if (!current) continue;
    const element = elementsById.get(current.id);
    if (element) {
      return { element, mode: "descendant", matchedNodeId: current.id };
    }
    if (current.children?.length) {
      stack.unshift(...current.children);
    }
  }
  if (canUseAncestorFallback) {
    let currentParentId = node.parentId ?? null;
    while (currentParentId) {
      const parentElement = elementsById.get(currentParentId);
      if (parentElement) {
        return { element: parentElement, mode: "ancestor", matchedNodeId: currentParentId };
      }
      const parentNode = nodesById.get(currentParentId);
      currentParentId = parentNode?.parentId ?? null;
    }
  }
  return { element: null, mode: "missing", matchedNodeId: null };
}

const InspectorContext = React.createContext<InspectorContextValue | null>(null);

const DISABLED_ACTIVATION: InspectorActivation = {
  enabled: false,
  source: "disabled",
};
const INSPECTOR_UI_STORAGE_KEY = "dtm.workbenchInspector.ui.v3";
const INSPECTOR_DRAFT_STORAGE_KEY = "dtm.workbenchInspector.draft.v1";

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

function readStoredDraftChanges(): DraftChange[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INSPECTOR_DRAFT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is DraftChange => {
      return (
        entry &&
        typeof entry.id === "string" &&
        typeof entry.sourceNodeId === "string" &&
        typeof entry.scope === "string" &&
        typeof entry.group === "string" &&
        typeof entry.key === "string" &&
        typeof entry.value === "string" &&
        typeof entry.status === "string"
      );
    });
  } catch {
    return [];
  }
}

function makeDraftChangeId(sourceNodeId: string, scope: DraftChangeScope, group: string, key: string): string {
  return `${sourceNodeId}::${scope}::${group}::${key}`;
}

const DISABLED_ADAPTER: InspectorAdapter = {
  isEnabled() {
    return false;
  },
};

function indexRuntimeSourceNodes(nodes: SourceNode[]): RuntimeSourceNodeIndex {
  const nodesById = new Map<string, SourceNode>();
  const nodesByBindingKey = new Map<string, SourceNode[]>();
  const nodesByProjectionId = new Map<string, SourceNode>();
  const nodesByOwnerComponentKey = new Map<string, SourceNode[]>();
  const nodesByComponentName = new Map<string, SourceNode[]>();
  const visit = (node: SourceNode) => {
    nodesById.set(node.id, node);
    if (node.bindingKey) {
      const bucket = nodesByBindingKey.get(node.bindingKey) ?? [];
      bucket.push(node);
      nodesByBindingKey.set(node.bindingKey, bucket);
    }
    const ownerComponentKey = `${node.ownerPath ?? node.path}::${node.componentName ?? ""}`;
    const ownerBucket = nodesByOwnerComponentKey.get(ownerComponentKey) ?? [];
    ownerBucket.push(node);
    nodesByOwnerComponentKey.set(ownerComponentKey, ownerBucket);
    const componentName = node.componentName ?? "";
    const componentBucket = nodesByComponentName.get(componentName) ?? [];
    componentBucket.push(node);
    nodesByComponentName.set(componentName, componentBucket);
    for (const projectionId of node.runtimeProjectionIds) {
      nodesByProjectionId.set(projectionId, node);
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return { nodesById, nodesByBindingKey, nodesByProjectionId, nodesByOwnerComponentKey, nodesByComponentName };
}

function getBindingStatus(runtimeProjectionIds: string[]): SourceRuntimeBindingStatus {
  if (!runtimeProjectionIds.length) return "unresolved";
  if (runtimeProjectionIds.length > 1) return "multiple";
  return "bound";
}

function buildSourceRuntimeBindings(
  sourceRootNodes: SourceNode[],
  runtimeIndex: RuntimeSourceNodeIndex
): Map<string, SourceRuntimeBinding> {
  const bindings = new Map<string, SourceRuntimeBinding>();
  const visit = (node: SourceNode) => {
    const matchedRuntimeNodes = node.bindingKey ? runtimeIndex.nodesByBindingKey.get(node.bindingKey) ?? [] : [];
    const runtimeProjectionIds = matchedRuntimeNodes.flatMap((runtimeNode) => runtimeNode.runtimeProjectionIds);
    bindings.set(node.id, {
      sourceNodeId: node.id,
      bindingKey: node.bindingKey ?? null,
      runtimeProjectionIds,
      status: getBindingStatus(runtimeProjectionIds),
    });
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of sourceRootNodes) visit(node);
  return bindings;
}

function buildSourceRuntimeFallbackBindings(
  sourceRootNodes: SourceNode[],
  runtimeIndex: RuntimeSourceNodeIndex,
  canonicalBindings: Map<string, SourceRuntimeBinding>
): Map<string, SourceRuntimeBinding> {
  const bindings = new Map<string, SourceRuntimeBinding>();
  const visit = (node: SourceNode) => {
    const canonicalBinding = canonicalBindings.get(node.id);
    if (canonicalBinding?.runtimeProjectionIds.length) {
      bindings.set(node.id, canonicalBinding);
    } else {
      const ownerComponentKey = `${node.ownerPath ?? node.path}::${node.componentName ?? ""}`;
      const ownerMatchedRuntimeNodes = runtimeIndex.nodesByOwnerComponentKey.get(ownerComponentKey) ?? [];
      const componentMatchedRuntimeNodes =
        !ownerMatchedRuntimeNodes.length &&
        node.componentName &&
        /^[A-Z]/.test(node.componentName)
          ? runtimeIndex.nodesByComponentName.get(node.componentName) ?? []
          : [];
      const matchedRuntimeNodes = ownerMatchedRuntimeNodes.length
        ? ownerMatchedRuntimeNodes
        : componentMatchedRuntimeNodes;
      const runtimeProjectionIds = matchedRuntimeNodes.flatMap((runtimeNode) => runtimeNode.runtimeProjectionIds);
      bindings.set(node.id, {
        sourceNodeId: node.id,
        bindingKey: canonicalBinding?.bindingKey ?? node.bindingKey ?? null,
        runtimeProjectionIds,
        status: runtimeProjectionIds.length ? "stale" : "unresolved",
      });
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of sourceRootNodes) visit(node);
  return bindings;
}

function bindSourceNodes(
  nodes: SourceNode[],
  bindings: Map<string, SourceRuntimeBinding>,
  runtimeNodesByProjectionId: Map<string, SourceNode>
): SourceNode[] {
  return nodes.map((node) => {
    const binding = bindings.get(node.id);
    const primaryRuntimeNode =
      binding?.runtimeProjectionIds.length
        ? runtimeNodesByProjectionId.get(binding.runtimeProjectionIds[0]) ?? null
        : null;
    return {
      ...node,
      ownerPath: node.ownerPath ?? primaryRuntimeNode?.ownerPath ?? node.path,
      semanticTargetId: node.semanticTargetId ?? primaryRuntimeNode?.semanticTargetId ?? null,
      runtimeProjectionIds: binding?.runtimeProjectionIds ?? [],
      children: bindSourceNodes(node.children ?? [], bindings, runtimeNodesByProjectionId),
      meta: {
        ...(node.meta ?? {}),
        bindingStatus: binding?.status ?? "unresolved",
        runtimeProjectionCount: binding?.runtimeProjectionIds.length ?? 0,
      },
    };
  });
}

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
  const [draftChanges, setDraftChanges] = React.useState<DraftChange[]>(() => readStoredDraftChanges());
  const [refreshToken, setRefreshToken] = React.useState(0);
  const [debugEvents, setDebugEvents] = React.useState<string[]>([]);
  const lastDebugSelectionRef = React.useRef<string>("");

  const pushDebugEvent = React.useCallback(
    (message: string) => {
      if (!state.debug) return;
      const line = `${new Date().toISOString()} ${message}`;
      setDebugEvents((prev) => [...prev.slice(-39), line]);
      console.debug("[workbench-inspector]", line);
    },
    [state.debug]
  );

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

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(INSPECTOR_DRAFT_STORAGE_KEY, JSON.stringify(draftChanges));
    } catch {
      // ignore storage write errors
    }
  }, [draftChanges]);

  React.useEffect(() => {
    if (!state.enabled) return;
    return subscribeInspectorRuntime(() => setRefreshToken((value) => value + 1));
  }, [state.enabled]);

  const scanResult = React.useMemo(
    () => {
      if (!state.enabled) {
        return {
          sourceRootNodes: [] as SourceNode[],
          rootNodes: [] as InspectorNode[],
          nodesById: new Map<string, InspectorNode>(),
          elementsById: new Map<string, Element>(),
          sourceNodeIdByRuntimeProjectionId: new Map<string, string>(),
          runtimeIndex: {
            nodesById: new Map<string, SourceNode>(),
            nodesByBindingKey: new Map<string, SourceNode[]>(),
            nodesByProjectionId: new Map<string, SourceNode>(),
            nodesByOwnerComponentKey: new Map<string, SourceNode[]>(),
            nodesByComponentName: new Map<string, SourceNode[]>(),
          } satisfies RuntimeSourceNodeIndex,
        };
      }

      const registrations = getInspectorRuntimeRegistrations();
      const snapshot = adapter.getSourceGraphSnapshot?.() ?? null;
      const autoSourceGraph = buildFiberSourceGraph(adapter.getHostRootElement?.() ?? null, registrations);
      const fallbackSourceGraph = autoSourceGraph ?? buildInspectorSourceGraph(registrations);
      const runtimeIndex = indexRuntimeSourceNodes(fallbackSourceGraph.rootNodes);
      const snapshotRootNodes = snapshot?.rootNodes?.length ? snapshot.rootNodes : null;
      const canonicalSourceBindings = snapshotRootNodes
        ? buildSourceRuntimeBindings(snapshotRootNodes, runtimeIndex)
        : new Map<string, SourceRuntimeBinding>();
      const sourceBindings = snapshotRootNodes
        ? buildSourceRuntimeFallbackBindings(snapshotRootNodes, runtimeIndex, canonicalSourceBindings)
        : canonicalSourceBindings;
      const sourceRootNodes = snapshotRootNodes
        ? bindSourceNodes(snapshotRootNodes, sourceBindings, runtimeIndex.nodesByProjectionId)
        : fallbackSourceGraph.rootNodes;
      const elementsById = new Map<string, Element>();
      const sourceNodeIdByRuntimeProjectionId = new Map<string, string>();

      if (snapshotRootNodes) {
        for (const [sourceNodeId, binding] of sourceBindings) {
          for (const runtimeProjectionId of binding.runtimeProjectionIds) {
            sourceNodeIdByRuntimeProjectionId.set(runtimeProjectionId, sourceNodeId);
          }
          const firstProjectionId = binding.runtimeProjectionIds[0];
          if (!firstProjectionId) continue;
          const runtimeNode = runtimeIndex.nodesByProjectionId.get(firstProjectionId);
          const element = runtimeNode ? fallbackSourceGraph.elementsBySourceNodeId.get(runtimeNode.id) ?? null : null;
          if (element) {
            elementsById.set(sourceNodeId, element);
          }
        }
      } else {
        for (const [sourceNodeId, element] of fallbackSourceGraph.elementsBySourceNodeId) {
          elementsById.set(sourceNodeId, element);
        }
        for (const [projectionId, runtimeNode] of runtimeIndex.nodesByProjectionId) {
          sourceNodeIdByRuntimeProjectionId.set(projectionId, runtimeNode.id);
        }
      }
      const sourceGraph = {
        ...fallbackSourceGraph,
        rootNodes: sourceRootNodes,
      };
      const rootNodes = mapSourceGraphToInspectorTree(sourceGraph.rootNodes, sourceGraph.runtimeProjectionsById);
      const nodesById = new Map<string, InspectorNode>();
      const visit = (node: InspectorNode) => {
        nodesById.set(node.id, node);
        for (const child of node.children ?? []) visit(child);
      };
      for (const node of rootNodes) visit(node);

      return {
        sourceRootNodes: sourceRootNodes,
        rootNodes,
        nodesById,
        elementsById,
        sourceNodeIdByRuntimeProjectionId,
        runtimeIndex,
      };
    },
    [refreshToken, state.enabled]
  );

  React.useEffect(() => {
    if (!state.enabled) return;
    const handleViewportChange = (event?: Event) => {
      const target = event?.target;
      if (
        target instanceof Element &&
        (target.closest("[data-workbench-inspector-shell='true']") ||
          target.closest("[data-workbench-inspector-sidebar='collapsed']"))
      ) {
        return;
      }
      setRefreshToken((value) => value + 1);
    };
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [state.enabled]);

  React.useEffect(() => {
    const activeSourceNodeIds = new Set<string>();
    const visit = (node: SourceNode) => {
      activeSourceNodeIds.add(node.id);
      for (const child of node.children ?? []) visit(child);
    };
    for (const node of scanResult.sourceRootNodes) visit(node);
    setDraftChanges((prev) =>
      prev.map((entry) => {
        const nextStatus = activeSourceNodeIds.has(entry.sourceNodeId) ? "active" : "stale";
        return entry.status === nextStatus ? entry : { ...entry, status: nextStatus };
      })
    );
  }, [scanResult.sourceRootNodes]);

  React.useEffect(() => {
    adapter.applyDraftChanges?.(draftChanges);
  }, [adapter, draftChanges]);

  React.useEffect(() => {
    if (!state.debug) return;
    const nextLine = `selection=${state.selectedNodeId ?? "none"} hovered=${state.hoveredNodeId ?? "none"} rootCount=${scanResult.rootNodes.length}`;
    if (lastDebugSelectionRef.current === nextLine) return;
    lastDebugSelectionRef.current = nextLine;
    pushDebugEvent(nextLine);
  }, [pushDebugEvent, scanResult.rootNodes.length, state.debug, state.hoveredNodeId, state.selectedNodeId]);

  const value = React.useMemo<InspectorContextValue>(
    () => ({
      activation,
      adapter,
      draftChanges,
      debugEvents,
      state,
      rootNodes: scanResult.rootNodes,
      sourceRootNodes: scanResult.sourceRootNodes,
      getNodeById: (nodeId) => (nodeId ? scanResult.nodesById.get(nodeId) ?? null : null),
      getNodeElement: (nodeId) => findElementForNode(nodeId, scanResult.nodesById, scanResult.elementsById).element,
      getNodeElementDebug: (nodeId) => {
        const resolved = findElementForNode(nodeId, scanResult.nodesById, scanResult.elementsById);
        return {
          found: Boolean(resolved.element),
          mode: resolved.mode,
          matchedNodeId: resolved.matchedNodeId,
          tagName: resolved.element?.tagName?.toLowerCase() ?? null,
        };
      },
      getBindingDebug: (nodeId) => {
        const node = nodeId ? scanResult.nodesById.get(nodeId) ?? null : null;
        const bindingKey = node?.bindingKey ?? null;
        const componentName = node?.componentName ?? null;
        const ownerComponentKey = node ? `${node.ownerPath ?? node.path}::${node.componentName ?? ""}` : null;
        const canonicalMatches = bindingKey
          ? (scanResult.runtimeIndex.nodesByBindingKey.get(bindingKey) ?? []).map((item) => item.id)
          : [];
        const ownerMatches = ownerComponentKey
          ? (scanResult.runtimeIndex.nodesByOwnerComponentKey.get(ownerComponentKey) ?? []).map((item) => item.id)
          : [];
        const componentMatches = componentName
          ? (scanResult.runtimeIndex.nodesByComponentName.get(componentName) ?? []).map((item) => item.id)
          : [];
        return {
          bindingKey,
          canonicalMatches,
          ownerComponentKey,
          ownerMatches,
          componentName,
          componentMatches,
        };
      },
      refreshNodes: () => setRefreshToken((token) => token + 1),
      resolveNodeFromElement: (element) => {
        const runtimeId = resolveInspectorNodeIdFromElement(element);
        const sourceNodeId = runtimeId ? scanResult.sourceNodeIdByRuntimeProjectionId.get(runtimeId) ?? null : null;
        pushDebugEvent(
          `resolve element tag=${element?.tagName?.toLowerCase() ?? "none"} runtimeId=${runtimeId ?? "none"} sourceNodeId=${sourceNodeId ?? "none"}`
        );
        return sourceNodeId ? scanResult.nodesById.get(sourceNodeId) ?? null : null;
      },
      setHoveredNodeId: (nodeId) => {
        if (nodeId !== state.hoveredNodeId) {
          pushDebugEvent(`hover -> ${nodeId ?? "none"}`);
        }
        setState((prev) => (prev.hoveredNodeId === nodeId ? prev : { ...prev, hoveredNodeId: nodeId }));
      },
      setSelectedNodeId: (nodeId) => {
        if (nodeId !== state.selectedNodeId) {
          pushDebugEvent(`select -> ${nodeId ?? "none"}`);
        }
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
      upsertDraftChange: (change) => {
        setDraftChanges((prev) => {
          const id = change.id ?? makeDraftChangeId(change.sourceNodeId, change.scope, change.group, change.key);
          const nextChange: DraftChange = {
            ...change,
            id,
            status: change.status ?? "active",
          };
          const existingIndex = prev.findIndex((entry) => entry.id === id);
          if (existingIndex === -1) return [...prev, nextChange];
          const next = [...prev];
          next[existingIndex] = nextChange;
          return next;
        });
      },
      removeDraftChange: (draftChangeId) => {
        setDraftChanges((prev) => prev.filter((entry) => entry.id !== draftChangeId));
      },
      clearDraftChangesForNode: (sourceNodeId) => {
        setDraftChanges((prev) => prev.filter((entry) => entry.sourceNodeId !== sourceNodeId));
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
        pushDebugEvent(`toggle expand -> ${nodeId}`);
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
        pushDebugEvent(`toggle mark -> ${nodeId}`);
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
    [
      activation,
      adapter,
      debugEvents,
      draftChanges,
      pushDebugEvent,
      scanResult.elementsById,
      scanResult.nodesById,
      scanResult.rootNodes,
      scanResult.runtimeIndex,
      scanResult.sourceNodeIdByRuntimeProjectionId,
      state,
    ]
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
