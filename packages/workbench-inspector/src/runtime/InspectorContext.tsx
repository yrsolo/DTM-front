import React from "react";

import type {
  DraftChange,
  DraftChangeScope,
  SourceNode,
  SourceNodeCategory,
  InspectorActivation,
  InspectorAdapter,
  InspectorFocusMode,
  InspectorNode,
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
import { buildInspectorSourceGraph, mapSourceGraphToInspectorTree } from "../source-graph/buildSourceGraph";
import { getInspectorRuntimeRegistrations, resolveInspectorNodeIdFromElement } from "./InspectorRuntimeRegistry";

type InspectorContextValue = {
  activation: InspectorActivation;
  adapter: InspectorAdapter;
  state: InspectorState;
  draftChanges: DraftChange[];
  debugEvents: string[];
  rootNodes: InspectorNode[];
  meaningfulRootNodes: InspectorNode[];
  allRootNodes: InspectorNode[];
  sourceRootNodes: SourceNode[];
  getNodeById: (nodeId: string | null | undefined) => InspectorNode | null;
  getNodeElement: (nodeId: string | null | undefined) => Element | null;
  getNodeElements: (nodeId: string | null | undefined) => Element[];
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

function getSourcePathAndComponentKey(sourcePath: string | null | undefined, componentName: string | null | undefined): string | null {
  if (!sourcePath || !componentName) return null;
  return `${sourcePath}::${componentName}`;
}

function getSourcePathComponentAndPreviewKey(
  sourcePath: string | null | undefined,
  componentName: string | null | undefined,
  previewText: string | null | undefined
): string | null {
  if (!sourcePath || !componentName || !previewText) return null;
  return `${sourcePath}::${componentName}::${previewText}`;
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

function collectBoundProjectionIds(bindings: Map<string, ResolvedSourceRuntimeBinding>): Set<string> {
  const projectionIds = new Set<string>();
  for (const binding of bindings.values()) {
    for (const projectionId of binding.runtimeProjectionIds ?? []) {
      projectionIds.add(projectionId);
    }
  }
  return projectionIds;
}

function collectRuntimeMeaningfulSupplementNodes(
  nodes: SourceNode[],
  boundProjectionIds: Set<string>
): SourceNode[] {
  const visit = (node: SourceNode, parentId: string | null, depth: number): SourceNode | null => {
    const filteredChildren = (node.children ?? [])
      .map((child) => visit(child, node.id, depth + 1))
      .filter((child): child is SourceNode => Boolean(child));
    const hasBoundProjection = (node.runtimeProjectionIds ?? []).some((projectionId) => boundProjectionIds.has(projectionId));
    const isLeafMeaningfulKind = node.kind === "control" || node.kind === "text" || node.kind === "image";
    const keepNode = !hasBoundProjection && (isLeafMeaningfulKind || filteredChildren.length > 0);
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

  return nodes
    .map((node) => visit(node, null, 0))
    .filter((node): node is SourceNode => Boolean(node));
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
    const ownerComponentKey = `${node.ownerPath ?? node.path}::${node.componentName ?? ""}`;
    const ownerBucket = nodesByOwnerComponentKey.get(ownerComponentKey) ?? [];
    ownerBucket.push(node);
    nodesByOwnerComponentKey.set(ownerComponentKey, ownerBucket);
    const ownerCategoryBucketKey = getCategoryScopedKey(ownerComponentKey, node.category);
    const ownerCategoryBucket = nodesByOwnerComponentKeyAndCategory.get(ownerCategoryBucketKey) ?? [];
    ownerCategoryBucket.push(node);
    nodesByOwnerComponentKeyAndCategory.set(ownerCategoryBucketKey, ownerCategoryBucket);
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
        return (!binding || !binding.runtimeProjectionIds.length) && isHostLikeComponentName(child.componentName);
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
  runtimeIndex: RuntimeSourceNodeIndex
): Map<string, ResolvedSourceRuntimeBinding> {
  const bindings = new Map<string, ResolvedSourceRuntimeBinding>();
  const visit = (node: SourceNode) => {
    const matchedRuntimeNodes = node.bindingKey
      ? runtimeIndex.nodesByBindingKeyAndCategory.get(getCategoryScopedKey(node.bindingKey, node.category)) ?? []
      : [];
    const runtimeProjectionIds = matchedRuntimeNodes.flatMap((runtimeNode) => runtimeNode.runtimeProjectionIds);
    bindings.set(node.id, {
      sourceNodeId: node.id,
      bindingKey: node.bindingKey ?? null,
      runtimeProjectionIds,
      status: getBindingStatus(runtimeProjectionIds),
      resolutionPath: matchedRuntimeNodes.length ? "canonical-binding" : "unresolved",
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
      const ownerComponentKey = `${node.ownerPath ?? node.path}::${node.componentName ?? ""}`;
      const ownerMatchedRuntimeNodes =
        runtimeIndex.nodesByOwnerComponentKeyAndCategory.get(getCategoryScopedKey(ownerComponentKey, node.category)) ?? [];
      const nodePreviewText = getNodeExpectedPreviewText(node);
      const previewMatchedRuntimeNodes =
        !ownerMatchedRuntimeNodes.length && nodePreviewText
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
        !ownerMatchedRuntimeNodes.length && !previewMatchedRuntimeNodes.length
          ? chooseClosestRuntimeNodesBySourceLocation(
              node.sourceLocation,
              runtimeIndex.nodesBySourcePathAndComponentAndCategory.get(
                getCategoryScopedKey(getSourcePathAndComponentKey(node.sourcePath, node.componentName) ?? "", node.category)
              ) ?? [],
              { maxDistance: getSourceLocationMatchDistance(node) }
            )
          : [];
      const componentMatchedRuntimeNodes =
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
  const [refreshToken, setRefreshToken] = React.useState(0);
  const [runtimeScanVersion, setRuntimeScanVersion] = React.useState(0);
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
      const shouldRunRuntimeScan = !snapshotRootNodes || runtimeScanVersion > 0;

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

      const autoSourceGraph = buildFiberSourceGraph(adapter.getHostRootElement?.() ?? null, registrations);
      if (autoSourceGraph?.debug.aborted) {
        console.warn("[workbench-inspector] fiber scan reached safety budget; using partial graph", {
          visited: autoSourceGraph.debug.visited,
          durationMs: autoSourceGraph.debug.durationMs,
          rootNodes: autoSourceGraph.rootNodes.length,
        });
      } else if (!autoSourceGraph && runtimeScanVersion > 0) {
        console.warn("[workbench-inspector] fiber scan unavailable; falling back to registrations graph", {
          registrations: registrations.length,
        });
      }
      const fallbackSourceGraph = autoSourceGraph ?? buildInspectorSourceGraph(registrations);
      const graphMode = autoSourceGraph ? ("fiber" as const) : ("registrations" as const);
      const runtimeIndex = indexRuntimeSourceNodes(fallbackSourceGraph.rootNodes);
      const canonicalSourceBindings = snapshotRootNodes
        ? buildSourceRuntimeBindings(snapshotRootNodes, runtimeIndex)
        : new Map<string, ResolvedSourceRuntimeBinding>();
      const sourceBindings = snapshotRootNodes
        ? buildSourceRuntimeFallbackBindings(snapshotRootNodes, runtimeIndex, canonicalSourceBindings)
        : canonicalSourceBindings;
      const domAssistedBindings = snapshotRootNodes
        ? applyDomAssistedBindings(snapshotRootNodes, sourceBindings, fallbackSourceGraph.elementsByProjectionId)
        : { bindings: sourceBindings, elementsByProjectionId: new Map<string, Element>() };
      const boundProjectionIds = snapshotRootNodes ? collectBoundProjectionIds(domAssistedBindings.bindings) : new Set<string>();
      const sourceRootNodes = snapshotRootNodes
        ? bindSourceNodes(snapshotRootNodes, domAssistedBindings.bindings, runtimeIndex.nodesByProjectionId)
        : fallbackSourceGraph.rootNodes;
      if (snapshotRootNodes && runtimeScanVersion > 0) {
        let bound = 0;
        let stale = 0;
        let unresolved = 0;
        const unresolvedSamples: Array<{ id: string; label: string; path: string }> = [];
        const visit = (nodes: SourceNode[]) => {
          for (const node of nodes) {
            const status = String(node.meta?.bindingStatus ?? "unresolved");
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
        for (const [sourceNodeId, element] of fallbackSourceGraph.elementsBySourceNodeId) {
          elementsById.set(sourceNodeId, element);
          elementsByNodeId.set(sourceNodeId, [element]);
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
      const runtimeMeaningfulSupplements =
        snapshotRootNodes && boundProjectionIds.size
          ? collectRuntimeMeaningfulSupplementNodes(fallbackSourceGraph.rootNodes, boundProjectionIds)
          : [];
      const meaningfulRootNodes = mapSourceGraphToInspectorTree(
        [...sourceGraph.rootNodes, ...runtimeMeaningfulSupplements],
        sourceGraph.runtimeProjectionsById
      );
      const allRootNodes = mapSourceGraphToInspectorTree(
        fallbackSourceGraph.rootNodes,
        fallbackSourceGraph.runtimeProjectionsById
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

  React.useEffect(() => {
    if (!state.enabled || !state.hierarchy.autoRefreshTree) return;
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
  }, [adapter, state.enabled, state.hierarchy.autoRefreshTree]);

  const value = React.useMemo<InspectorContextValue>(
    () => ({
      activation,
      adapter,
      draftChanges,
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
        const ownerComponentKey = node ? `${node.ownerPath ?? node.path}::${node.componentName ?? ""}` : null;
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
            const ownerComponentKey = `${selectedNode.ownerPath ?? selectedNode.path}::${selectedNode.componentName ?? ""}`;
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
