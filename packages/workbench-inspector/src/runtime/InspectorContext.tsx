import React from "react";

import type {
  DraftChange,
  DraftChangeScope,
  SourceBackedApplyResult,
  SourceBackedDraftChange,
  SourceNode,
  SourceNodeCategory,
  InspectorActivation,
  InspectorAdapter,
  InspectorFocusMode,
  InspectorNode,
  InspectorNodeBounds,
  InspectorPanelSize,
  InspectorPanelPosition,
  InspectorPickMode,
  InspectorRuntimeProjection,
  InspectorState,
  SourceRuntimeBinding,
  SourceRuntimeBindingStatus,
  InspectorTreeFilterMode,
} from "../contracts/types";
import { createInitialInspectorState } from "../model/createInitialState";
import { buildFiberSourceGraph } from "../source-graph/buildFiberSourceGraph";
import { buildInspectorSourceGraph, mapSourceGraphToInspectorTree, mergeSourceGraphArtifacts } from "../source-graph/buildSourceGraph";
import {
  getInspectorRuntimeRegistrations,
  resolveInspectorNodeIdFromElement,
  subscribeInspectorRuntime,
} from "./InspectorRuntimeRegistry";

type InspectorContextValue = {
  activation: InspectorActivation;
  adapter: InspectorAdapter;
  state: InspectorState;
  draftChanges: DraftChange[];
  sourceBackedDraftChanges: SourceBackedDraftChange[];
  sourceBackedApplyResult: SourceBackedApplyResult | null;
  debugEvents: string[];
  rootNodes: InspectorNode[];
  meaningfulRootNodes: InspectorNode[];
  allRootNodes: InspectorNode[];
  sourceRootNodes: SourceNode[];
  getNodeById: (nodeId: string | null | undefined) => InspectorNode | null;
  getNodeElement: (nodeId: string | null | undefined) => Element | null;
  getNodeElements: (nodeId: string | null | undefined) => Element[];
  getNodeDirectElements: (nodeId: string | null | undefined) => Element[];
  getNodeElementDebug: (nodeId: string | null | undefined) => {
    found: boolean;
    mode: "direct" | "descendant" | "ancestor" | "missing";
    matchedNodeId: string | null;
    tagName: string | null;
  };
  getBindingDebug: (nodeId: string | null | undefined) => {
    graphMode: "fiber" | "registrations" | "disabled";
    resolutionPath: string | null;
    bindingKey: string | null;
    canonicalMatches: string[];
    sourcePathComponentKey: string | null;
    sourcePathMatches: string[];
    ownerComponentKey: string | null;
    ownerMatches: string[];
    componentName: string | null;
    componentMatches: string[];
  };
  getHighlightDebug: (nodeId: string | null | undefined) => {
    projectionCount: number;
    projectionElementCount: number;
    resolvedElementCount: number;
    renderableRectCount: number;
    missingProjectionIds: string[];
  };
  refreshNodes: () => void;
  resolveNodeFromElement: (element: Element | null) => InspectorNode | null;
  setHoveredNodeId: (nodeId: string | null) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  setPanelPosition: (position: InspectorPanelPosition) => void;
  setPanelSize: (size: InspectorPanelSize) => void;
  setTreePaneWidth: (width: number) => void;
  setPickMode: (mode: InspectorPickMode) => void;
  upsertDraftChange: (change: Omit<DraftChange, "id" | "status"> & { id?: string; status?: DraftChange["status"] }) => void;
  removeDraftChange: (draftChangeId: string) => void;
  clearDraftChangesForNode: (sourceNodeId: string) => void;
  upsertSourceBackedDraftChange: (
    change: Omit<SourceBackedDraftChange, "id" | "status"> & { id?: string; status?: SourceBackedDraftChange["status"] }
  ) => void;
  removeSourceBackedDraftChange: (draftChangeId: string) => void;
  discardSourceBackedDraftChanges: (sourceNodeId?: string | null) => void;
  discardSourceBackedDraftIds: (draftIds: string[]) => void;
  applySourceBackedDraftChanges: (draftIds?: string[] | null) => Promise<SourceBackedApplyResult>;
  setHierarchyQuery: (query: string) => void;
  setFocusMode: (focusMode: InspectorFocusMode) => void;
  setTreeFilterMode: (mode: InspectorTreeFilterMode) => void;
  setHideInvisible: (hideInvisible: boolean) => void;
  setAutoRefreshTree: (autoRefreshTree: boolean) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  toggleNodeMarked: (nodeId: string) => void;
};

type ResolvedSourceRuntimeBinding = SourceRuntimeBinding & {
  resolutionPath: string;
};

type DomAssistedBindingResult = {
  bindings: Map<string, ResolvedSourceRuntimeBinding>;
  elementsByProjectionId: Map<string, Element>;
};

type DomIdGraph = {
  runtimeProjectionsById: Map<string, InspectorRuntimeProjection>;
  elementsBySourceNodeId: Map<string, Element[]>;
  elementsByProjectionId: Map<string, Element>;
  sourceNodeIdByProjectionId: Map<string, string>;
};

type RuntimeSourceNodeIndex = {
  nodesById: Map<string, SourceNode>;
  nodesByBindingKey: Map<string, SourceNode[]>;
  nodesByBindingKeyAndCategory: Map<string, SourceNode[]>;
  nodesByProjectionId: Map<string, SourceNode>;
  nodesByOwnerComponentKey: Map<string, SourceNode[]>;
  nodesByOwnerComponentKeyAndCategory: Map<string, SourceNode[]>;
  nodesByComponentName: Map<string, SourceNode[]>;
  nodesByComponentNameAndCategory: Map<string, SourceNode[]>;
  nodesBySourcePathAndComponent: Map<string, SourceNode[]>;
  nodesBySourcePathAndComponentAndCategory: Map<string, SourceNode[]>;
  nodesBySourcePathComponentAndPreview: Map<string, SourceNode[]>;
  nodesBySourcePathComponentAndPreviewAndCategory: Map<string, SourceNode[]>;
};

type StableNodeLocator = {
  id: string;
  sourceNodeId: string | null;
  bindingKey: string | null;
  projectionIds: string[];
  path: string | null;
  ownerPath: string | null;
  componentName: string | null;
  label: string | null;
  sourceCategory: SourceNodeCategory | null;
};

function toCategoryKey(category: SourceNodeCategory | null | undefined): string {
  return category ?? "unknown";
}

function sourceCategoryMatchesRuntimeNode(sourceCategory: SourceNodeCategory | null | undefined, runtimeNode: SourceNode): boolean {
  if (!sourceCategory) return true;
  if (sourceCategory === "repeated-projection-group") {
    return runtimeNode.category === "repeated-projection-group";
  }
  if (sourceCategory === "component-definition") {
    return runtimeNode.category === "component-definition";
  }
  return runtimeNode.category === "placement";
}

function getCategoryScopedKey(baseKey: string, category: SourceNodeCategory | null | undefined): string {
  return `${toCategoryKey(category)}::${baseKey}`;
}

function parseSourceLocationLine(sourceLocation: string | null | undefined): number | null {
  if (!sourceLocation) return null;
  const match = sourceLocation.match(/:(\d+):(\d+)$/);
  if (!match) return null;
  const line = Number(match[1]);
  return Number.isFinite(line) ? line : null;
}

function normalizeSourcePathForBinding(sourcePath: string | null | undefined): string | null {
  if (!sourcePath) return null;
  let normalized = sourcePath.replace(/\\/g, "/").trim();
  const viteFsMatch = normalized.match(/^https?:\/\/[^/]+\/@fs\/(.+)$/i);
  if (viteFsMatch?.[1]) normalized = viteFsMatch[1];
  if (normalized.startsWith("/@fs/")) normalized = normalized.slice("/@fs/".length);
  if (normalized.startsWith("/")) normalized = normalized.slice(1);

  const repoMarkerMatch = normalized.match(/(?:^|\/)(apps|packages|docs|scripts|work|presentation)\//i);
  if (repoMarkerMatch?.index != null) {
    normalized = normalized.slice(repoMarkerMatch.index + (normalized[repoMarkerMatch.index] === "/" ? 1 : 0));
  }

  const driveMatch = normalized.match(/^[a-z]:\//i);
  if (driveMatch) {
    normalized = `${normalized[0].toUpperCase()}${normalized.slice(1)}`;
  }

  return normalized;
}

function toDisplaySourcePath(sourcePath: string | null | undefined): string | null {
  return normalizeSourcePathForBinding(sourcePath);
}

function getSourcePathAndComponentKey(sourcePath: string | null | undefined, componentName: string | null | undefined): string | null {
  const normalizedSourcePath = normalizeSourcePathForBinding(sourcePath);
  if (!normalizedSourcePath || !componentName) return null;
  return `${normalizedSourcePath}::${componentName}`;
}

function getSourcePathComponentAndPreviewKey(
  sourcePath: string | null | undefined,
  componentName: string | null | undefined,
  previewText: string | null | undefined
): string | null {
  const normalizedSourcePath = normalizeSourcePathForBinding(sourcePath);
  if (!normalizedSourcePath || !componentName || !previewText) return null;
  return `${normalizedSourcePath}::${componentName}::${previewText}`;
}

function normalizeBindingPathSegment(segment: string | null | undefined): string {
  if (!segment) return "";
  return segment
    .replace(/"[^"]*"/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "");
}

function getOwnerPathBindingKey(path: string | null | undefined, componentName: string | null | undefined): string | null {
  if (!path) return null;
  const normalizedSegments = path
    .split(">")
    .map((segment) => normalizeBindingPathSegment(segment))
    .filter(Boolean);
  if (!normalizedSegments.length) return null;
  const normalizedPathTail = normalizedSegments.slice(-6).join(">");
  const normalizedComponentName = normalizeBindingPathSegment(componentName);
  return `${normalizedPathTail}::${normalizedComponentName}`;
}

function chooseClosestRuntimeNodesBySourceLocation(
  sourceLocation: string | null | undefined,
  candidates: SourceNode[],
  options?: { maxDistance?: number }
): SourceNode[] {
  const sourceLine = parseSourceLocationLine(sourceLocation);
  if (sourceLine == null || !candidates.length) return candidates;

  let closestDistance = Number.POSITIVE_INFINITY;
  let closestNodes: SourceNode[] = [];

  for (const candidate of candidates) {
    const candidateLine = parseSourceLocationLine(candidate.sourceLocation);
    if (candidateLine == null) continue;
    const distance = Math.abs(candidateLine - sourceLine);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestNodes = [candidate];
    } else if (distance === closestDistance) {
      closestNodes.push(candidate);
    }
  }

  if (!closestNodes.length) return candidates;
  if (closestDistance > (options?.maxDistance ?? 8)) return [];
  return closestNodes;
}

function getSourceLocationMatchDistance(
  node: { componentName?: string | null | undefined; category?: SourceNode["category"]; sourceCategory?: InspectorNode["sourceCategory"] }
): number {
  const componentName = node.componentName ?? "";
  const category = node.category ?? node.sourceCategory;
  if (category === "repeated-projection-group") return 24;
  if (isHostLikeComponentName(componentName)) return 32;
  return 8;
}

function collectDuplicateInspectorNodeIds(rootNodes: InspectorNode[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  const visit = (node: InspectorNode) => {
    if (seen.has(node.id)) {
      duplicates.add(node.id);
    } else {
      seen.add(node.id);
    }
    for (const child of node.children ?? []) visit(child);
  };

  for (const node of rootNodes) visit(node);
  return [...duplicates].sort();
}

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

function collectProjectionElementsForNode(
  nodeId: string,
  nodesById: Map<string, InspectorNode>,
  elementsByProjectionId: Map<string, Element>,
  elementsByNodeId: Map<string, Element[]>
): Element[] {
  const directElements = elementsByNodeId.get(nodeId) ?? [];
  const uniqueElements: Element[] = [...directElements];
  const visitedNodeIds = new Set<string>();

  const visit = (currentNodeId: string) => {
    if (visitedNodeIds.has(currentNodeId)) return;
    visitedNodeIds.add(currentNodeId);
    const node = nodesById.get(currentNodeId);
    if (!node) return;
    for (const projectionId of node.projectionIds ?? []) {
      const element = elementsByProjectionId.get(projectionId) ?? null;
      if (element && !uniqueElements.includes(element)) {
        uniqueElements.push(element);
      }
    }
    for (const child of node.children ?? []) {
      visit(child.id);
    }
  };

  visit(nodeId);
  return uniqueElements;
}

function createStableNodeLocator(node: InspectorNode | null | undefined): StableNodeLocator | null {
  if (!node) return null;
  return {
    id: node.id,
    sourceNodeId: node.sourceNodeId ?? null,
    bindingKey: node.bindingKey ?? null,
    projectionIds: [...(node.projectionIds ?? [])],
    path: node.path ?? null,
    ownerPath: node.ownerPath ?? null,
    componentName: node.componentName ?? null,
    label: node.label ?? null,
    sourceCategory: node.sourceCategory ?? null,
  };
}

function resolveStableNodeId(
  locator: StableNodeLocator | null,
  nodesById: Map<string, InspectorNode>,
  sourceNodeIdByRuntimeProjectionId: Map<string, string>
): string | null {
  if (!locator) return null;
  if (nodesById.has(locator.id)) return locator.id;
  if (locator.sourceNodeId && nodesById.has(locator.sourceNodeId)) return locator.sourceNodeId;

  for (const projectionId of locator.projectionIds) {
    const mappedNodeId = sourceNodeIdByRuntimeProjectionId.get(projectionId) ?? null;
    if (mappedNodeId && nodesById.has(mappedNodeId)) return mappedNodeId;
  }

  for (const node of nodesById.values()) {
    if (locator.bindingKey && node.bindingKey === locator.bindingKey) return node.id;
  }

  for (const node of nodesById.values()) {
    if (
      node.componentName === locator.componentName &&
      node.path === locator.path &&
      (node.sourceCategory ?? null) === locator.sourceCategory
    ) {
      return node.id;
    }
  }

  for (const node of nodesById.values()) {
    if (
      node.componentName === locator.componentName &&
      node.ownerPath === locator.ownerPath &&
      node.label === locator.label
    ) {
      return node.id;
    }
  }

  return null;
}

function collectBoundProjectionIds(bindings: Map<string, ResolvedSourceRuntimeBinding>): Set<string> {
  const projectionIds = new Set<string>();
  for (const binding of bindings.values()) {
    for (const projectionId of binding.runtimeProjectionIds ?? []) {
      projectionIds.add(projectionId);
    }
  }
  return projectionIds;
}

function collectSourcePathsFromTree(nodes: SourceNode[]): Set<string> {
  const sourcePaths = new Set<string>();
  const visit = (node: SourceNode) => {
    const normalizedSourcePath = normalizeSourcePathForBinding(node.sourcePath);
    if (normalizedSourcePath) sourcePaths.add(normalizedSourcePath);
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return sourcePaths;
}

function collectSourceNodeIdsFromTree(nodes: SourceNode[]): Set<string> {
  const sourceNodeIds = new Set<string>();
  const visit = (node: SourceNode) => {
    sourceNodeIds.add(node.id);
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return sourceNodeIds;
}

function isMeaningfulWrapperLikeSourceNode(node: SourceNode): boolean {
  const rawName = node.componentName || node.label || "";
  const rootName = rawName.split(".")[0] ?? rawName;
  if (!rootName) return false;
  if (
    /^(app|layout|browserrouter|approutes|routes|route|renderedroute|timelineentrypage|fragment|strictmode|suspense)$/i.test(
      rootName
    )
  ) {
    return true;
  }
  if (/entrypage$/i.test(rootName) || /routes$/i.test(rootName)) return true;
  if (/provider$/i.test(rawName) || rawName.includes(".Provider")) return true;
  return false;
}

function isAuthoringToolSourceNode(node: SourceNode): boolean {
  const sourcePath = normalizeSourcePathForBinding(node.sourcePath);
  const componentName = (node.componentName || "").trim();
  const label = (node.label || "").trim();
  if (sourcePath?.endsWith("apps/web/src/components/ControlsWorkbench.tsx")) return true;
  if (/^ControlsWorkbench$/i.test(componentName)) return true;
  if (/^div\.controlDock$/i.test(componentName) || /^Workbench dock$/i.test(label)) return true;
  return false;
}

function filterMeaningfulSourceNodes(nodes: SourceNode[], parentId: string | null = null): SourceNode[] {
  const output: SourceNode[] = [];
  for (const node of nodes) {
    if (isAuthoringToolSourceNode(node)) continue;
    const children = filterMeaningfulSourceNodes(node.children ?? [], node.id);
    const isWrapperLike = isMeaningfulWrapperLikeSourceNode(node);
    if (isWrapperLike && children.length === 0 && !(node.runtimeProjectionIds?.length ?? 0)) {
      continue;
    }
    const shouldFlatten =
      isWrapperLike &&
      children.length > 0 &&
      node.category !== "repeated-projection-group";
    if (shouldFlatten) {
      output.push(
        ...children.map((child) => (child.parentId === parentId ? child : { ...child, parentId }))
      );
      continue;
    }
    if (node.category === "component-definition" && !children.length && !node.runtimeProjectionIds.length) {
      continue;
    }
    output.push({
      ...node,
      parentId,
      children,
    });
  }
  return output;
}

function getCanonicalSourceNodeIdMeta(node: SourceNode): string | null {
  const value = node.meta?.canonicalSourceNodeId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mergeSourceNodes(left: SourceNode, right: SourceNode): SourceNode {
  return {
    ...left,
    ...right,
    label: left.label || right.label,
    componentName: left.componentName || right.componentName,
    kind: left.kind || right.kind,
    path: left.path || right.path,
    ownerPath: left.ownerPath || right.ownerPath,
    sourcePath: left.sourcePath || right.sourcePath,
    sourceLocation: left.sourceLocation || right.sourceLocation,
    definitionId: left.definitionId ?? right.definitionId,
    placementId: left.placementId ?? right.placementId,
    repeatedGroupId: left.repeatedGroupId ?? right.repeatedGroupId,
    semanticTargetId: left.semanticTargetId ?? right.semanticTargetId,
    runtimeProjectionIds: [...new Set([...(left.runtimeProjectionIds ?? []), ...(right.runtimeProjectionIds ?? [])])],
    children: dedupeSourceNodeForest([...(left.children ?? []), ...(right.children ?? [])]),
    meta: {
      ...(left.meta ?? {}),
      ...(right.meta ?? {}),
    },
  };
}

function dedupeSourceNodeForest(nodes: SourceNode[]): SourceNode[] {
  const mergedById = new Map<string, SourceNode>();
  const order: string[] = [];

  for (const node of nodes) {
    const normalizedNode: SourceNode = {
      ...node,
      children: dedupeSourceNodeForest(node.children ?? []),
      runtimeProjectionIds: [...new Set(node.runtimeProjectionIds ?? [])],
    };
    const existing = mergedById.get(node.id);
    if (!existing) {
      mergedById.set(node.id, normalizedNode);
      order.push(node.id);
      continue;
    }
    mergedById.set(node.id, mergeSourceNodes(existing, normalizedNode));
  }

  return order.map((id) => mergedById.get(id)!);
}

function pruneDuplicateSourceNodeIdsInForest(nodes: SourceNode[]): SourceNode[] {
  const seenNodeIds = new Set<string>();

  const visit = (node: SourceNode, parentId: string | null, depth: number): SourceNode | null => {
    if (seenNodeIds.has(node.id)) return null;
    seenNodeIds.add(node.id);
    const children = (node.children ?? [])
      .map((child) => visit(child, node.id, depth + 1))
      .filter((child): child is SourceNode => Boolean(child));
    return {
      ...node,
      parentId,
      depth,
      children,
    };
  };

  return nodes
    .map((node) => visit(node, null, 0))
    .filter((node): node is SourceNode => Boolean(node));
}

function collectRuntimeSupplementNodes(
  nodes: SourceNode[],
  boundProjectionIds: Set<string>,
  coveredSourcePaths: Set<string>,
  coveredSourceNodeIds: Set<string>,
  mode: "meaningful" | "all"
): SourceNode[] {
  const visit = (node: SourceNode, parentId: string | null, depth: number): SourceNode | null => {
    const filteredChildren = (node.children ?? [])
      .map((child) => visit(child, node.id, depth + 1))
      .filter((child): child is SourceNode => Boolean(child));
    const hasBoundProjection = (node.runtimeProjectionIds ?? []).some((projectionId) => boundProjectionIds.has(projectionId));
    const isLeafMeaningfulKind = node.kind === "control" || node.kind === "text" || node.kind === "image";
    const normalizedSourcePath = normalizeSourcePathForBinding(node.sourcePath);
    const isCoveredBySnapshot = normalizedSourcePath ? coveredSourcePaths.has(normalizedSourcePath) : false;
    const canonicalSourceNodeId = getCanonicalSourceNodeIdMeta(node);
    const isCoveredBySourceNodeId = coveredSourceNodeIds.has(node.id) || (canonicalSourceNodeId ? coveredSourceNodeIds.has(canonicalSourceNodeId) : false);
    const hasRuntimeProjection = (node.runtimeProjectionIds?.length ?? 0) > 0;
    const keepNode =
      !hasBoundProjection &&
      !isCoveredBySnapshot &&
      !isCoveredBySourceNodeId &&
      (mode === "meaningful" ? isLeafMeaningfulKind || filteredChildren.length > 0 : hasRuntimeProjection || filteredChildren.length > 0);
    if (!keepNode) return null;
    return {
      ...node,
      parentId,
      depth,
      children: filteredChildren,
      meta: {
        ...(node.meta ?? {}),
        runtimeOnlySupplement: true,
      },
    };
  };

  return pruneDuplicateSourceNodeIdsInForest(
    dedupeSourceNodeForest(
    nodes
    .map((node) => visit(node, null, 0))
    .filter((node): node is SourceNode => Boolean(node))
    )
  );
}

const InspectorContext = React.createContext<InspectorContextValue | null>(null);

const DISABLED_ACTIVATION: InspectorActivation = {
  enabled: false,
  source: "disabled",
};
const INSPECTOR_UI_STORAGE_KEY = "dtm.workbenchInspector.ui.v3";
const INSPECTOR_DRAFT_STORAGE_KEY = "dtm.workbenchInspector.draft.v1";
const INSPECTOR_SOURCE_BACKED_DRAFT_STORAGE_KEY = "dtm.workbenchInspector.sourceBackedDraft.v1";

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
    panelSize:
      stored.panelSize &&
      typeof stored.panelSize.width === "number" &&
      typeof stored.panelSize.height === "number"
        ? stored.panelSize
        : state.panelSize,
    treePaneWidth: typeof stored.treePaneWidth === "number" ? stored.treePaneWidth : state.treePaneWidth,
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
        stored.hierarchy?.treeFilterMode === "all" ||
        stored.hierarchy?.treeFilterMode === "smart" ||
        stored.hierarchy?.treeFilterMode === "repeated"
          ? stored.hierarchy.treeFilterMode
          : state.hierarchy.treeFilterMode,
      hideInvisible:
        typeof stored.hierarchy?.hideInvisible === "boolean"
          ? stored.hierarchy.hideInvisible
          : state.hierarchy.hideInvisible,
      autoRefreshTree:
        typeof stored.hierarchy?.autoRefreshTree === "boolean"
          ? stored.hierarchy.autoRefreshTree
          : state.hierarchy.autoRefreshTree,
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

function readStoredSourceBackedDraftChanges(): SourceBackedDraftChange[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INSPECTOR_SOURCE_BACKED_DRAFT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is SourceBackedDraftChange => {
      return (
        entry &&
        typeof entry.id === "string" &&
        typeof entry.parameterId === "string" &&
        typeof entry.sourceNodeId === "string" &&
        typeof entry.parameterLabel === "string" &&
        typeof entry.parameterGroup === "string" &&
        typeof entry.valueKind === "string" &&
        typeof entry.originKind === "string" &&
        typeof entry.currentValue === "string" &&
        typeof entry.draftValue === "string" &&
        typeof entry.editKind === "string" &&
        typeof entry.targetScope === "string" &&
        typeof entry.applyStrategy === "string" &&
        typeof entry.status === "string" &&
        entry.origin &&
        typeof entry.origin.sourcePath === "string" &&
        typeof entry.origin.sourceLocation === "string" &&
        typeof entry.origin.astPath === "string"
      );
    });
  } catch {
    return [];
  }
}

function makeDraftChangeId(sourceNodeId: string, scope: DraftChangeScope, group: string, key: string): string {
  return `${sourceNodeId}::${scope}::${group}::${key}`;
}

function makeSourceBackedDraftChangeId(
  sourceNodeId: string,
  parameterId: string,
  targetScope: SourceBackedDraftChange["targetScope"],
  applyStrategy: SourceBackedDraftChange["applyStrategy"]
): string {
  return `${sourceNodeId}::source-backed::${parameterId}::${targetScope}::${applyStrategy}`;
}

const DISABLED_ADAPTER: InspectorAdapter = {
  isEnabled() {
    return false;
  },
};

function indexRuntimeSourceNodes(nodes: SourceNode[]): RuntimeSourceNodeIndex {
  const nodesById = new Map<string, SourceNode>();
  const nodesByBindingKey = new Map<string, SourceNode[]>();
  const nodesByBindingKeyAndCategory = new Map<string, SourceNode[]>();
  const nodesByProjectionId = new Map<string, SourceNode>();
  const nodesByOwnerComponentKey = new Map<string, SourceNode[]>();
  const nodesByOwnerComponentKeyAndCategory = new Map<string, SourceNode[]>();
  const nodesByComponentName = new Map<string, SourceNode[]>();
  const nodesByComponentNameAndCategory = new Map<string, SourceNode[]>();
  const nodesBySourcePathAndComponent = new Map<string, SourceNode[]>();
  const nodesBySourcePathAndComponentAndCategory = new Map<string, SourceNode[]>();
  const nodesBySourcePathComponentAndPreview = new Map<string, SourceNode[]>();
  const nodesBySourcePathComponentAndPreviewAndCategory = new Map<string, SourceNode[]>();
  const visit = (node: SourceNode) => {
    const existingNode = nodesById.get(node.id);
    if (existingNode) {
      const mergedProjectionIds = [...new Set([...(existingNode.runtimeProjectionIds ?? []), ...(node.runtimeProjectionIds ?? [])])];
      if (mergedProjectionIds.length !== (existingNode.runtimeProjectionIds?.length ?? 0)) {
        existingNode.runtimeProjectionIds = mergedProjectionIds;
      }
      if ((existingNode.children?.length ?? 0) === 0 && (node.children?.length ?? 0) > 0) {
        existingNode.children = node.children;
      }
      for (const projectionId of node.runtimeProjectionIds) {
        nodesByProjectionId.set(projectionId, existingNode);
      }
      for (const child of node.children ?? []) visit(child);
      return;
    }
    nodesById.set(node.id, node);
    if (node.bindingKey) {
      const bucket = nodesByBindingKey.get(node.bindingKey) ?? [];
      bucket.push(node);
      nodesByBindingKey.set(node.bindingKey, bucket);
      const categoryBucketKey = getCategoryScopedKey(node.bindingKey, node.category);
      const categoryBucket = nodesByBindingKeyAndCategory.get(categoryBucketKey) ?? [];
      categoryBucket.push(node);
      nodesByBindingKeyAndCategory.set(categoryBucketKey, categoryBucket);
    }
    const ownerComponentKey = getOwnerPathBindingKey(node.ownerPath ?? node.path, node.componentName);
    if (ownerComponentKey) {
      const ownerBucket = nodesByOwnerComponentKey.get(ownerComponentKey) ?? [];
      ownerBucket.push(node);
      nodesByOwnerComponentKey.set(ownerComponentKey, ownerBucket);
      const ownerCategoryBucketKey = getCategoryScopedKey(ownerComponentKey, node.category);
      const ownerCategoryBucket = nodesByOwnerComponentKeyAndCategory.get(ownerCategoryBucketKey) ?? [];
      ownerCategoryBucket.push(node);
      nodesByOwnerComponentKeyAndCategory.set(ownerCategoryBucketKey, ownerCategoryBucket);
    }
    const componentName = node.componentName ?? "";
    const componentBucket = nodesByComponentName.get(componentName) ?? [];
    componentBucket.push(node);
    nodesByComponentName.set(componentName, componentBucket);
    const componentCategoryBucketKey = getCategoryScopedKey(componentName, node.category);
    const componentCategoryBucket = nodesByComponentNameAndCategory.get(componentCategoryBucketKey) ?? [];
    componentCategoryBucket.push(node);
    nodesByComponentNameAndCategory.set(componentCategoryBucketKey, componentCategoryBucket);
    const sourcePathAndComponentKey = getSourcePathAndComponentKey(node.sourcePath, node.componentName);
    if (sourcePathAndComponentKey) {
      const sourceBucket = nodesBySourcePathAndComponent.get(sourcePathAndComponentKey) ?? [];
      sourceBucket.push(node);
      nodesBySourcePathAndComponent.set(sourcePathAndComponentKey, sourceBucket);
      const sourceCategoryBucketKey = getCategoryScopedKey(sourcePathAndComponentKey, node.category);
      const sourceCategoryBucket = nodesBySourcePathAndComponentAndCategory.get(sourceCategoryBucketKey) ?? [];
      sourceCategoryBucket.push(node);
      nodesBySourcePathAndComponentAndCategory.set(sourceCategoryBucketKey, sourceCategoryBucket);
    }
    const previewText = getRuntimeNodePreviewText(node);
    const sourcePathComponentAndPreviewKey = getSourcePathComponentAndPreviewKey(
      node.sourcePath,
      node.componentName,
      previewText
    );
    if (sourcePathComponentAndPreviewKey) {
      const previewBucket = nodesBySourcePathComponentAndPreview.get(sourcePathComponentAndPreviewKey) ?? [];
      previewBucket.push(node);
      nodesBySourcePathComponentAndPreview.set(sourcePathComponentAndPreviewKey, previewBucket);
      const previewCategoryBucketKey = getCategoryScopedKey(sourcePathComponentAndPreviewKey, node.category);
      const previewCategoryBucket =
        nodesBySourcePathComponentAndPreviewAndCategory.get(previewCategoryBucketKey) ?? [];
      previewCategoryBucket.push(node);
      nodesBySourcePathComponentAndPreviewAndCategory.set(previewCategoryBucketKey, previewCategoryBucket);
    }
    for (const projectionId of node.runtimeProjectionIds) {
      nodesByProjectionId.set(projectionId, node);
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return {
    nodesById,
    nodesByBindingKey,
    nodesByBindingKeyAndCategory,
    nodesByProjectionId,
    nodesByOwnerComponentKey,
    nodesByOwnerComponentKeyAndCategory,
    nodesByComponentName,
    nodesBySourcePathAndComponent,
    nodesByComponentNameAndCategory,
    nodesBySourcePathAndComponentAndCategory,
    nodesBySourcePathComponentAndPreview,
    nodesBySourcePathComponentAndPreviewAndCategory,
  };
}

function getBindingStatus(runtimeProjectionIds: string[]): SourceRuntimeBindingStatus {
  if (!runtimeProjectionIds.length) return "unresolved";
  if (runtimeProjectionIds.length > 1) return "multiple";
  return "bound";
}

function isCanonicalSourceNodeId(value: string | null | undefined): boolean {
  return /^(src|rpt|defn)_/i.test(value ?? "");
}

function getElementBounds(element: Element): InspectorNodeBounds | null {
  const rect = element.getBoundingClientRect();
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return null;
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function isElementActuallyVisible(element: Element): boolean {
  if (typeof (element as Element & { checkVisibility?: (options?: object) => boolean }).checkVisibility === "function") {
    try {
      const isVisible = (
        element as Element & { checkVisibility: (options?: object) => boolean }
      ).checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
        contentVisibilityAuto: true,
      });
      if (!isVisible) return false;
    } catch {
      // Fall through to conservative manual checks when needed.
    }
  }
  if (element.getClientRects().length === 0) return false;
  const bounds = getElementBounds(element);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return false;
  if (typeof window === "undefined" || !(element instanceof HTMLElement || element instanceof SVGElement)) {
    return true;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none") return false;
  if (style.visibility === "hidden" || style.visibility === "collapse") return false;
  if (Number(style.opacity) === 0) return false;
  if (element instanceof HTMLElement && element.hidden) return false;
  if ("ariaHidden" in element && element.getAttribute("aria-hidden") === "true") return false;
  return true;
}

function isHostLikeComponentName(componentName: string | null | undefined): boolean {
  if (!componentName) return false;
  const tagName = componentName.split(".")[0] ?? componentName;
  return /^[a-z]/.test(tagName);
}

function getExpectedTagName(componentName: string | null | undefined): string | null {
  if (!componentName) return null;
  return componentName.split(".")[0]?.toLowerCase() ?? null;
}

function normalizeDomPreviewText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function getNodeExpectedPreviewText(node: SourceNode): string {
  const label = node.label ?? "";
  const match = label.match(/^[a-zA-Z0-9_.-]+\s+"(.+)"$/);
  return normalizeDomPreviewText(match?.[1] ?? "");
}

function getRuntimeNodePreviewText(node: SourceNode): string {
  const label = node.label ?? "";
  const match = label.match(/^[a-zA-Z0-9_.-]+\s+"(.+)"$/);
  return normalizeDomPreviewText(match?.[1] ?? "");
}

function getElementPreviewText(element: Element): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return normalizeDomPreviewText(element.value || element.placeholder || element.getAttribute("aria-label"));
  }
  if (element instanceof HTMLSelectElement) {
    const selectedLabel =
      element.selectedOptions?.length
        ? [...element.selectedOptions].map((option) => option.textContent ?? "").join(", ")
        : element.value;
    return normalizeDomPreviewText(selectedLabel || element.getAttribute("aria-label"));
  }
  return normalizeDomPreviewText(
    element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.textContent
  );
}

function getElementIdentityName(element: Element): string {
  const tagName = element.tagName.toLowerCase();
  const className =
    element instanceof HTMLElement
      ? element.className
      : element instanceof SVGElement
        ? (typeof element.className?.baseVal === "string" ? element.className.baseVal : "")
        : "";
  const firstClassName = className.trim().split(/\s+/)[0] ?? "";
  if (!firstClassName || isHostLikeComponentName(tagName)) return tagName;
  return `${tagName}.${firstClassName}`;
}

function buildDomIdGraph(hostRoot: Element | null): DomIdGraph {
  const runtimeProjectionsById = new Map<string, InspectorRuntimeProjection>();
  const elementsBySourceNodeId = new Map<string, Element[]>();
  const elementsByProjectionId = new Map<string, Element>();
  const sourceNodeIdByProjectionId = new Map<string, string>();

  if (!hostRoot) {
    return {
      runtimeProjectionsById,
      elementsBySourceNodeId,
      elementsByProjectionId,
      sourceNodeIdByProjectionId,
    };
  }

  const elements: Element[] = [];
  if (hostRoot instanceof HTMLElement || hostRoot instanceof SVGElement) {
    if (hostRoot.hasAttribute("data-wb-id")) {
      elements.push(hostRoot);
    }
  }
  elements.push(...hostRoot.querySelectorAll("[data-wb-id]"));

  const countsBySourceNodeId = new Map<string, number>();

  for (const element of elements) {
    const sourceNodeId = element.getAttribute("data-wb-id")?.trim() ?? "";
    if (!sourceNodeId) continue;
    const nextIndex = countsBySourceNodeId.get(sourceNodeId) ?? 0;
    countsBySourceNodeId.set(sourceNodeId, nextIndex + 1);
    const projectionId = `wbdom:${sourceNodeId}:${nextIndex}`;
    const bucket = elementsBySourceNodeId.get(sourceNodeId) ?? [];
    bucket.push(element);
    elementsBySourceNodeId.set(sourceNodeId, bucket);
    elementsByProjectionId.set(projectionId, element);
    sourceNodeIdByProjectionId.set(projectionId, sourceNodeId);
    const bounds = getElementBounds(element);
    runtimeProjectionsById.set(projectionId, {
      id: projectionId,
      sourceNodeId,
      bounds,
      isVisible: isElementActuallyVisible(element),
      isInteractive:
        element instanceof HTMLElement
          ? element.tabIndex >= 0 || typeof element.onclick === "function" || /^(button|a|input|select|textarea)$/.test(element.tagName.toLowerCase())
          : false,
      tagName: element.tagName.toLowerCase(),
    });
  }

  return {
    runtimeProjectionsById,
    elementsBySourceNodeId,
    elementsByProjectionId,
    sourceNodeIdByProjectionId,
  };
}

function elementMatchesSourceNode(element: Element, node: SourceNode): boolean {
  const expectedTagName = getExpectedTagName(node.componentName);
  if (!expectedTagName) return false;
  const actualTagName = element.tagName.toLowerCase();
  if (expectedTagName !== actualTagName) return false;
  const expectedPreviewText = getNodeExpectedPreviewText(node);
  if (!expectedPreviewText) return true;
  const actualPreviewText = getElementPreviewText(element);
  return actualPreviewText === expectedPreviewText;
}

function applyRuntimeElementPreviewBindings(
  sourceRootNodes: SourceNode[],
  existingBindings: Map<string, ResolvedSourceRuntimeBinding>,
  runtimeNodesById: Map<string, SourceNode>,
  runtimeElementsByProjectionId: Map<string, Element>
): Map<string, ResolvedSourceRuntimeBinding> {
  const bindings = new Map(existingBindings);
  const runtimeNodes = [...runtimeNodesById.values()];

  const visit = (node: SourceNode) => {
    const existingBinding = bindings.get(node.id);
    if (
      !isCanonicalSourceNodeId(node.id) &&
      !isCanonicalSourceNodeId(node.bindingKey) &&
      !existingBinding?.runtimeProjectionIds.length &&
      isHostLikeComponentName(node.componentName)
    ) {
      const expectedTagName = getExpectedTagName(node.componentName);
      const expectedPreviewText = getNodeExpectedPreviewText(node);
      const candidates = runtimeNodes.filter((runtimeNode) => {
        if (!runtimeNode.runtimeProjectionIds.length) return false;
        if (normalizeSourcePathForBinding(runtimeNode.sourcePath) !== normalizeSourcePathForBinding(node.sourcePath)) return false;
        for (const projectionId of runtimeNode.runtimeProjectionIds) {
          const element = runtimeElementsByProjectionId.get(projectionId) ?? null;
          if (!element) continue;
          if (expectedTagName && element.tagName.toLowerCase() !== expectedTagName) continue;
          if (expectedPreviewText) {
            const actualPreviewText = getElementPreviewText(element);
            if (actualPreviewText !== expectedPreviewText) continue;
          }
          return true;
        }
        return false;
      });

      const matchedRuntimeNodes = chooseClosestRuntimeNodesBySourceLocation(node.sourceLocation, candidates, {
        maxDistance: Math.max(getSourceLocationMatchDistance(node), 96),
      });
      const runtimeProjectionIds = matchedRuntimeNodes.flatMap((runtimeNode) => runtimeNode.runtimeProjectionIds);
      if (runtimeProjectionIds.length) {
        bindings.set(node.id, {
          sourceNodeId: node.id,
          bindingKey: existingBinding?.bindingKey ?? node.bindingKey ?? null,
          runtimeProjectionIds,
          status: "stale",
          resolutionPath: "runtime-element-preview-fallback",
        });
      }
    }
    for (const child of node.children ?? []) visit(child);
  };

  for (const node of sourceRootNodes) visit(node);
  return bindings;
}

function applyDomAssistedBindings(
  sourceRootNodes: SourceNode[],
  existingBindings: Map<string, ResolvedSourceRuntimeBinding>,
  runtimeElementsByProjectionId: Map<string, Element>
): DomAssistedBindingResult {
  const bindings = new Map(existingBindings);
  const syntheticElementsByProjectionId = new Map<string, Element>();

  const getBoundElement = (nodeId: string): Element | null => {
    const binding = bindings.get(nodeId);
    const projectionId = binding?.runtimeProjectionIds[0];
    if (!projectionId) return null;
    return syntheticElementsByProjectionId.get(projectionId) ?? runtimeElementsByProjectionId.get(projectionId) ?? null;
  };

  const visit = (node: SourceNode) => {
    const parentElement = getBoundElement(node.id);
    if (parentElement) {
      const domChildren = [...parentElement.children];
      const unresolvedHostChildren = (node.children ?? []).filter((child) => {
        const binding = bindings.get(child.id);
        return (
          !isCanonicalSourceNodeId(child.id) &&
          !isCanonicalSourceNodeId(child.bindingKey) &&
          (!binding || !binding.runtimeProjectionIds.length) &&
          isHostLikeComponentName(child.componentName)
        );
      });
      let domCursor = 0;
      for (const childNode of unresolvedHostChildren) {
        let matchedElement: Element | null = null;
        for (let index = domCursor; index < domChildren.length; index += 1) {
          const candidate = domChildren[index];
          if (!elementMatchesSourceNode(candidate, childNode)) continue;
          matchedElement = candidate;
          domCursor = index + 1;
          break;
        }
        if (!matchedElement) continue;
        const syntheticProjectionId = `domassist:${childNode.id}`;
        syntheticElementsByProjectionId.set(syntheticProjectionId, matchedElement);
        bindings.set(childNode.id, {
          sourceNodeId: childNode.id,
          bindingKey: childNode.bindingKey ?? null,
          runtimeProjectionIds: [syntheticProjectionId],
          status: "stale",
          resolutionPath: "dom-child-order-fallback",
        });
      }
    }

    for (const child of node.children ?? []) visit(child);
  };

  for (const node of sourceRootNodes) visit(node);

  return {
    bindings,
    elementsByProjectionId: syntheticElementsByProjectionId,
  };
}

function buildSourceRuntimeBindings(
  sourceRootNodes: SourceNode[],
  runtimeIndex: RuntimeSourceNodeIndex,
  domIdGraph: DomIdGraph
): Map<string, ResolvedSourceRuntimeBinding> {
  const bindings = new Map<string, ResolvedSourceRuntimeBinding>();
  const visit = (node: SourceNode) => {
    const domProjectionIds = [...(domIdGraph.elementsBySourceNodeId.get(node.id) ?? [])].map(
      (_element, index) => `wbdom:${node.id}:${index}`
    );
    const matchedRuntimeNodes =
      !domProjectionIds.length && node.bindingKey
        ? runtimeIndex.nodesByBindingKeyAndCategory.get(getCategoryScopedKey(node.bindingKey, node.category)) ?? []
        : [];
    const runtimeProjectionIds = domProjectionIds.length
      ? domProjectionIds
      : matchedRuntimeNodes.flatMap((runtimeNode) => runtimeNode.runtimeProjectionIds);
    bindings.set(node.id, {
      sourceNodeId: node.id,
      bindingKey: node.bindingKey ?? null,
      runtimeProjectionIds,
      status: getBindingStatus(runtimeProjectionIds),
      resolutionPath: domProjectionIds.length ? "data-wb-id" : matchedRuntimeNodes.length ? "canonical-binding" : "unresolved",
    });
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of sourceRootNodes) visit(node);
  return bindings;
}

function buildSourceRuntimeFallbackBindings(
  sourceRootNodes: SourceNode[],
  runtimeIndex: RuntimeSourceNodeIndex,
  canonicalBindings: Map<string, ResolvedSourceRuntimeBinding>
): Map<string, ResolvedSourceRuntimeBinding> {
  const bindings = new Map<string, ResolvedSourceRuntimeBinding>();
  const visit = (node: SourceNode) => {
    const canonicalBinding = canonicalBindings.get(node.id);
    if (canonicalBinding?.runtimeProjectionIds.length) {
      bindings.set(node.id, canonicalBinding);
    } else {
      const isCanonicalNode = isCanonicalSourceNodeId(node.id) || isCanonicalSourceNodeId(node.bindingKey);
      const nodePreviewText = getNodeExpectedPreviewText(node);
      const requiresExactHostPreviewMatch = Boolean(nodePreviewText && isHostLikeComponentName(node.componentName));
      const ownerComponentKey = getOwnerPathBindingKey(node.ownerPath ?? node.path, node.componentName) ?? "";
      const ownerMatchedRuntimeNodes =
        requiresExactHostPreviewMatch || isCanonicalNode
          ? []
          : runtimeIndex.nodesByOwnerComponentKeyAndCategory.get(getCategoryScopedKey(ownerComponentKey, node.category)) ?? [];
      const previewMatchedRuntimeNodes =
        !isCanonicalNode && !ownerMatchedRuntimeNodes.length && nodePreviewText
          ? chooseClosestRuntimeNodesBySourceLocation(
              node.sourceLocation,
              runtimeIndex.nodesBySourcePathComponentAndPreviewAndCategory.get(
                getCategoryScopedKey(
                  getSourcePathComponentAndPreviewKey(node.sourcePath, node.componentName, nodePreviewText) ?? "",
                  node.category
                )
              ) ?? [],
              { maxDistance: Math.max(getSourceLocationMatchDistance(node), 64) }
            )
          : [];
      const sourceMatchedRuntimeNodes =
        !isCanonicalNode &&
        !requiresExactHostPreviewMatch &&
        !ownerMatchedRuntimeNodes.length &&
        !previewMatchedRuntimeNodes.length
          ? chooseClosestRuntimeNodesBySourceLocation(
              node.sourceLocation,
              runtimeIndex.nodesBySourcePathAndComponentAndCategory.get(
                getCategoryScopedKey(getSourcePathAndComponentKey(node.sourcePath, node.componentName) ?? "", node.category)
              ) ?? [],
              { maxDistance: getSourceLocationMatchDistance(node) }
            )
          : [];
      const componentMatchedRuntimeNodes =
        !isCanonicalNode &&
        !requiresExactHostPreviewMatch &&
        !ownerMatchedRuntimeNodes.length &&
        !sourceMatchedRuntimeNodes.length &&
        node.componentName &&
        /^[A-Z]/.test(node.componentName)
          ? runtimeIndex.nodesByComponentNameAndCategory.get(getCategoryScopedKey(node.componentName, node.category)) ?? []
          : [];
      const matchedRuntimeNodes = ownerMatchedRuntimeNodes.length
        ? ownerMatchedRuntimeNodes
        : previewMatchedRuntimeNodes.length
          ? previewMatchedRuntimeNodes
        : sourceMatchedRuntimeNodes.length
          ? sourceMatchedRuntimeNodes
          : componentMatchedRuntimeNodes;
      const runtimeProjectionIds = matchedRuntimeNodes.flatMap((runtimeNode) => runtimeNode.runtimeProjectionIds);
      bindings.set(node.id, {
        sourceNodeId: node.id,
        bindingKey: canonicalBinding?.bindingKey ?? node.bindingKey ?? null,
        runtimeProjectionIds,
        status: runtimeProjectionIds.length ? "stale" : "unresolved",
        resolutionPath: ownerMatchedRuntimeNodes.length
          ? "owner-path-fallback"
          : previewMatchedRuntimeNodes.length
            ? "source-path-preview-fallback"
          : sourceMatchedRuntimeNodes.length
            ? "source-path-location-fallback"
            : componentMatchedRuntimeNodes.length
              ? "component-name-fallback"
              : "unresolved",
      });
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of sourceRootNodes) visit(node);
  return bindings;
}

function applyDescendantProjectionBindings(
  sourceRootNodes: SourceNode[],
  existingBindings: Map<string, ResolvedSourceRuntimeBinding>
): Map<string, ResolvedSourceRuntimeBinding> {
  const bindings = new Map(existingBindings);

  const visit = (node: SourceNode): string[] => {
    const ownBinding = bindings.get(node.id);
    const ownProjectionIds = ownBinding?.runtimeProjectionIds ?? [];
    const descendantProjectionIds = new Set<string>();

    for (const child of node.children ?? []) {
      for (const projectionId of visit(child)) {
        descendantProjectionIds.add(projectionId);
      }
    }

    if (ownProjectionIds.length) {
      for (const projectionId of ownProjectionIds) descendantProjectionIds.add(projectionId);
      return [...descendantProjectionIds];
    }

    if (!isHostLikeComponentName(node.componentName) && descendantProjectionIds.size) {
      bindings.set(node.id, {
        sourceNodeId: node.id,
        bindingKey: ownBinding?.bindingKey ?? node.bindingKey ?? null,
        runtimeProjectionIds: [...descendantProjectionIds],
        status: descendantProjectionIds.size > 1 ? "multiple" : "stale",
        resolutionPath: "descendant-projections",
      });
    }

    return [...descendantProjectionIds];
  };

  for (const node of sourceRootNodes) visit(node);
  return bindings;
}

function bindSourceNodes(
  nodes: SourceNode[],
  bindings: Map<string, ResolvedSourceRuntimeBinding>,
  runtimeNodesByProjectionId: Map<string, SourceNode>
): SourceNode[] {
  return nodes.map((node) => {
    const binding = bindings.get(node.id);
    const primaryRuntimeNode =
      binding?.runtimeProjectionIds.length
        ? runtimeNodesByProjectionId.get(binding.runtimeProjectionIds[0]) ?? null
        : null;
    const boundRuntimeChildren =
      node.category === "repeated-projection-group" &&
      (node.children?.length ?? 0) === 0 &&
      primaryRuntimeNode?.children?.length
        ? primaryRuntimeNode.children
        : node.children ?? [];
    return {
      ...node,
      ownerPath: node.ownerPath ?? primaryRuntimeNode?.ownerPath ?? node.path,
      semanticTargetId: node.semanticTargetId ?? primaryRuntimeNode?.semanticTargetId ?? null,
      runtimeProjectionIds: binding?.runtimeProjectionIds ?? [],
      children: bindSourceNodes(boundRuntimeChildren, bindings, runtimeNodesByProjectionId),
      meta: {
        ...(node.meta ?? {}),
        bindingStatus: binding?.status ?? "unresolved",
        runtimeProjectionCount: binding?.runtimeProjectionIds.length ?? 0,
        bindingResolutionPath: binding?.resolutionPath ?? "unresolved",
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
  const [sourceBackedDraftChanges, setSourceBackedDraftChanges] = React.useState<SourceBackedDraftChange[]>(() =>
    readStoredSourceBackedDraftChanges()
  );
  const [sourceBackedApplyResult, setSourceBackedApplyResult] = React.useState<SourceBackedApplyResult | null>(null);
  const [refreshToken, setRefreshToken] = React.useState(0);
  const [runtimeScanVersion, setRuntimeScanVersion] = React.useState(1);
  const [debugEvents, setDebugEvents] = React.useState<string[]>([]);
  const lastDebugSelectionRef = React.useRef<string>("");
  const selectedLocatorRef = React.useRef<StableNodeLocator | null>(null);
  const hoveredLocatorRef = React.useRef<StableNodeLocator | null>(null);

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
          panelSize: state.panelSize,
          treePaneWidth: state.treePaneWidth,
          pickMode: state.pickMode,
          hierarchy: state.hierarchy,
        })
      );
    } catch {
      // ignore storage write errors
    }
  }, [state.hierarchy, state.panelOpen, state.panelPosition, state.panelSize, state.pickMode, state.treePaneWidth]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(INSPECTOR_DRAFT_STORAGE_KEY, JSON.stringify(draftChanges));
    } catch {
      // ignore storage write errors
    }
  }, [draftChanges]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        INSPECTOR_SOURCE_BACKED_DRAFT_STORAGE_KEY,
        JSON.stringify(sourceBackedDraftChanges)
      );
    } catch {
      // ignore storage write errors
    }
  }, [sourceBackedDraftChanges]);

  const scanResult = React.useMemo(
    () => {
      if (!state.enabled) {
        return {
          sourceRootNodes: [] as SourceNode[],
          rootNodes: [] as InspectorNode[],
          meaningfulRootNodes: [] as InspectorNode[],
          allRootNodes: [] as InspectorNode[],
          nodesById: new Map<string, InspectorNode>(),
          elementsById: new Map<string, Element>(),
          elementsByNodeId: new Map<string, Element[]>(),
          elementsByProjectionId: new Map<string, Element>(),
          sourceNodeIdsByElement: new Map<Element, string[]>(),
          sourceNodeIdByRuntimeProjectionId: new Map<string, string>(),
          graphMode: "disabled" as const,
          runtimeIndex: {
            nodesById: new Map<string, SourceNode>(),
            nodesByBindingKey: new Map<string, SourceNode[]>(),
            nodesByBindingKeyAndCategory: new Map<string, SourceNode[]>(),
            nodesByProjectionId: new Map<string, SourceNode>(),
            nodesByOwnerComponentKey: new Map<string, SourceNode[]>(),
            nodesByOwnerComponentKeyAndCategory: new Map<string, SourceNode[]>(),
            nodesByComponentName: new Map<string, SourceNode[]>(),
            nodesBySourcePathAndComponent: new Map<string, SourceNode[]>(),
            nodesByComponentNameAndCategory: new Map<string, SourceNode[]>(),
            nodesBySourcePathAndComponentAndCategory: new Map<string, SourceNode[]>(),
            nodesBySourcePathComponentAndPreview: new Map<string, SourceNode[]>(),
            nodesBySourcePathComponentAndPreviewAndCategory: new Map<string, SourceNode[]>(),
          } satisfies RuntimeSourceNodeIndex,
        };
      }

      const registrations = getInspectorRuntimeRegistrations();
      const snapshot = adapter.getSourceGraphSnapshot?.() ?? null;
      const snapshotRootNodes = snapshot?.rootNodes?.length ? snapshot.rootNodes : null;
      const shouldRunRuntimeScan = state.enabled;

      if (snapshotRootNodes && !shouldRunRuntimeScan) {
        const runtimeProjectionsById = new Map<string, InspectorRuntimeProjection>();
        const meaningfulRootNodes = mapSourceGraphToInspectorTree(snapshotRootNodes, runtimeProjectionsById);
        const nodesById = new Map<string, InspectorNode>();
        const visit = (node: InspectorNode) => {
          nodesById.set(node.id, node);
          for (const child of node.children ?? []) visit(child);
        };
        for (const node of meaningfulRootNodes) visit(node);

        return {
          sourceRootNodes: snapshotRootNodes,
          rootNodes: meaningfulRootNodes,
          meaningfulRootNodes,
          allRootNodes: meaningfulRootNodes,
          nodesById,
          elementsById: new Map<string, Element>(),
          elementsByNodeId: new Map<string, Element[]>(),
          elementsByProjectionId: new Map<string, Element>(),
          sourceNodeIdsByElement: new Map<Element, string[]>(),
          sourceNodeIdByRuntimeProjectionId: new Map<string, string>(),
          graphMode: "disabled" as const,
          runtimeIndex: {
            nodesById: new Map<string, SourceNode>(),
            nodesByBindingKey: new Map<string, SourceNode[]>(),
            nodesByBindingKeyAndCategory: new Map<string, SourceNode[]>(),
            nodesByProjectionId: new Map<string, SourceNode>(),
            nodesByOwnerComponentKey: new Map<string, SourceNode[]>(),
            nodesByOwnerComponentKeyAndCategory: new Map<string, SourceNode[]>(),
            nodesByComponentName: new Map<string, SourceNode[]>(),
            nodesBySourcePathAndComponent: new Map<string, SourceNode[]>(),
            nodesByComponentNameAndCategory: new Map<string, SourceNode[]>(),
            nodesBySourcePathAndComponentAndCategory: new Map<string, SourceNode[]>(),
            nodesBySourcePathComponentAndPreview: new Map<string, SourceNode[]>(),
            nodesBySourcePathComponentAndPreviewAndCategory: new Map<string, SourceNode[]>(),
          } satisfies RuntimeSourceNodeIndex,
        };
      }

      const hostRootElement = adapter.getHostRootElement?.() ?? null;
      const domIdGraph = buildDomIdGraph(hostRootElement);
      const autoSourceGraph = buildFiberSourceGraph(hostRootElement, registrations);
      const registrationSourceGraph = buildInspectorSourceGraph(registrations);
      if (autoSourceGraph?.debug.aborted) {
        console.warn("[workbench-inspector] fiber scan reached safety budget; using partial graph", {
          visited: autoSourceGraph.debug.visited,
          durationMs: autoSourceGraph.debug.durationMs,
          rootNodes: autoSourceGraph.rootNodes.length,
        });
      } else if (!autoSourceGraph && shouldRunRuntimeScan) {
        console.warn("[workbench-inspector] fiber scan unavailable; falling back to registrations graph", {
          registrations: registrations.length,
        });
      }
      const fallbackSourceGraph = autoSourceGraph
        ? mergeSourceGraphArtifacts([autoSourceGraph, registrationSourceGraph])
        : registrationSourceGraph;
      const graphMode = autoSourceGraph ? ("fiber" as const) : ("registrations" as const);
      for (const [projectionId, projection] of domIdGraph.runtimeProjectionsById) {
        fallbackSourceGraph.runtimeProjectionsById.set(projectionId, projection);
      }
      for (const [projectionId, element] of domIdGraph.elementsByProjectionId) {
        fallbackSourceGraph.elementsByProjectionId.set(projectionId, element);
      }
      const runtimeIndex = indexRuntimeSourceNodes(fallbackSourceGraph.rootNodes);
      const canonicalSourceBindings = snapshotRootNodes
        ? buildSourceRuntimeBindings(snapshotRootNodes, runtimeIndex, domIdGraph)
        : new Map<string, ResolvedSourceRuntimeBinding>();
      const fallbackSourceBindings = snapshotRootNodes
        ? buildSourceRuntimeFallbackBindings(snapshotRootNodes, runtimeIndex, canonicalSourceBindings)
        : canonicalSourceBindings;
      const descendantProjectionBindings = snapshotRootNodes
        ? applyDescendantProjectionBindings(snapshotRootNodes, fallbackSourceBindings)
        : fallbackSourceBindings;
      const sourceBindings = snapshotRootNodes
        ? applyRuntimeElementPreviewBindings(
            snapshotRootNodes,
            descendantProjectionBindings,
            runtimeIndex.nodesById,
            fallbackSourceGraph.elementsByProjectionId
          )
        : descendantProjectionBindings;
      const domAssistedBindings = snapshotRootNodes
        ? applyDomAssistedBindings(snapshotRootNodes, sourceBindings, fallbackSourceGraph.elementsByProjectionId)
        : { bindings: sourceBindings, elementsByProjectionId: new Map<string, Element>() };
      const boundProjectionIds = snapshotRootNodes ? collectBoundProjectionIds(domAssistedBindings.bindings) : new Set<string>();
      const sourceRootNodes = snapshotRootNodes
        ? bindSourceNodes(snapshotRootNodes, domAssistedBindings.bindings, runtimeIndex.nodesByProjectionId)
        : fallbackSourceGraph.rootNodes;
      if (snapshotRootNodes && shouldRunRuntimeScan) {
        let bound = 0;
        let stale = 0;
        let unresolved = 0;
        const resolutionPathCounts = new Map<string, number>();
        const unresolvedSamples: Array<{ id: string; label: string; path: string }> = [];
        const visit = (nodes: SourceNode[]) => {
          for (const node of nodes) {
            const status = String(node.meta?.bindingStatus ?? "unresolved");
            const resolutionPath = String(node.meta?.bindingResolutionPath ?? "unresolved");
            resolutionPathCounts.set(resolutionPath, (resolutionPathCounts.get(resolutionPath) ?? 0) + 1);
            if (status === "bound") bound += 1;
            else if (status === "stale") stale += 1;
            else unresolved += 1;
            if (status === "unresolved" && unresolvedSamples.length < 12) {
              unresolvedSamples.push({
                id: node.id,
                label: node.label,
                path: node.path,
              });
            }
            if (node.children?.length) visit(node.children);
          }
        };
        visit(sourceRootNodes);
        console.info("[workbench-inspector] binding summary after refresh", {
          graphMode,
          runtimeNodeCount: runtimeIndex.nodesById.size,
          bound,
          stale,
          unresolved,
          resolutionPaths: Object.fromEntries([...resolutionPathCounts.entries()].sort((left, right) => right[1] - left[1])),
          unresolvedSamples,
        });

        const probeLabels = new Set(['button "Задачи"', 'button "-"', 'button "+"', 'button "Сегодня"']);
        const flattenedSourceNodes: SourceNode[] = [];
        const collectSourceNodes = (nodes: SourceNode[]) => {
          for (const node of nodes) {
            flattenedSourceNodes.push(node);
            if (node.children?.length) collectSourceNodes(node.children);
          }
        };
        collectSourceNodes(sourceRootNodes);

        const runtimeSamples = [...runtimeIndex.nodesById.values()]
          .filter((node) => node.sourcePath?.includes("TimelinePage.tsx"))
          .slice(0, 24)
          .map((node) => ({
            id: node.id,
            label: node.label,
            componentName: node.componentName,
            ownerPath: node.ownerPath,
            sourceLocation: node.sourceLocation,
            bindingKey: node.bindingKey,
            projections: node.runtimeProjectionIds.length,
          }));
        console.info("[workbench-inspector] runtime sample after refresh", runtimeSamples);

        for (const node of flattenedSourceNodes) {
          if (!probeLabels.has(node.label)) continue;
          const bindingKey = node.bindingKey ?? null;
          const componentName = node.componentName ?? null;
          const ownerComponentKey = `${node.ownerPath ?? node.path}::${node.componentName ?? ""}`;
          const sourcePathComponentKey = getSourcePathAndComponentKey(node.sourcePath, componentName);
          const canonicalMatches = bindingKey
            ? (runtimeIndex.nodesByBindingKey.get(bindingKey) ?? []).map((item) => item.id)
            : [];
          const ownerMatches = ownerComponentKey
            ? (runtimeIndex.nodesByOwnerComponentKey.get(ownerComponentKey) ?? []).map((item) => item.id)
            : [];
          const sourcePathMatches = sourcePathComponentKey
            ? chooseClosestRuntimeNodesBySourceLocation(
                node.sourceLocation,
                runtimeIndex.nodesBySourcePathAndComponent.get(sourcePathComponentKey) ?? [],
                { maxDistance: getSourceLocationMatchDistance(node) }
              ).map((item) => item.id)
            : [];
          const componentMatches = componentName
            ? (runtimeIndex.nodesByComponentName.get(componentName) ?? []).map((item) => item.id)
            : [];
          console.info("[workbench-inspector] binding probe after refresh", {
            label: node.label,
            path: node.path,
            bindingKey,
            ownerComponentKey,
            sourcePathComponentKey,
            canonicalMatches,
            ownerMatches,
            sourcePathMatches,
            componentMatches: componentMatches.slice(0, 24),
          });
        }
      }
      const elementsById = new Map<string, Element>();
      const elementsByNodeId = new Map<string, Element[]>();
      const elementsByProjectionId = new Map<string, Element>();
      const sourceNodeIdByRuntimeProjectionId = new Map<string, string>();

      if (snapshotRootNodes) {
        for (const [sourceNodeId, binding] of domAssistedBindings.bindings) {
          const nodeElements: Element[] = [];
          for (const runtimeProjectionId of binding.runtimeProjectionIds) {
            sourceNodeIdByRuntimeProjectionId.set(runtimeProjectionId, sourceNodeId);
            const element =
              domIdGraph.elementsByProjectionId.get(runtimeProjectionId) ??
              domAssistedBindings.elementsByProjectionId.get(runtimeProjectionId) ??
              fallbackSourceGraph.elementsByProjectionId.get(runtimeProjectionId) ??
              null;
            if (element) {
              elementsByProjectionId.set(runtimeProjectionId, element);
            }
            if (element && !nodeElements.includes(element)) {
              nodeElements.push(element);
            }
          }
          if (nodeElements.length) {
            elementsByNodeId.set(sourceNodeId, nodeElements);
            elementsById.set(sourceNodeId, nodeElements[0]);
          }
          const firstProjectionId = binding.runtimeProjectionIds[0];
          if (!firstProjectionId) continue;
          const element =
            domIdGraph.elementsByProjectionId.get(firstProjectionId) ??
            domAssistedBindings.elementsByProjectionId.get(firstProjectionId) ??
            fallbackSourceGraph.elementsByProjectionId.get(firstProjectionId) ??
            null;
          if (element) {
            elementsById.set(sourceNodeId, element);
          }
        }

        for (const [projectionId, runtimeNode] of runtimeIndex.nodesByProjectionId) {
          const element = fallbackSourceGraph.elementsByProjectionId.get(projectionId) ?? null;
          if (!element) continue;
          elementsByProjectionId.set(projectionId, element);
          const runtimeNodeElements = elementsByNodeId.get(runtimeNode.id) ?? [];
          if (!runtimeNodeElements.includes(element)) {
            runtimeNodeElements.push(element);
            elementsByNodeId.set(runtimeNode.id, runtimeNodeElements);
          }
          if (!elementsById.has(runtimeNode.id)) {
            elementsById.set(runtimeNode.id, element);
          }
          if (!sourceNodeIdByRuntimeProjectionId.has(projectionId)) {
            sourceNodeIdByRuntimeProjectionId.set(projectionId, runtimeNode.id);
          }
        }
      } else {
        for (const [sourceNodeId, elements] of domIdGraph.elementsBySourceNodeId) {
          if (!elements.length) continue;
          elementsByNodeId.set(sourceNodeId, [...elements]);
          elementsById.set(sourceNodeId, elements[0]);
        }
        for (const [sourceNodeId, element] of fallbackSourceGraph.elementsBySourceNodeId) {
          if (!elementsById.has(sourceNodeId)) {
            elementsById.set(sourceNodeId, element);
          }
          if (!elementsByNodeId.has(sourceNodeId)) {
            elementsByNodeId.set(sourceNodeId, [element]);
          }
        }
        for (const [projectionId, sourceNodeId] of domIdGraph.sourceNodeIdByProjectionId) {
          sourceNodeIdByRuntimeProjectionId.set(projectionId, sourceNodeId);
        }
        for (const [projectionId, element] of domIdGraph.elementsByProjectionId) {
          elementsByProjectionId.set(projectionId, element);
        }
        for (const [projectionId, runtimeNode] of runtimeIndex.nodesByProjectionId) {
          sourceNodeIdByRuntimeProjectionId.set(projectionId, runtimeNode.id);
          const element = fallbackSourceGraph.elementsByProjectionId.get(projectionId) ?? null;
          if (!element) continue;
          elementsByProjectionId.set(projectionId, element);
          const nodeElements = elementsByNodeId.get(runtimeNode.id) ?? [];
          if (!nodeElements.includes(element)) {
            nodeElements.push(element);
            elementsByNodeId.set(runtimeNode.id, nodeElements);
            if (!elementsById.has(runtimeNode.id)) {
              elementsById.set(runtimeNode.id, element);
            }
          }
        }
      }
      const sourceGraph = {
        ...fallbackSourceGraph,
        rootNodes: sourceRootNodes,
      };
      const coveredSourcePaths = snapshotRootNodes ? collectSourcePathsFromTree(sourceRootNodes) : new Set<string>();
      const coveredSourceNodeIds = snapshotRootNodes ? collectSourceNodeIdsFromTree(sourceRootNodes) : new Set<string>();
      const runtimeMeaningfulSupplements =
        snapshotRootNodes
          ? filterMeaningfulSourceNodes(
              collectRuntimeSupplementNodes(
                fallbackSourceGraph.rootNodes,
                boundProjectionIds,
                coveredSourcePaths,
                coveredSourceNodeIds,
                "meaningful"
              )
            )
          : [];
      const runtimeAllSupplements =
        snapshotRootNodes
          ? collectRuntimeSupplementNodes(
              fallbackSourceGraph.rootNodes,
              boundProjectionIds,
              coveredSourcePaths,
              coveredSourceNodeIds,
              "all"
            )
          : [];
      const meaningfulSourceRootNodes = filterMeaningfulSourceNodes(sourceGraph.rootNodes);
      const meaningfulRootNodes = mapSourceGraphToInspectorTree(
        [...meaningfulSourceRootNodes, ...runtimeMeaningfulSupplements],
        sourceGraph.runtimeProjectionsById
      );
      const allRootNodes = mapSourceGraphToInspectorTree(
        snapshotRootNodes ? [...sourceGraph.rootNodes, ...runtimeAllSupplements] : fallbackSourceGraph.rootNodes,
        snapshotRootNodes ? sourceGraph.runtimeProjectionsById : fallbackSourceGraph.runtimeProjectionsById
      );
      const duplicateNodeIds = collectDuplicateInspectorNodeIds(allRootNodes);
      if (duplicateNodeIds.length) {
        console.warn("[workbench-inspector] duplicate inspector node ids detected", duplicateNodeIds);
      }
      const nodesById = new Map<string, InspectorNode>();
      const sourceNodeIdsByElement = new Map<Element, string[]>();
      const visit = (node: InspectorNode) => {
        nodesById.set(node.id, node);
        for (const child of node.children ?? []) visit(child);
      };
      for (const node of meaningfulRootNodes) visit(node);
      for (const node of allRootNodes) visit(node);
      for (const [sourceNodeId, elements] of elementsByNodeId) {
        for (const element of elements) {
          const bucket = sourceNodeIdsByElement.get(element) ?? [];
          bucket.push(sourceNodeId);
          sourceNodeIdsByElement.set(element, bucket);
        }
      }

      return {
        sourceRootNodes: sourceRootNodes,
        rootNodes: meaningfulRootNodes,
        meaningfulRootNodes,
        allRootNodes,
        nodesById,
        elementsById,
        elementsByNodeId,
        elementsByProjectionId,
        sourceNodeIdsByElement,
        sourceNodeIdByRuntimeProjectionId,
        graphMode,
        runtimeIndex,
      };
    },
    [adapter, refreshToken, runtimeScanVersion, state.enabled]
  );

  const hasAnyResolvedRuntimeBinding = React.useMemo(() => {
    let found = false;
    const visit = (nodes: SourceNode[]) => {
      for (const node of nodes) {
        const status = String(node.meta?.bindingStatus ?? "unresolved");
        if (status === "bound" || status === "stale" || status === "multiple") {
          found = true;
          return;
        }
        if (node.children?.length) visit(node.children);
        if (found) return;
      }
    };
    visit(scanResult.sourceRootNodes);
    return found;
  }, [scanResult.sourceRootNodes]);

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
    setSourceBackedDraftChanges((prev) =>
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
    adapter.previewSourceBackedDrafts?.(sourceBackedDraftChanges);
    return () => {
      adapter.clearSourceBackedDraftPreview?.();
    };
  }, [adapter, sourceBackedDraftChanges]);

  React.useEffect(() => {
    if (!state.debug) return;
    const nextLine = `selection=${state.selectedNodeId ?? "none"} hovered=${state.hoveredNodeId ?? "none"} rootCount=${scanResult.rootNodes.length}`;
    if (lastDebugSelectionRef.current === nextLine) return;
    lastDebugSelectionRef.current = nextLine;
    pushDebugEvent(nextLine);
  }, [pushDebugEvent, scanResult.rootNodes.length, state.debug, state.hoveredNodeId, state.selectedNodeId]);

  React.useEffect(() => {
    selectedLocatorRef.current = createStableNodeLocator(
      state.selectedNodeId ? scanResult.nodesById.get(state.selectedNodeId) ?? null : null
    );
    hoveredLocatorRef.current = createStableNodeLocator(
      state.hoveredNodeId ? scanResult.nodesById.get(state.hoveredNodeId) ?? null : null
    );
  }, [scanResult.nodesById, state.hoveredNodeId, state.selectedNodeId]);

  React.useEffect(() => {
    setState((prev) => {
      let changed = false;
      let nextSelectedNodeId = prev.selectedNodeId;
      let nextHoveredNodeId = prev.hoveredNodeId;

      if (prev.selectedNodeId && !scanResult.nodesById.has(prev.selectedNodeId)) {
        nextSelectedNodeId = resolveStableNodeId(
          selectedLocatorRef.current,
          scanResult.nodesById,
          scanResult.sourceNodeIdByRuntimeProjectionId
        );
        changed = nextSelectedNodeId !== prev.selectedNodeId;
      }

      if (prev.hoveredNodeId && !scanResult.nodesById.has(prev.hoveredNodeId)) {
        nextHoveredNodeId = resolveStableNodeId(
          hoveredLocatorRef.current,
          scanResult.nodesById,
          scanResult.sourceNodeIdByRuntimeProjectionId
        );
        changed = changed || nextHoveredNodeId !== prev.hoveredNodeId;
      }

      if (!changed) return prev;
      return {
        ...prev,
        selectedNodeId: nextSelectedNodeId ?? null,
        hoveredNodeId: nextHoveredNodeId ?? null,
      };
    });
  }, [scanResult.nodesById, scanResult.sourceNodeIdByRuntimeProjectionId]);

  React.useEffect(() => {
    if (!state.enabled || !state.hierarchy.autoRefreshTree || state.pickMode === "on") return;
    const rootElement = adapter.getHostRootElement?.() ?? null;
    if (!rootElement || typeof MutationObserver === "undefined") return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let scheduled = false;
    const queueRefresh = () => {
      if (scheduled) return;
      scheduled = true;
      timeoutId = setTimeout(() => {
        scheduled = false;
        setRuntimeScanVersion((version) => version + 1);
        setRefreshToken((token) => token + 1);
      }, 250);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          queueRefresh();
          return;
        }
      }
    });

    observer.observe(rootElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [adapter, state.enabled, state.hierarchy.autoRefreshTree, state.pickMode]);

  React.useEffect(() => {
    if (!state.enabled || hasAnyResolvedRuntimeBinding) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let bootstrappingActive = true;
    let scheduled = false;

    const queueBootstrapRefresh = () => {
      if (!bootstrappingActive || scheduled) return;
      scheduled = true;
      timeoutId = setTimeout(() => {
        scheduled = false;
        setRuntimeScanVersion((version) => version + 1);
        setRefreshToken((token) => token + 1);
      }, 120);
    };

    const unsubscribe = subscribeInspectorRuntime(() => {
      queueBootstrapRefresh();
    });

    const bootstrapTimers = [0, 180, 600, 1400].map((delay) =>
      setTimeout(() => {
        queueBootstrapRefresh();
      }, delay)
    );

    const stopTimer = setTimeout(() => {
      bootstrappingActive = false;
      unsubscribe();
    }, 4000);

    return () => {
      bootstrappingActive = false;
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(stopTimer);
      for (const timer of bootstrapTimers) clearTimeout(timer);
    };
  }, [hasAnyResolvedRuntimeBinding, state.enabled]);

  const value = React.useMemo<InspectorContextValue>(
    () => ({
      activation,
      adapter,
      draftChanges,
      sourceBackedDraftChanges,
      sourceBackedApplyResult,
      debugEvents,
      state,
      rootNodes: scanResult.rootNodes,
      meaningfulRootNodes: scanResult.meaningfulRootNodes,
      allRootNodes: scanResult.allRootNodes,
      sourceRootNodes: scanResult.sourceRootNodes,
      getNodeById: (nodeId) => (nodeId ? scanResult.nodesById.get(nodeId) ?? null : null),
      getNodeElement: (nodeId) => {
        const resolved = findElementForNode(nodeId, scanResult.nodesById, scanResult.elementsById).element;
        if (resolved) return resolved;
        if (!nodeId) return null;
        return (
          collectProjectionElementsForNode(
            nodeId,
            scanResult.nodesById,
            scanResult.elementsByProjectionId,
            scanResult.elementsByNodeId
          )[0] ?? null
        );
      },
      getNodeElements: (nodeId) => {
        if (!nodeId) return [];
        return collectProjectionElementsForNode(
          nodeId,
          scanResult.nodesById,
          scanResult.elementsByProjectionId,
          scanResult.elementsByNodeId
        );
      },
      getNodeDirectElements: (nodeId) => {
        if (!nodeId) return [];
        return [...(scanResult.elementsByNodeId.get(nodeId) ?? [])];
      },
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
        const sourcePathComponentKey = getSourcePathAndComponentKey(node?.sourcePath, componentName);
        const ownerComponentKey = node ? getOwnerPathBindingKey(node.ownerPath ?? node.path, node.componentName) : null;
        const canonicalMatches = bindingKey
          ? (scanResult.runtimeIndex.nodesByBindingKey.get(bindingKey) ?? []).map((item) => item.id)
          : [];
        const sourcePathMatches = sourcePathComponentKey
          ? chooseClosestRuntimeNodesBySourceLocation(
              node?.sourceLocation,
              scanResult.runtimeIndex.nodesBySourcePathAndComponent.get(sourcePathComponentKey) ?? [],
              node ? { maxDistance: getSourceLocationMatchDistance(node) } : undefined
            ).map((item) => item.id)
          : [];
        const ownerMatches = ownerComponentKey
          ? (scanResult.runtimeIndex.nodesByOwnerComponentKey.get(ownerComponentKey) ?? []).map((item) => item.id)
          : [];
        const componentMatches = componentName
          ? (scanResult.runtimeIndex.nodesByComponentName.get(componentName) ?? []).map((item) => item.id)
          : [];
        return {
          graphMode: scanResult.graphMode,
          resolutionPath: (node?.meta?.bindingResolutionPath as string | null | undefined) ?? null,
          bindingKey,
          canonicalMatches,
          sourcePathComponentKey,
          sourcePathMatches,
          ownerComponentKey,
          ownerMatches,
          componentName,
          componentMatches,
        };
      },
      getHighlightDebug: (nodeId) => {
        const node = nodeId ? scanResult.nodesById.get(nodeId) ?? null : null;
        const projectionIds = node?.projectionIds ?? [];
        const resolvedElements = nodeId ? (scanResult.elementsByNodeId.get(nodeId) ?? []) : [];
        const projectionElements: Element[] = [];
        const missingProjectionIds: string[] = [];
        for (const projectionId of projectionIds) {
          const element = scanResult.elementsByProjectionId.get(projectionId) ?? null;
          if (!element) {
            missingProjectionIds.push(projectionId);
            continue;
          }
          if (!projectionElements.includes(element)) {
            projectionElements.push(element);
          }
        }
        const renderableRectCount = projectionElements.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length;
        return {
          projectionCount: projectionIds.length,
          projectionElementCount: projectionElements.length,
          resolvedElementCount: resolvedElements.length,
          renderableRectCount,
          missingProjectionIds,
        };
      },
      refreshNodes: () => {
        setRuntimeScanVersion((version) => version + 1);
        setRefreshToken((token) => token + 1);
      },
      resolveNodeFromElement: (element) => {
        const domSourceNodeId = element?.closest?.("[data-wb-id]")?.getAttribute("data-wb-id")?.trim() ?? null;
        if (domSourceNodeId) {
          pushDebugEvent(
            `resolve element tag=${element?.tagName?.toLowerCase() ?? "none"} runtimeId=none sourceNodeId=${domSourceNodeId}`
          );
          return scanResult.nodesById.get(domSourceNodeId) ?? null;
        }
        const runtimeId = resolveInspectorNodeIdFromElement(element);
        const sourceNodeIdFromRuntimeProjection = runtimeId
          ? scanResult.sourceNodeIdByRuntimeProjectionId.get(runtimeId) ?? null
          : null;
        let sourceNodeId = sourceNodeIdFromRuntimeProjection;

        if (!sourceNodeId) {
          let current = element;
          while (current && !sourceNodeId) {
            const matchedSourceNodeIds = scanResult.sourceNodeIdsByElement.get(current) ?? [];
            if (matchedSourceNodeIds.length) {
              sourceNodeId = [...matchedSourceNodeIds].sort((left, right) => {
                const leftDepth = scanResult.nodesById.get(left)?.depth ?? 0;
                const rightDepth = scanResult.nodesById.get(right)?.depth ?? 0;
                return rightDepth - leftDepth;
              })[0] ?? null;
              break;
            }
            current = current.parentElement;
          }
        }

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
        if (nodeId) {
          const selectedNode = scanResult.nodesById.get(nodeId) ?? null;
          if (selectedNode) {
            const bindingKey = selectedNode.bindingKey ?? null;
            const componentName = selectedNode.componentName ?? null;
            const ownerComponentKey =
              getOwnerPathBindingKey(selectedNode.ownerPath ?? selectedNode.path, selectedNode.componentName) ?? "";
            const sourcePathComponentKey = getSourcePathAndComponentKey(selectedNode.sourcePath, componentName);
            const canonicalMatches = bindingKey
              ? (scanResult.runtimeIndex.nodesByBindingKey.get(bindingKey) ?? []).map((item) => item.id)
              : [];
            const ownerMatches = ownerComponentKey
              ? (scanResult.runtimeIndex.nodesByOwnerComponentKey.get(ownerComponentKey) ?? []).map((item) => item.id)
              : [];
            const sourcePathMatches = sourcePathComponentKey
              ? chooseClosestRuntimeNodesBySourceLocation(
                  selectedNode.sourceLocation,
                  scanResult.runtimeIndex.nodesBySourcePathAndComponent.get(sourcePathComponentKey) ?? [],
                  { maxDistance: getSourceLocationMatchDistance(selectedNode) }
                ).map((item) => item.id)
              : [];
            const componentMatches = componentName
              ? (scanResult.runtimeIndex.nodesByComponentName.get(componentName) ?? []).map((item) => item.id)
              : [];
            const projectionIds = selectedNode.projectionIds ?? [];
            const resolvedElements = scanResult.elementsByNodeId.get(nodeId) ?? [];
            console.debug("[workbench-inspector] selected node binding", {
              nodeId,
              label: selectedNode.label,
              graphMode: scanResult.graphMode,
              bindingStatus: selectedNode.meta?.bindingStatus ?? selectedNode.bindingStatus ?? "unresolved",
              resolutionPath: selectedNode.meta?.bindingResolutionPath ?? null,
              bindingKey,
              ownerComponentKey,
              sourcePathComponentKey,
              componentName,
              projectionIds,
              resolvedElementCount: resolvedElements.length,
              canonicalMatches,
              ownerMatches,
              sourcePathMatches,
              componentMatches,
            });
          }
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
      setPanelSize: (size) => {
        setState((prev) =>
          prev.panelSize.width === size.width && prev.panelSize.height === size.height
            ? prev
            : { ...prev, panelSize: size }
        );
      },
      setTreePaneWidth: (width) => {
        setState((prev) => (prev.treePaneWidth === width ? prev : { ...prev, treePaneWidth: width }));
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
      upsertSourceBackedDraftChange: (change) => {
        setSourceBackedApplyResult(null);
        setSourceBackedDraftChanges((prev) => {
          const id =
            change.id ??
            makeSourceBackedDraftChangeId(
              change.sourceNodeId,
              change.parameterId,
              change.targetScope,
              change.applyStrategy
            );
          const nextChange: SourceBackedDraftChange = {
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
      removeSourceBackedDraftChange: (draftChangeId) => {
        setSourceBackedApplyResult(null);
        setSourceBackedDraftChanges((prev) => prev.filter((entry) => entry.id !== draftChangeId));
      },
      discardSourceBackedDraftChanges: (sourceNodeId) => {
        setSourceBackedApplyResult(null);
        setSourceBackedDraftChanges((prev) =>
          sourceNodeId ? prev.filter((entry) => entry.sourceNodeId !== sourceNodeId) : []
        );
      },
      discardSourceBackedDraftIds: (draftIds) => {
        if (!draftIds.length) return;
        const draftIdSet = new Set(draftIds);
        setSourceBackedApplyResult(null);
        setSourceBackedDraftChanges((prev) => prev.filter((entry) => !draftIdSet.has(entry.id)));
      },
      applySourceBackedDraftChanges: async (draftIds) => {
        const draftsToApply =
          draftIds?.length ? sourceBackedDraftChanges.filter((entry) => draftIds.includes(entry.id)) : sourceBackedDraftChanges;
        const result =
          (await adapter.applySourceBackedDrafts?.(draftsToApply)) ??
          ({
            ok: false,
            patches: [],
            issues: [
              {
                draftId: "adapter",
                parameterId: "adapter",
                message: "Source-backed apply is not available in the current host.",
              },
            ],
          } satisfies SourceBackedApplyResult);
        setSourceBackedApplyResult(result);
        if (result.ok) {
          if (draftIds?.length) {
            const appliedIds = new Set(draftIds);
            setSourceBackedDraftChanges((prev) => prev.filter((entry) => !appliedIds.has(entry.id)));
          } else {
            setSourceBackedDraftChanges([]);
          }
        }
        return result;
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
      setHideInvisible: (hideInvisible) => {
        setState((prev) =>
          prev.hierarchy.hideInvisible === hideInvisible
            ? prev
            : { ...prev, hierarchy: { ...prev.hierarchy, hideInvisible } }
        );
      },
      setAutoRefreshTree: (autoRefreshTree) => {
        setState((prev) =>
          prev.hierarchy.autoRefreshTree === autoRefreshTree
            ? prev
            : { ...prev, hierarchy: { ...prev.hierarchy, autoRefreshTree } }
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
      sourceBackedApplyResult,
      sourceBackedDraftChanges,
      pushDebugEvent,
      scanResult.elementsById,
      scanResult.elementsByNodeId,
      scanResult.elementsByProjectionId,
      scanResult.allRootNodes,
      scanResult.meaningfulRootNodes,
      scanResult.nodesById,
      scanResult.rootNodes,
      scanResult.runtimeIndex,
      scanResult.sourceNodeIdsByElement,
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

export { toDisplaySourcePath };
