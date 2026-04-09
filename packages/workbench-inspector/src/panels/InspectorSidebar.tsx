import React from "react";
import { Tree, type NodeApi, type NodeRendererProps, type TreeApi } from "react-arborist";

import type {
  InspectorNode,
  InspectorPropertiesSection,
  InspectorPropertyField,
  SourceBackedDraftChange,
  SourceBackedParameter,
  SourceBackedTargetScope,
} from "../contracts/types";
import { toDisplaySourcePath, useInspectorContext } from "../runtime/InspectorContext";

type DragState = {
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
};

type ResizeState =
  | {
      kind: "panel";
      startClientX: number;
      startClientY: number;
      originWidth: number;
      originHeight: number;
    }
  | {
      kind: "tree";
      startClientX: number;
      originTreePaneWidth: number;
    };

const MIN_PANEL_WIDTH = 760;
const MIN_PANEL_HEIGHT = 520;
const MIN_TREE_PANE_WIDTH = 280;
const MIN_DETAILS_PANE_WIDTH = 320;
const PANEL_VIEWPORT_PADDING = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function collectAncestorIds(nodesById: Map<string, InspectorNode>, nodeId: string | null | undefined): string[] {
  if (!nodeId) return [];
  const ancestors: string[] = [];
  let current = nodesById.get(nodeId);
  while (current?.parentId) {
    const parent = nodesById.get(current.parentId);
    if (!parent) break;
    ancestors.push(parent.id);
    current = parent;
  }
  return ancestors;
}

function buildNodeIndex(nodes: InspectorNode[]): Map<string, InspectorNode> {
  const index = new Map<string, InspectorNode>();
  const visit = (node: InspectorNode) => {
    index.set(node.id, node);
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return index;
}

function countNodes(nodes: InspectorNode[]): number {
  let count = 0;
  const visit = (node: InspectorNode) => {
    count += 1;
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return count;
}


function filterNodesForFocus(
  nodes: InspectorNode[],
  nodesById: Map<string, InspectorNode>,
  markedIds: Set<string>,
  focusMode: "all" | "marked"
): InspectorNode[] {
  if (focusMode === "all") return nodes;
  const visibleIds = new Set<string>();
  for (const id of markedIds) {
    visibleIds.add(id);
    for (const ancestorId of collectAncestorIds(nodesById, id)) visibleIds.add(ancestorId);
  }
  const filter = (input: InspectorNode[]): InspectorNode[] => {
    const output: InspectorNode[] = [];
    for (const node of input) {
      const children = filter(node.children ?? []);
      if (!visibleIds.has(node.id) && !children.length) continue;
      output.push({ ...node, children });
    }
    return output;
  };
  return filter(nodes);
}

function filterNodesForRepeatedOnly(nodes: InspectorNode[]): InspectorNode[] {
  const filter = (input: InspectorNode[]): InspectorNode[] => {
    const output: InspectorNode[] = [];
    for (const node of input) {
      const children = filter(node.children ?? []);
      if (node.nodeType !== "repeated-group" && !children.length) continue;
      output.push({ ...node, children });
    }
    return output;
  };
  return filter(nodes);
}

function hasAnyRuntimeVisibilityData(nodes: InspectorNode[]): boolean {
  let found = false;
  const visit = (node: InspectorNode) => {
    if (found) return;
    if (
      node.projectionCount > 0 ||
      node.bounds != null ||
      node.bindingStatus === "bound" ||
      node.bindingStatus === "multiple" ||
      node.bindingStatus === "stale"
    ) {
      found = true;
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return found;
}

function isRenderableTreeElement(element: Element | null | undefined): boolean {
  if (!element) return false;
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
      // Fall through to manual checks when the browser does not support some options.
    }
  }
  if (element.getClientRects().length === 0) return false;
  const rect = element.getBoundingClientRect();
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return false;
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (typeof window === "undefined" || !(element instanceof HTMLElement || element instanceof SVGElement)) {
    return true;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none") return false;
  if (style.visibility === "hidden" || style.visibility === "collapse") return false;
  if (Number(style.opacity) === 0) return false;
  if (element instanceof HTMLElement && element.hidden) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  return true;
}

function isTreeWrapperLikeNode(node: InspectorNode): boolean {
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

function filterNodesForVisibleOnly(
  nodes: InspectorNode[],
  getDirectElements: (nodeId: string) => Element[]
): InspectorNode[] {
  if (!hasAnyRuntimeVisibilityData(nodes)) return nodes;

  const filter = (input: InspectorNode[], ancestorRenderable: boolean, parentId: string | null): InspectorNode[] => {
    const output: InspectorNode[] = [];
    for (const node of input) {
      const directElements = getDirectElements(node.id);
      const hasRenderableDirectElement = directElements.some((element) => isRenderableTreeElement(element));
      const nodeIsRenderable = hasRenderableDirectElement;
      const nextAncestorRenderable = ancestorRenderable || nodeIsRenderable;
      const children = filter(node.children ?? [], nextAncestorRenderable, node.id);
      const wrapperLike = isTreeWrapperLikeNode(node);
      if (wrapperLike && !nodeIsRenderable && children.length === 0) continue;
      const keepBecauseOfVisibleAncestor =
        ancestorRenderable &&
        (node.children?.length ?? 0) === 0 &&
        node.nodeType !== "definition" &&
        (node.kind === "text" || node.kind === "image" || node.kind === "control");
      const keepBecauseOfRepeatedStructure =
        ancestorRenderable && node.nodeType !== "definition" && (node.kind === "text" || node.kind === "image");
      if (!nodeIsRenderable && !children.length && !keepBecauseOfVisibleAncestor && !keepBecauseOfRepeatedStructure) continue;

      const shouldFlattenInvisibleWrapper =
        children.length > 0 &&
        !keepBecauseOfVisibleAncestor &&
        !keepBecauseOfRepeatedStructure &&
        wrapperLike;

      if (shouldFlattenInvisibleWrapper) {
        output.push(
          ...children.map((child) => (child.parentId === parentId ? child : { ...child, parentId }))
        );
        continue;
      }

      output.push({ ...node, parentId, children });
    }
    return output;
  };
  return filter(nodes, false, null);
}

function toField(id: string, label: string, value: string | number | boolean | null | undefined): InspectorPropertyField {
  return {
    id,
    label,
    value: value == null ? "-" : String(value),
  };
}

function getKindBadgeColor(kind: InspectorNode["kind"]): string {
  switch (kind) {
    case "semantic":
      return "#7cf7c6";
    case "control":
      return "#8ab4ff";
    case "text":
      return "#ffd876";
    case "image":
      return "#ff9bd1";
    case "content":
      return "#a78bfa";
    default:
      return "rgba(239, 246, 255, 0.66)";
  }
}

function normalizePreviewText(value: string | null | undefined, maxLength = 44): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getElementPreviewText(element: Element): string | null {
  if (element instanceof HTMLInputElement) {
    return normalizePreviewText(element.value || element.placeholder || element.getAttribute("aria-label"));
  }
  if (element instanceof HTMLTextAreaElement) {
    return normalizePreviewText(element.value || element.placeholder || element.getAttribute("aria-label"));
  }
  if (element instanceof HTMLSelectElement) {
    const selectedLabel =
      element.selectedOptions?.length
        ? [...element.selectedOptions].map((option) => option.textContent ?? "").join(", ")
        : element.value;
    return normalizePreviewText(selectedLabel || element.getAttribute("aria-label"));
  }
  const preferred =
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.getAttribute("alt") ||
    element.textContent;
  return normalizePreviewText(preferred);
}

function getNodeRuntimePreviewText(node: InspectorNode, elements: Element[]): string | null {
  const previewableTags = new Set(["button", "a", "label", "option", "summary", "input", "textarea", "select"]);
  const normalizedTagName = node.tagName.toLowerCase();
  const isPreviewableTag = previewableTags.has(normalizedTagName);
  const isLeafNode = (node.children?.length ?? 0) === 0;
  if (!isPreviewableTag && node.kind !== "text") {
    return null;
  }
  if (!isLeafNode && node.kind !== "text") {
    return null;
  }
  for (const element of elements) {
    const preview = getElementPreviewText(element);
    if (preview && preview.toLowerCase() !== node.label.toLowerCase()) {
      return preview;
    }
  }
  return null;
}

function formatInspectorFieldValue(fieldId: string, value: string | number | boolean | null | undefined): string {
  if (value == null) return "-";
  const text = String(value);
  if (text === "-") return text;
  if (fieldId === "sourcePath" || fieldId.toLowerCase().includes("sourcepath")) return toDisplaySourcePath(text) ?? text;
  if (fieldId === "sourceLocation" || fieldId.toLowerCase().includes("sourcelocation")) {
    const match = text.match(/^(.*?):(\d+):(\d+)$/);
    if (!match) return toDisplaySourcePath(text) ?? text;
    const [, pathPart, line, column] = match;
    return `${toDisplaySourcePath(pathPart) ?? pathPart}:${line}:${column}`;
  }
  if (fieldId === "bindingKey" || fieldId.toLowerCase().includes("source-key")) {
    return text.replace(/([a-z]+:)(.+?)(?::(\d+:\d+:[^:]+|[^:]+))?$/i, (_full, prefix, middle, suffix) => {
      const normalizedMiddle = toDisplaySourcePath(middle) ?? middle;
      return suffix ? `${prefix}${normalizedMiddle}:${suffix}` : `${prefix}${normalizedMiddle}`;
    });
  }
  return text;
}

function coerceFiniteNumber(input: string | number | null | undefined): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  const normalized = input.trim().replace(",", ".");
  if (!normalized) return null;
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function normalizeDraftNumericInput(input: string): string {
  return input.trim().replace(",", ".");
}

function isNumericInputString(value: string): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(normalizeDraftNumericInput(value));
}

function detectSourceBackedTargetScope(parameter: SourceBackedParameter): SourceBackedTargetScope {
  if (parameter.origin.kind === "class-name") {
    return parameter.canCreatePlacementOverride ? "shared-style-rule" : "placement";
  }
  return "placement";
}

function detectSourceBackedApplyStrategy(
  parameter: SourceBackedParameter,
  targetScope: SourceBackedTargetScope
): SourceBackedDraftChange["applyStrategy"] {
  if (parameter.origin.kind === "class-name") {
    return targetScope === "placement" ? "create-placement-override" : "patch-origin";
  }
  if (parameter.expressionEditMode === "delta-number" || parameter.expressionEditMode === "delta-length") {
    return "wrap-expression";
  }
  return "patch-origin";
}

function detectSourceBackedEditKind(
  parameter: SourceBackedParameter,
  targetScope: SourceBackedTargetScope
): SourceBackedDraftChange["editKind"] {
  if (parameter.origin.kind === "class-name") {
    return targetScope === "placement" ? "placement-style-override" : "css-rule-set";
  }
  if (parameter.origin.kind === "jsx-text") return "replace-text";
  if (parameter.expressionEditMode === "delta-number") return "delta-number";
  if (parameter.expressionEditMode === "delta-length") return "delta-length";
  return "set-literal";
}

function computeSourceBackedNormalizedValue(parameter: SourceBackedParameter, draftValue: string): string | null {
  if (parameter.expressionEditMode === "delta-number" || parameter.expressionEditMode === "delta-length") {
    const delta = coerceFiniteNumber(draftValue);
    if (delta == null) return null;
    const currentText = parameter.normalizedValue ?? parameter.currentValue ?? "";
    const currentNumber = coerceFiniteNumber(currentText);
    if (currentNumber == null) return draftValue;
    const nextNumber = currentNumber + delta;
    const unitMatch = currentText.trim().match(/[a-z%]+$/i);
    return `${nextNumber}${unitMatch?.[0] ?? ""}`;
  }
  if (parameter.valueKind === "length") {
    const normalizedDraft = normalizeDraftNumericInput(draftValue);
    if (!normalizedDraft) return draftValue;
    const numericOnly = normalizedDraft.match(/^-?\d+(?:\.\d+)?$/);
    if (!numericOnly) return draftValue;
    const currentText = (parameter.normalizedValue ?? parameter.currentValue ?? "").trim();
    const unitMatch = currentText.match(/[a-z%]+$/i);
    if (unitMatch?.[0]) {
      return `${normalizedDraft}${unitMatch[0]}`;
    }
    const astPath = parameter.origin.astPath ?? "";
    const defaultUnit =
      parameter.cssProperty ||
      astPath.startsWith("attr:style.") ||
      astPath === "attr:left" ||
      astPath === "attr:right" ||
      astPath === "attr:top" ||
      astPath === "attr:bottom" ||
      astPath === "attr:x" ||
      astPath === "attr:y" ||
      astPath === "attr:width" ||
      astPath === "attr:height"
        ? "px"
        : "";
    return `${normalizedDraft}${defaultUnit}`;
  }
  if (parameter.valueKind === "number") {
    const normalizedDraft = normalizeDraftNumericInput(draftValue);
    const numericOnly = normalizedDraft.match(/^-?\d+(?:\.\d+)?$/);
    if (numericOnly) return normalizedDraft;
  }
  return draftValue;
}

function normalizeHexColorForInput(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized;
  const shortMatch = normalized.match(/^#([0-9a-f]{3})$/i);
  if (!shortMatch?.[1]) return null;
  const expanded = shortMatch[1]
    .split("")
    .map((part) => `${part}${part}`)
    .join("");
  return `#${expanded}`;
}

function isPositionLikeSourceBackedParameter(parameter: SourceBackedParameter): boolean {
  const propertyName = (parameter.cssProperty ?? parameter.label ?? "").trim().toLowerCase();
  return /^(left|right|top|bottom|x|y|inset|insetx|insety|translatex|translatey)$/.test(propertyName);
}

function isSimpleScalarSourceBackedValue(
  parameter: SourceBackedParameter,
  value: string | null | undefined
): boolean {
  const normalized = value?.trim() ?? "";
  if (!normalized) return false;
  if (parameter.valueKind === "number") {
    return /^-?\d+(?:\.\d+)?$/.test(normalized.replace(",", "."));
  }
  if (parameter.valueKind === "length") {
    return /^-?\d+(?:\.\d+)?([a-z%]+)?$/i.test(normalized.replace(",", "."));
  }
  return false;
}

function getSourceBackedSliderConfig(
  parameter: SourceBackedParameter,
  currentValue: string | null | undefined
): { min: number; max: number; step: number } | null {
  if (!(parameter.valueKind === "number" || parameter.valueKind === "length")) return null;
  if (!isSimpleScalarSourceBackedValue(parameter, currentValue)) return null;
  const currentNumber = coerceFiniteNumber(currentValue);
  if (currentNumber == null) return null;

  if (currentNumber >= 0 && currentNumber <= 1) {
    return { min: 0, max: 1, step: 0.01 };
  }

  const absoluteValue = Math.abs(currentNumber);
  const baseRange = absoluteValue <= 64 ? 128 : absoluteValue <= 320 ? absoluteValue * 2 : absoluteValue * 1.5;
  const roundedRange = Math.max(100, Math.ceil(baseRange / 10) * 10);
  const min = currentNumber < 0 ? -roundedRange : 0;
  const max = currentNumber < 0 ? roundedRange : Math.max(roundedRange, Math.ceil((currentNumber + roundedRange / 4) / 10) * 10);
  const step =
    absoluteValue <= 16 ? 1 :
    absoluteValue <= 80 ? 2 :
    absoluteValue <= 240 ? 4 :
    absoluteValue <= 640 ? 8 :
    16;

  if (isPositionLikeSourceBackedParameter(parameter)) {
    return {
      min: Math.floor(currentNumber - roundedRange),
      max: Math.ceil(currentNumber + roundedRange),
      step,
    };
  }

  return { min, max, step };
}

export function InspectorSidebar() {
  const {
    adapter,
    allRootNodes,
    debugEvents,
    draftChanges,
    sourceBackedApplyResult,
    sourceBackedDraftChanges,
    applySourceBackedDraftChanges,
    clearDraftChangesForNode,
    discardSourceBackedDraftChanges,
    discardSourceBackedDraftIds,
    getNodeById,
    getNodeDirectElements,
    getNodeElement,
    getNodeElements,
    getBindingDebug,
    getHighlightDebug,
    getNodeElementDebug,
    meaningfulRootNodes,
    refreshNodes,
    setFocusMode,
    setHierarchyQuery,
    setHoveredNodeId,
    setPanelOpen,
    setPanelPosition,
    setPanelSize,
    setPickMode,
    setSelectedNodeId,
    setAutoRefreshTree,
    setHideInvisible,
    setTreePaneWidth,
    setTreeFilterMode,
    upsertSourceBackedDraftChange,
    state,
    toggleNodeExpanded,
    toggleNodeMarked,
    removeDraftChange,
    removeSourceBackedDraftChange,
  } = useInspectorContext();
  const [dragState, setDragState] = React.useState<DragState | null>(null);
  const [resizeState, setResizeState] = React.useState<ResizeState | null>(null);
  const shellRef = React.useRef<HTMLElement | null>(null);
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const leftChromeRef = React.useRef<HTMLDivElement | null>(null);
  const treeRef = React.useRef<TreeApi<InspectorNode> | null>(null);
  const lastAutoRevealNodeIdRef = React.useRef<string | null>(null);
  const [bodyHeight, setBodyHeight] = React.useState(320);
  const [leftChromeHeight, setLeftChromeHeight] = React.useState(120);
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  const [openParameterInfoId, setOpenParameterInfoId] = React.useState<string | null>(null);
  const [openSliderSettingsId, setOpenSliderSettingsId] = React.useState<string | null>(null);
  const [sliderOverrides, setSliderOverrides] = React.useState<Record<string, { min: string; max: string }>>({});
  const [showDraftReview, setShowDraftReview] = React.useState(false);

  React.useEffect(() => {
    if (!dragState) return;
    const handlePointerMove = (event: PointerEvent) => {
      const nextX = Math.max(12, dragState.originX + (event.clientX - dragState.startClientX));
      const nextY = Math.max(12, dragState.originY + (event.clientY - dragState.startClientY));
      setPanelPosition({ x: nextX, y: nextY });
    };
    const handlePointerUp = () => setDragState(null);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, setPanelPosition]);

  React.useEffect(() => {
    if (!resizeState) return;
    const handlePointerMove = (event: PointerEvent) => {
      const maxPanelWidth = Math.max(MIN_PANEL_WIDTH, window.innerWidth - PANEL_VIEWPORT_PADDING);
      const maxPanelHeight = Math.max(MIN_PANEL_HEIGHT, window.innerHeight - PANEL_VIEWPORT_PADDING);
      if (resizeState.kind === "panel") {
        const nextWidth = clamp(
          resizeState.originWidth + (event.clientX - resizeState.startClientX),
          MIN_PANEL_WIDTH,
          maxPanelWidth
        );
        const nextHeight = clamp(
          resizeState.originHeight + (event.clientY - resizeState.startClientY),
          MIN_PANEL_HEIGHT,
          maxPanelHeight
        );
        setPanelSize({ width: nextWidth, height: nextHeight });
        return;
      }

      const maxTreePaneWidth = Math.max(
        MIN_TREE_PANE_WIDTH,
        state.panelSize.width - MIN_DETAILS_PANE_WIDTH - 14
      );
      const nextTreePaneWidth = clamp(
        resizeState.originTreePaneWidth + (event.clientX - resizeState.startClientX),
        MIN_TREE_PANE_WIDTH,
        maxTreePaneWidth
      );
      setTreePaneWidth(nextTreePaneWidth);
    };
    const handlePointerUp = () => setResizeState(null);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizeState, setPanelSize, setTreePaneWidth, state.panelSize.width]);

  if (!state.enabled) return null;

  const beginDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setDragState({
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: state.panelPosition.x,
      originY: state.panelPosition.y,
    });
  };

  const beginPanelResize = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setResizeState({
      kind: "panel",
      startClientX: event.clientX,
      startClientY: event.clientY,
      originWidth: panelWidth,
      originHeight: panelHeight,
    });
  };

  const beginTreePaneResize = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setResizeState({
      kind: "tree",
      startClientX: event.clientX,
      originTreePaneWidth: treePaneWidth,
    });
  };

  const shellStyle: React.CSSProperties = {
    position: "fixed",
    left: `${state.panelPosition.x}px`,
    top: `${state.panelPosition.y}px`,
    zIndex: 9999,
    color: "#eff6ff",
  };
  const panelWidth = state.panelSize.width;
  const panelHeight = state.panelSize.height;
  const treePaneWidth = clamp(
    state.treePaneWidth,
    MIN_TREE_PANE_WIDTH,
    Math.max(MIN_TREE_PANE_WIDTH, panelWidth - MIN_DETAILS_PANE_WIDTH - 14)
  );
  const detailsPaneWidth = Math.max(MIN_DETAILS_PANE_WIDTH, panelWidth - treePaneWidth - 14);

  const baseTreeRootNodes =
    state.hierarchy.treeFilterMode === "smart"
      ? meaningfulRootNodes
      : state.hierarchy.treeFilterMode === "repeated"
        ? allRootNodes
        : allRootNodes;
  const visibleTreeRootNodes =
    state.hierarchy.treeFilterMode === "repeated"
      ? filterNodesForRepeatedOnly(baseTreeRootNodes)
      : baseTreeRootNodes;
  const repeatedFilterFallbackRootNodes =
    state.hierarchy.treeFilterMode === "repeated" && !visibleTreeRootNodes.length
      ? allRootNodes
      : visibleTreeRootNodes;
  const visibilityFilteredRootNodes = state.hierarchy.hideInvisible
    ? filterNodesForVisibleOnly(repeatedFilterFallbackRootNodes, getNodeDirectElements)
    : repeatedFilterFallbackRootNodes;
  const nodesById = buildNodeIndex(visibilityFilteredRootNodes);
  const markedNodeIds = new Set(state.hierarchy.markedNodeIds);
  const focusFilteredRootNodes = filterNodesForFocus(
    visibilityFilteredRootNodes,
    nodesById,
    markedNodeIds,
    state.hierarchy.focusMode
  );
  const filteredRootNodes =
    state.hierarchy.focusMode === "marked" && !focusFilteredRootNodes.length
      ? visibilityFilteredRootNodes
      : focusFilteredRootNodes;
  const treeFallbackReason =
    state.hierarchy.treeFilterMode === "repeated" && !visibleTreeRootNodes.length
      ? "Cycles only found no nodes, showing all registered nodes."
      : state.hierarchy.hideInvisible && !visibilityFilteredRootNodes.length
      ? "Hide invisible found no currently rendered nodes."
      : state.hierarchy.focusMode === "marked" && !focusFilteredRootNodes.length
        ? "Focus mode has no marked nodes, showing all available nodes."
        : null;
  const visibleNodeCount = countNodes(filteredRootNodes);
  const selectedNode = getNodeById(state.selectedNodeId);
  const selectedElement = getNodeElement(state.selectedNodeId);
  const selectedElementDebug = getNodeElementDebug(state.selectedNodeId);
  const selectedBindingDebug = getBindingDebug(state.selectedNodeId);
  const selectedHighlightDebug = getHighlightDebug(state.selectedNodeId);
  const enrichment = selectedNode ? adapter.enrichNode?.(selectedNode) ?? null : null;
  const selectedDraftChanges = selectedNode
    ? draftChanges.filter((entry) => entry.sourceNodeId === (selectedNode.sourceNodeId ?? selectedNode.id))
    : [];
  const selectedSourceBackedDraftChanges = selectedNode
    ? sourceBackedDraftChanges.filter((entry) => entry.sourceNodeId === (selectedNode.sourceNodeId ?? selectedNode.id))
    : [];
  const hasAnySourceBackedDraftChanges = sourceBackedDraftChanges.length > 0;
  const sourceBackedParameters = selectedNode
    ? adapter.getSourceBackedParameters?.(selectedNode) ?? selectedNode.sourceBackedParameters ?? []
    : [];
  const sourceBackedDraftsByParameterId = new Map(
    sourceBackedDraftChanges.map((entry) => [entry.parameterId, entry] as const)
  );
  const sourceBackedDraftGroups = React.useMemo(() => {
    const groups = new Map<
      string,
      {
        sourcePath: string;
        entries: SourceBackedDraftChange[];
      }
    >();
    for (const draft of sourceBackedDraftChanges) {
      const sourcePath = draft.origin.displaySourcePath ?? toDisplaySourcePath(draft.origin.sourcePath) ?? draft.origin.sourcePath;
      const key = sourcePath || "unknown";
      const bucket = groups.get(key) ?? { sourcePath: key, entries: [] };
      bucket.entries.push(draft);
      groups.set(key, bucket);
    }
    return [...groups.values()];
  }, [sourceBackedDraftChanges]);
  const sourceNodesBySourceNodeId = React.useMemo(() => {
    const index = new Map<string, InspectorNode>();
    const visit = (node: InspectorNode) => {
      if (node.sourceNodeId && !index.has(node.sourceNodeId)) {
        index.set(node.sourceNodeId, node);
      }
      for (const child of node.children ?? []) visit(child);
    };
    for (const node of allRootNodes) visit(node);
    return index;
  }, [allRootNodes]);
  const previewCapabilities = adapter.getPreviewCapabilities?.(selectedNode ?? null) ?? {
    token: false,
    component: false,
    placement: false,
    "instance-preview": false,
  };
  const canOpenInWorkbench = selectedNode ? (adapter.canOpenNodeInWorkbench?.(selectedNode) ?? false) : false;
  const mergedLabel = enrichment?.label ?? selectedNode?.label ?? "No node selected";

  const copyFieldValue = React.useCallback((value: string) => {
    if (!value || value === "-") return;
    void navigator.clipboard?.writeText(value);
  }, []);

  const revealNodeInTreeAndPage = React.useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setHoveredNodeId(nodeId);
      const treeApi = treeRef.current;
      const selectedTreeNode = treeApi?.get(nodeId);
      selectedTreeNode?.openParents();
      if (treeApi) {
        void treeApi.scrollTo(nodeId, "smart");
      }
      window.setTimeout(() => {
        const element = getNodeElement(nodeId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
      }, 0);
    },
    [getNodeElement, setHoveredNodeId, setSelectedNodeId]
  );

  React.useLayoutEffect(() => {
    const measure = () => {
      const shellHeight = shellRef.current?.clientHeight ?? panelHeight;
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const nextBodyHeight = Math.max(220, shellHeight - headerHeight - 14);
      const nextLeftChromeHeight = leftChromeRef.current?.offsetHeight ?? 120;
      setBodyHeight((current) => (current === nextBodyHeight ? current : nextBodyHeight));
      setLeftChromeHeight((current) => (current === nextLeftChromeHeight ? current : nextLeftChromeHeight));
    };

    measure();
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    if (shellRef.current) observer.observe(shellRef.current);
    if (headerRef.current) observer.observe(headerRef.current);
    if (leftChromeRef.current) observer.observe(leftChromeRef.current);
    return () => observer.disconnect();
  }, [panelHeight, panelWidth, treeFallbackReason, state.hierarchy.hideInvisible, state.hierarchy.treeFilterMode, state.hierarchy.focusMode]);

  const treeHeight = Math.max(220, bodyHeight - leftChromeHeight - 8);

  React.useEffect(() => {
    if (state.pickMode !== "on") {
      lastAutoRevealNodeIdRef.current = null;
      return;
    }
    const selectedNodeId = state.selectedNodeId;
    if (!selectedNodeId) return;
    if (lastAutoRevealNodeIdRef.current === selectedNodeId) return;

    const treeApi = treeRef.current;
    if (!treeApi) return;

    const selectedTreeNode = treeApi.get(selectedNodeId);
    if (!selectedTreeNode) return;

    lastAutoRevealNodeIdRef.current = selectedNodeId;
    selectedTreeNode.openParents();
    void treeApi.scrollTo(selectedNodeId, "smart");
  }, [filteredRootNodes, state.pickMode, state.selectedNodeId]);

  const handleRowSelect = React.useCallback(
    (nodeId: string, hasChildren: boolean, toggle: () => void) => {
      console.debug("[workbench-inspector] row click", { nodeId, hasChildren, selectedNodeId: state.selectedNodeId });
      if (state.selectedNodeId === nodeId && hasChildren) {
        toggle();
        toggleNodeExpanded(nodeId);
        return;
      }
      setSelectedNodeId(nodeId);
      setHoveredNodeId(nodeId);
    },
    [setHoveredNodeId, setSelectedNodeId, state.selectedNodeId, toggleNodeExpanded]
  );

  if (!state.panelOpen) {
    return (
      <div
        aria-label="Workbench inspector launcher"
        data-workbench-inspector-shell="true"
        data-workbench-inspector-sidebar="collapsed"
        style={{
          ...shellStyle,
          width: "60px",
          borderRadius: "18px",
          border: "1px solid rgba(146, 167, 255, 0.22)",
          background: "rgba(10, 14, 24, 0.94)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
        }}
      >
        <div
          onPointerDown={beginDrag}
          style={{
            cursor: dragState ? "grabbing" : "grab",
            padding: "10px 0 8px",
            textAlign: "center",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.6,
            userSelect: "none",
          }}
        >
          drag
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
            padding: "12px 0 16px",
            display: "grid",
            gap: 10,
            justifyItems: "center",
          }}
        >
          <span
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #84f3cf, #6ea8ff)",
              color: "#08101d",
              fontWeight: 700,
            }}
          >
            I
          </span>
          <span
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Inspector
          </span>
        </button>
      </div>
    );
  }

  const structureSections: InspectorPropertiesSection[] = selectedNode
    ? [
        {
          id: "structure",
          title: "Structure",
          fields: [
            toField("structureLabel", "Label", mergedLabel),
            toField("structureComponent", "Component", selectedNode.componentName ?? null),
            toField("structureTag", "Tag", selectedNode.tagName),
            toField("structureKind", "Kind", selectedNode.kind),
            toField("structureNodeType", "Node type", selectedNode.nodeType),
            toField("structureSourceNodeId", "Source node", selectedNode.sourceNodeId ?? selectedNode.id),
            toField("structureSourceCategory", "Source category", selectedNode.sourceCategory ?? null),
            toField("structurePath", "Path", selectedNode.path),
            toField("structureOwnerPath", "Owner path", selectedNode.ownerPath ?? null),
            toField("structureSourcePath", "Source path", toDisplaySourcePath(selectedNode.sourcePath) ?? null),
            toField(
              "structureSourceLocation",
              "Source location",
              selectedNode.sourceLocation
                ? (() => {
                    const match = selectedNode.sourceLocation.match(/^(.*?):(\d+):(\d+)$/);
                    if (!match) return toDisplaySourcePath(selectedNode.sourceLocation);
                    const [, pathPart, line, column] = match;
                    return `${toDisplaySourcePath(pathPart) ?? pathPart}:${line}:${column}`;
                  })()
                : null
            ),
          ],
        },
      ]
    : [];

  const genericSections: InspectorPropertiesSection[] = selectedNode
    ? [
        {
          id: "node",
          title: "Node",
          fields: [
            toField("nodeType", "Node type", selectedNode.nodeType),
            toField("bindingKey", "Binding key", selectedNode.bindingKey ?? null),
            toField("bindingStatus", "Binding status", selectedNode.bindingStatus ?? null),
            toField("projectionCount", "Projection count", selectedNode.projectionCount),
            toField("runtimeProjectionCount", "Runtime projections", selectedNode.runtimeProjectionCount ?? 0),
            toField("definitionId", "Definition", selectedNode.definitionId ?? null),
            toField("placementId", "Placement", selectedNode.placementId ?? null),
            toField("repeatedGroupId", "Repeated group", selectedNode.repeatedGroupId ?? null),
            toField("runtimeId", "Runtime id", selectedNode.runtimeId ?? selectedNode.id),
          ],
        },
        {
          id: "layout",
          title: "Layout",
          fields: [
            toField("x", "X", selectedNode.bounds?.x != null ? Math.round(selectedNode.bounds.x) : null),
            toField("y", "Y", selectedNode.bounds?.y != null ? Math.round(selectedNode.bounds.y) : null),
            toField("w", "Width", selectedNode.bounds?.width != null ? Math.round(selectedNode.bounds.width) : null),
            toField("h", "Height", selectedNode.bounds?.height != null ? Math.round(selectedNode.bounds.height) : null),
            toField("visible", "Visible", selectedNode.isVisible),
            toField("interactive", "Interactive", selectedNode.isInteractive),
          ],
        },
        {
          id: "highlight",
          title: "Highlight",
          fields: [
            toField("highlightMode", "Highlight mode", selectedNode.highlightMode),
            toField("projectionCountDebug", "Projection count", selectedHighlightDebug.projectionCount),
            toField("projectionElementCount", "Projection elements", selectedHighlightDebug.projectionElementCount),
            toField("resolvedElementCount", "Resolved node elements", selectedHighlightDebug.resolvedElementCount),
            toField("renderableRectCount", "Renderable rects", selectedHighlightDebug.renderableRectCount),
            toField(
              "missingProjectionIds",
              "Missing projections",
              selectedHighlightDebug.missingProjectionIds.length
                ? selectedHighlightDebug.missingProjectionIds.join(", ")
                : null
            ),
          ],
        },
      ]
    : [];

  const authoringSections: InspectorPropertiesSection[] =
    selectedNode
      ? [
          {
            id: "authoring",
            title: "Authoring",
            fields: [
              toField("authoringSourceNode", "Source node", enrichment?.authoringNode?.sourceNodeId ?? selectedNode.sourceNodeId ?? selectedNode.id),
              toField("authoringLabel", "Authoring label", enrichment?.authoringNode?.label ?? mergedLabel),
              toField("authoringTargetCategory", "Target category", enrichment?.authoringNode?.targetCategory ?? selectedNode.sourceCategory ?? null),
              toField("authoringEditable", "Editable surface", enrichment?.authoringNode?.hasEditableSurface ?? false),
              toField("authoringScopes", "Scopes", enrichment?.authoringNode?.scopes?.join(", ") ?? "instance"),
              toField("authoringGroups", "Groups", enrichment?.authoringNode?.parameterGroups?.join(", ") ?? "appearance, layout"),
              toField(
                "previewCapabilities",
                "Preview scopes",
                Object.entries(previewCapabilities)
                  .filter(([, enabled]) => enabled)
                  .map(([scope]) => scope)
                  .join(", ") || "none"
              ),
            ],
          },
        ]
      : [];

  const semanticSection: InspectorPropertiesSection[] =
    selectedNode?.semanticTargetId || enrichment?.meta
      ? [
          {
            id: "semantic",
            title: "Semantic",
            fields: [
              toField("semanticTargetId", "Semantic target", selectedNode?.semanticTargetId ?? null),
              ...Object.entries(enrichment?.meta ?? {}).map(([key, value]) => toField(key, key, value)),
            ],
          },
        ]
      : [];

  const ownershipSection: InspectorPropertiesSection[] =
    enrichment?.ownershipRefs?.length
      ? [
          {
            id: "ownership",
            title: "Ownership",
            fields: enrichment.ownershipRefs.map((ref) => toField(ref.id, ref.kind, ref.label)),
          },
        ]
      : [];

  const draftSections: InspectorPropertiesSection[] =
    selectedNode
      ? [
          {
            id: "draft",
            title: "Draft preview",
            fields: [
              toField("draftCount", "Draft entries", selectedDraftChanges.length),
              toField("parameterCount", "Source-backed params", sourceBackedParameters.length),
              toField(
                "draftStatuses",
                "Statuses",
                selectedDraftChanges.length ? selectedDraftChanges.map((entry) => entry.status).join(", ") : "none"
              ),
              toField(
                "draftScopes",
                "Scopes",
                selectedDraftChanges.length ? selectedDraftChanges.map((entry) => entry.scope).join(", ") : "none"
              ),
            ],
          },
        ]
      : [];

  const debugSections: InspectorPropertiesSection[] =
    state.debug
      ? [
          {
            id: "overlay-debug",
            title: "Overlay debug",
            fields: [
              toField("overlay-selected-node", "Selected node", selectedNode?.id ?? "none"),
              toField("overlay-graph-mode", "Graph mode", selectedBindingDebug.graphMode),
              toField("overlay-resolution-path", "Resolution path", selectedBindingDebug.resolutionPath ?? "-"),
              toField("overlay-binding-status", "Binding status", selectedNode?.bindingStatus ?? "none"),
              toField("overlay-runtime-count", "Runtime projections", selectedNode?.runtimeProjectionCount ?? 0),
              toField("overlay-element-found", "Element found", selectedElementDebug.found),
              toField("overlay-element-mode", "Element mode", selectedElementDebug.mode),
              toField("overlay-matched-node", "Matched node", selectedElementDebug.matchedNodeId ?? "-"),
              toField("overlay-tag", "Element tag", selectedElementDebug.tagName ?? "-"),
              toField("overlay-canonical-matches", "Canonical matches", selectedBindingDebug.canonicalMatches.join(", ") || "-"),
              toField("overlay-source-key", "Source path key", selectedBindingDebug.sourcePathComponentKey ?? "-"),
              toField("overlay-source-matches", "Source matches", selectedBindingDebug.sourcePathMatches.join(", ") || "-"),
              toField("overlay-owner-key", "Owner key", selectedBindingDebug.ownerComponentKey ?? "-"),
              toField("overlay-owner-matches", "Owner matches", selectedBindingDebug.ownerMatches.join(", ") || "-"),
              toField("overlay-component-name", "Component name", selectedBindingDebug.componentName ?? "-"),
              toField("overlay-component-matches", "Component matches", selectedBindingDebug.componentMatches.join(", ") || "-"),
              toField(
                "overlay-rect",
                "Element rect",
                selectedElement
                  ? `${Math.round(selectedElement.getBoundingClientRect().width)}x${Math.round(selectedElement.getBoundingClientRect().height)}`
                  : "-"
              ),
            ],
          },
          {
            id: "debug",
            title: "Debug trace",
            fields: debugEvents.slice(-12).map((entry, index) => toField(`debug-${index}`, `Event ${index + 1}`, entry)),
          },
        ]
      : [];

  const groupedSourceBackedParameters = (() => {
    const output = new Map<string, SourceBackedParameter[]>();
    for (const parameter of sourceBackedParameters) {
      const groupKey = parameter.group || "Parameters";
      const group = output.get(groupKey);
      if (group) group.push(parameter);
      else output.set(groupKey, [parameter]);
    }
    return [...output.entries()];
  })();

  const sourceBackedEmptyStateReason = selectedNode
    ? !selectedNode.sourcePath
      ? "Runtime-only node without canonical source origin."
      : selectedNode.nodeType === "definition"
        ? "Definition node. Select a concrete placement to inspect source-backed values."
        : selectedNode.kind === "container"
          ? "Structural container without literal source-backed values."
          : "No literal or stable read-only source values were extracted for this node."
    : null;

  const bridgeSections = enrichment?.propertySections ?? [];
  const primarySections: InspectorPropertiesSection[] = [];
  const diagnosticSections = [
    ...structureSections,
    ...authoringSections,
    ...semanticSection,
    ...ownershipSection,
    ...bridgeSections,
    ...draftSections,
    ...genericSections,
    ...debugSections,
  ];

  function renderSourceBackedParameterCard(parameter: SourceBackedParameter, options?: { isFirst?: boolean }) {
    const activeDraft = sourceBackedDraftsByParameterId.get(parameter.id) ?? null;
    const sourceBackedBaseValue = parameter.normalizedValue ?? parameter.currentValue ?? "-";
    const displayValue = activeDraft?.normalizedValue ?? parameter.normalizedValue ?? parameter.currentValue ?? "-";
    const displaySourceLocation = parameter.origin.sourceLocation
      ? (() => {
          const match = parameter.origin.sourceLocation.match(/^(.*?):(\d+):(\d+)$/);
          if (!match) return formatInspectorFieldValue("sourceLocation", parameter.origin.sourceLocation);
          const [, pathPart, line, column] = match;
          return `${toDisplaySourcePath(pathPart) ?? pathPart}:${line}:${column}`;
        })()
      : "-";
    const originKindLabel =
      parameter.origin.kind === "jsx-text"
        ? "Text"
        : parameter.origin.kind === "jsx-attr"
          ? "Attribute"
          : parameter.origin.kind === "inline-style"
            ? "Inline style"
            : parameter.origin.kind === "class-name"
              ? "Class name"
              : parameter.origin.kind === "token-ref"
                ? "Token ref"
        : "Expression";
    const supportsExpressionDelta =
      parameter.expressionEditMode === "delta-number" || parameter.expressionEditMode === "delta-length";
    const isEditable = Boolean(parameter.origin.editable && !parameter.readonlyReason);
    const canDraftEdit = isEditable || supportsExpressionDelta || (parameter.origin.kind === "class-name" && parameter.canCreatePlacementOverride);
    const isInfoOpen = openParameterInfoId === parameter.id;
    const selectedSourceNodeId = parameter.sourceNodeId ?? selectedNode?.sourceNodeId ?? selectedNode?.id;

    const upsertDraft = (draftValue: string, explicitTargetScope?: SourceBackedTargetScope) => {
      if (!selectedNode) return;
      if (!draftValue.trim()) {
        if (activeDraft) removeSourceBackedDraftChange(activeDraft.id);
        return;
      }
      const targetScope = explicitTargetScope ?? activeDraft?.targetScope ?? detectSourceBackedTargetScope(parameter);
      const applyStrategy = detectSourceBackedApplyStrategy(parameter, targetScope);
      const editKind = detectSourceBackedEditKind(parameter, targetScope);
      upsertSourceBackedDraftChange({
        parameterId: parameter.id,
        sourceNodeId: selectedSourceNodeId,
        parameterLabel: parameter.label,
        parameterGroup: parameter.group,
        valueKind: parameter.valueKind,
        originKind: parameter.origin.kind,
        origin: parameter.origin,
        currentValue: parameter.normalizedValue ?? parameter.currentValue,
        draftValue,
        normalizedValue: computeSourceBackedNormalizedValue(parameter, draftValue),
        editKind,
        targetScope,
        applyStrategy,
        selector: parameter.selector ?? null,
        cssProperty: parameter.cssProperty ?? null,
        canCreatePlacementOverride: parameter.canCreatePlacementOverride ?? false,
        expressionEditMode: parameter.expressionEditMode ?? null,
        nodeSourcePath: selectedNode.sourcePath ?? null,
        nodeSourceLocation: selectedNode.sourceLocation ?? null,
      });
    };

    const renderEditorControl = () => {
      if (!canDraftEdit) {
        return (
          <div
            onClick={() => copyFieldValue(displayValue)}
            title={displayValue && displayValue !== "-" ? "Click to copy full value" : undefined}
            style={{
              minWidth: 0,
              borderRadius: "10px",
              padding: "10px 12px",
              background: "rgba(7,10,16,0.56)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: "12px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: displayValue && displayValue !== "-" ? "copy" : "default",
              userSelect: "none",
            }}
          >
            {displayValue}
          </div>
        );
      }

      const currentInputValue = activeDraft?.draftValue ?? (supportsExpressionDelta ? "0" : displayValue);
      const numericInputValue =
        parameter.valueKind === "number" || parameter.valueKind === "length"
          ? normalizeDraftNumericInput(currentInputValue)
          : currentInputValue;
      const normalizedColorValue =
        parameter.valueKind === "color" ? normalizeHexColorForInput(currentInputValue) : null;
      const defaultSliderConfig = getSourceBackedSliderConfig(parameter, sourceBackedBaseValue);
      const sliderOverride = sliderOverrides[parameter.id] ?? null;
      const sliderConfig = defaultSliderConfig
        ? {
            min: coerceFiniteNumber(sliderOverride?.min) ?? defaultSliderConfig.min,
            max: coerceFiniteNumber(sliderOverride?.max) ?? defaultSliderConfig.max,
            step: defaultSliderConfig.step,
          }
        : null;
      const prefersNumericInput =
        (parameter.valueKind === "number" || parameter.valueKind === "length") &&
        isNumericInputString(numericInputValue);
      const isSliderSettingsOpen = openSliderSettingsId === parameter.id;
      const hasActiveDraft = Boolean(activeDraft);
      const resetToSourceValue = () => {
        if (activeDraft) removeSourceBackedDraftChange(activeDraft.id);
      };
      const commonStyle: React.CSSProperties = {
        minWidth: 0,
        borderRadius: "10px",
        padding: "10px 12px",
        background: "rgba(7,10,16,0.56)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "inherit",
        fontSize: "12px",
      };

      if (parameter.valueKind === "boolean") {
        return (
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={(activeDraft?.draftValue ?? displayValue) === "true"}
              onChange={(event) => upsertDraft(event.target.checked ? "true" : "false")}
            />
            <span style={{ fontSize: "12px", opacity: 0.8 }}>{(activeDraft?.draftValue ?? displayValue) === "true" ? "true" : "false"}</span>
          </label>
        );
      }

      return (
        <div style={{ display: "grid", gap: 8 }}>
          {(parameter.valueKind === "number" || parameter.valueKind === "length") && !supportsExpressionDelta ? (
            <div style={{ display: "grid", gap: 8 }}>
              {sliderConfig ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 8, alignItems: "center" }}>
                    <input
                      type="range"
                      min={sliderConfig.min}
                      max={sliderConfig.max}
                      step={sliderConfig.step}
                      value={coerceFiniteNumber(numericInputValue) ?? sliderConfig.min}
                      onChange={(event) => upsertDraft(event.target.value)}
                      style={{
                        width: "100%",
                        accentColor: "#8db4ff",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSliderSettingsId((current) => (current === parameter.id ? null : parameter.id))
                      }
                      style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "8px",
                        padding: "6px 8px",
                        background: isSliderSettingsOpen ? "rgba(110, 168, 255, 0.18)" : "transparent",
                        color: "inherit",
                        cursor: "pointer",
                        fontSize: "11px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Range
                    </button>
                    <button
                      type="button"
                      onClick={resetToSourceValue}
                      disabled={!hasActiveDraft}
                      style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "8px",
                        padding: "6px 8px",
                        background: "transparent",
                        color: hasActiveDraft ? "inherit" : "rgba(255,255,255,0.4)",
                        cursor: hasActiveDraft ? "pointer" : "default",
                        fontSize: "11px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Reset
                    </button>
                  </div>
                  {isSliderSettingsOpen ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                        gap: 8,
                      }}
                    >
                      <label style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: "11px", opacity: 0.7 }}>Min</span>
                        <input
                          type="number"
                          step="any"
                          value={sliderOverride?.min ?? String(defaultSliderConfig?.min ?? "")}
                          onChange={(event) =>
                            setSliderOverrides((current) => ({
                              ...current,
                              [parameter.id]: {
                                min: event.target.value,
                                max: current[parameter.id]?.max ?? String(defaultSliderConfig?.max ?? ""),
                              },
                            }))
                          }
                          style={commonStyle}
                        />
                      </label>
                      <label style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: "11px", opacity: 0.7 }}>Max</span>
                        <input
                          type="number"
                          step="any"
                          value={sliderOverride?.max ?? String(defaultSliderConfig?.max ?? "")}
                          onChange={(event) =>
                            setSliderOverrides((current) => ({
                              ...current,
                              [parameter.id]: {
                                min: current[parameter.id]?.min ?? String(defaultSliderConfig?.min ?? ""),
                                max: event.target.value,
                              },
                            }))
                          }
                          style={commonStyle}
                        />
                      </label>
                    </div>
                  ) : null}
                </>
              ) : null}
              <input
                type={prefersNumericInput ? "number" : "text"}
                step={prefersNumericInput ? "any" : undefined}
                value={numericInputValue}
                onChange={(event) => upsertDraft(event.target.value)}
                style={commonStyle}
              />
            </div>
          ) : parameter.valueKind === "color" ? (
            <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 8 }}>
              <input
                type="color"
                value={normalizedColorValue ?? "#000000"}
                onChange={(event) => upsertDraft(event.target.value)}
                style={{
                  width: 44,
                  minWidth: 44,
                  height: 40,
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(7,10,16,0.56)",
                  padding: 4,
                }}
              />
              <input
                type="text"
                value={currentInputValue}
                onChange={(event) => upsertDraft(event.target.value)}
                style={commonStyle}
              />
            </div>
          ) : (
            <input
              type="text"
              value={currentInputValue}
              onChange={(event) => upsertDraft(event.target.value)}
              style={commonStyle}
            />
          )}
          {parameter.origin.kind === "class-name" && parameter.canCreatePlacementOverride ? (
            <select
              value={activeDraft?.targetScope ?? detectSourceBackedTargetScope(parameter)}
              onChange={(event) =>
                upsertDraft(currentInputValue, event.target.value as SourceBackedTargetScope)
              }
              style={{
                ...commonStyle,
                padding: "8px 10px",
              }}
            >
              <option value="shared-style-rule">Edit shared rule</option>
              <option value="placement">Create local override</option>
            </select>
          ) : null}
          {supportsExpressionDelta ? (
            <div style={{ fontSize: "11px", opacity: 0.68 }}>
              Delta preview: {displayValue}
            </div>
          ) : null}
        </div>
      );
    };

    return (
      <div
        key={parameter.id}
        style={{
          display: "grid",
          gap: 10,
          padding: "8px 0",
          borderTop: options?.isFirst ? "none" : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 150px) minmax(0, 1fr) auto", gap: 10, alignItems: "center" }}>
          <div
            style={{
              minWidth: 0,
              fontSize: "12px",
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {parameter.label}
          </div>
          {renderEditorControl()}
          <button
            type="button"
            onClick={() => setOpenParameterInfoId((current) => (current === parameter.id ? null : parameter.id))}
            title="Source details"
            style={{
              width: 26,
              height: 26,
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: isInfoOpen ? "rgba(110, 168, 255, 0.18)" : "rgba(255,255,255,0.04)",
              color: "inherit",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 700,
              padding: 0,
              lineHeight: 1,
            }}
          >
            i
          </button>
        </div>
        {isInfoOpen ? (
          <div
            style={{
              display: "grid",
              gap: 6,
              borderRadius: "10px",
              padding: "10px 12px",
              background: "rgba(7,10,16,0.72)",
              border: "1px solid rgba(255,255,255,0.08)",
              marginLeft: "160px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.68, fontSize: "11px" }}>Status</div>
              <div style={{ minWidth: 0, fontSize: "11px", opacity: 0.88 }}>
                {isEditable
                  ? "Editable source"
                  : supportsExpressionDelta
                    ? "Editable via expression delta"
                    : `Read only${parameter.readonlyReason ? `: ${parameter.readonlyReason}` : ""}`}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.68, fontSize: "11px" }}>Kind</div>
              <div style={{ minWidth: 0, fontSize: "11px", opacity: 0.88 }}>
                {originKindLabel} / {parameter.valueKind}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.68, fontSize: "11px" }}>Apply</div>
              <div style={{ minWidth: 0, fontSize: "11px", opacity: 0.88 }}>
                {activeDraft?.applyStrategy ?? detectSourceBackedApplyStrategy(parameter, activeDraft?.targetScope ?? detectSourceBackedTargetScope(parameter))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.68, fontSize: "11px" }}>Source</div>
              <div
                onClick={() => copyFieldValue(parameter.origin.displaySourcePath ?? parameter.origin.sourcePath)}
                title="Click to copy full value"
                style={{
                  minWidth: 0,
                  fontSize: "11px",
                  opacity: 0.88,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: "copy",
                }}
              >
                {parameter.origin.displaySourcePath ?? toDisplaySourcePath(parameter.origin.sourcePath) ?? parameter.origin.sourcePath}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.68, fontSize: "11px" }}>Location</div>
              <div
                onClick={() => copyFieldValue(displaySourceLocation)}
                title="Click to copy full value"
                style={{
                  minWidth: 0,
                  fontSize: "11px",
                  opacity: 0.88,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: displaySourceLocation !== "-" ? "copy" : "default",
                }}
              >
                {displaySourceLocation}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.68, fontSize: "11px" }}>AST path</div>
              <div
                onClick={() => copyFieldValue(parameter.origin.astPath)}
                title="Click to copy full value"
                style={{
                  minWidth: 0,
                  fontSize: "11px",
                  opacity: 0.88,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: "copy",
                }}
              >
                {parameter.origin.astPath}
              </div>
            </div>
            {activeDraft ? (
              <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
                <div style={{ opacity: 0.68, fontSize: "11px" }}>Draft</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0, fontSize: "11px", opacity: 0.88, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeDraft.draftValue}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSourceBackedDraftChange(activeDraft.id)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      padding: "4px 8px",
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderSection(section: InspectorPropertiesSection, variant: "primary" | "diagnostic" = "primary") {
    const isDiagnostic = variant === "diagnostic";
    return (
      <section
        key={section.id}
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "14px 16px",
          background: isDiagnostic ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.03)",
        }}
      >
        <div style={{ marginBottom: 10, fontWeight: 700 }}>{section.title}</div>
        {section.fields?.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {section.fields.map((field) => {
              const displayValue = formatInspectorFieldValue(field.id, field.value);
              return (
                <div key={field.id} style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
                  <div style={{ opacity: 0.7, fontSize: "12px" }}>{field.label}</div>
                  <div
                    onClick={() => copyFieldValue(displayValue)}
                    title={displayValue && displayValue !== "-" ? "Click to copy full value" : undefined}
                    style={{
                      minWidth: 0,
                      borderRadius: "10px",
                      padding: "8px 10px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      fontSize: "12px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      cursor: displayValue && displayValue !== "-" ? "copy" : "default",
                      userSelect: "none",
                    }}
                  >
                    {displayValue}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {section.actions?.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: section.fields?.length ? 10 : 0 }}>
            {section.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  if (action.disabled) return;
                  if (action.id === "draft-clear" && selectedNode) {
                    clearDraftChangesForNode(selectedNode.sourceNodeId ?? selectedNode.id);
                  }
                }}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  background: "transparent",
                  color: action.disabled ? "rgba(239,246,255,0.5)" : "inherit",
                  cursor: action.disabled ? "not-allowed" : "pointer",
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
        {section.id === "draft" && selectedDraftChanges.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {selectedDraftChanges.map((draft) => (
              <div
                key={draft.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: 10,
                  alignItems: "center",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>
                    {draft.scope} / {draft.group}.{draft.key}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {draft.value} ({draft.status})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeDraftChange(draft.id)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    padding: "6px 8px",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  function TreeNode(props: NodeRendererProps<InspectorNode>) {
    const nodeData = props.node.data;
    const nodeEnrichment = adapter.enrichNode?.(nodeData) ?? null;
    const nodeLabel = nodeEnrichment?.label ?? nodeData.label;
    const nodeRuntimePreview = getNodeRuntimePreviewText(nodeData, getNodeDirectElements(nodeData.id));
    const isMarked = markedNodeIds.has(nodeData.id);
    const kindColor = getKindBadgeColor(nodeData.kind);
    const availability = nodeEnrichment?.meta?.availability;
    const bindingStatus = nodeData.bindingStatus;
    const depth = props.node.level;
    const branchWidth = Math.max(0, depth * 18);
    const hasChildren = (nodeData.children?.length ?? 0) > 0;
    const isSelected = state.selectedNodeId === nodeData.id;
    const isHovered = state.hoveredNodeId === nodeData.id;
    return (
      <div
        ref={props.dragHandle}
        style={{
          ...props.style,
          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: "2px 0",
          padding: "0 10px 0 0",
          borderRadius: "10px",
          color: "#eff6ff",
          background: isSelected
            ? "rgba(110, 168, 255, 0.14)"
            : isHovered
              ? "rgba(255,255,255,0.05)"
              : "transparent",
          boxShadow: isSelected
            ? "inset 0 0 0 1px rgba(110, 168, 255, 0.2)"
            : isHovered
              ? "inset 0 0 0 1px rgba(255,255,255,0.08)"
              : "none",
          cursor: "pointer",
          overflow: "hidden",
        }}
        onClick={() => handleRowSelect(nodeData.id, hasChildren, () => props.node.toggle())}
        onMouseEnter={() => setHoveredNodeId(nodeData.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
      >
        <div
          aria-hidden="true"
          style={{
            width: `${branchWidth}px`,
            alignSelf: "stretch",
            flex: `0 0 ${branchWidth}px`,
            backgroundImage:
              depth > 0
                ? "repeating-linear-gradient(to right, transparent 0, transparent 16px, rgba(255,255,255,0.06) 16px, rgba(255,255,255,0.06) 17px)"
                : "none",
            opacity: 0.75,
          }}
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) {
              setSelectedNodeId(nodeData.id);
              setHoveredNodeId(nodeData.id);
              props.node.toggle();
              toggleNodeExpanded(nodeData.id);
            }
          }}
          style={{
            width: 18,
            border: 0,
            background: "transparent",
            color: "inherit",
            cursor: hasChildren ? "pointer" : "default",
            opacity: hasChildren ? 0.9 : 0,
            fontSize: "11px",
            padding: 0,
            outline: "none",
            visibility: hasChildren ? "visible" : "hidden",
          }}
        >
          {hasChildren ? (props.node.isOpen ? "▾" : "▸") : ""}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 16,
                height: 16,
                color: kindColor,
                fontSize: "10px",
                flex: "0 0 auto",
              }}
            >
              {nodeData.kind === "semantic" ? "S" : nodeData.tagName.slice(0, 1).toUpperCase()}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {nodeLabel}
              </div>
              {nodeRuntimePreview ? (
                <div
                  style={{
                    marginTop: 1,
                    fontSize: "11px",
                    opacity: 0.72,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  “{nodeRuntimePreview}”
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: "10px", opacity: 0.66, textTransform: "uppercase", letterSpacing: "0.06em" }}>{nodeData.tagName}</span>
            {availability ? (
              <span
                style={{
                  fontSize: "9px",
                  opacity: 0.72,
                  padding: "1px 6px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {String(availability)}
              </span>
            ) : null}
            {bindingStatus ? (
              <span
                style={{
                  fontSize: "9px",
                  opacity: 0.72,
                  padding: "1px 6px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    bindingStatus === "bound"
                      ? "rgba(124,247,198,0.1)"
                      : bindingStatus === "multiple"
                        ? "rgba(255,216,118,0.1)"
                        : "rgba(255,255,255,0.04)",
                }}
              >
                {bindingStatus}
              </span>
            ) : null}
            {nodeData.nodeType === "repeated-group" ? (
              <span
                style={{
                  fontSize: "9px",
                  opacity: 0.8,
                  padding: "1px 6px",
                  borderRadius: "999px",
                  border: "1px solid rgba(124,247,198,0.18)",
                  background: "rgba(124,247,198,0.1)",
                }}
              >
                x{nodeData.projectionCount}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleNodeMarked(nodeData.id);
          }}
          style={{
            width: 26,
            height: 26,
            borderRadius: "6px",
            border: 0,
            background: "transparent",
            color: isMarked ? "#ffd876" : "inherit",
            cursor: "pointer",
            flex: "0 0 auto",
            opacity: isMarked ? 1 : 0.58,
            outline: "none",
          }}
        >
          {isMarked ? "★" : "+"}
        </button>
      </div>
    );
  }

  return (
    <aside
      ref={shellRef}
      className="workbenchInspectorShell"
      aria-label="Workbench inspector"
      data-workbench-inspector-shell="true"
      data-workbench-inspector-sidebar="foundation"
      style={{
        ...shellStyle,
        width: `${panelWidth}px`,
        height: `${panelHeight}px`,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "calc(100vh - 24px)",
        overflow: "hidden",
        padding: "14px",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "linear-gradient(180deg, rgba(23, 28, 38, 0.98), rgba(13, 17, 24, 0.98))",
        boxShadow: "0 30px 80px rgba(0, 0, 0, 0.42)",
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .workbenchInspectorShell .workbenchInspectorScroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(150, 186, 255, 0.88) rgba(10, 14, 26, 0.72);
        }
        .workbenchInspectorShell .workbenchInspectorScroll::-webkit-scrollbar {
          width: 11px;
          height: 11px;
        }
        .workbenchInspectorShell .workbenchInspectorScroll::-webkit-scrollbar-track {
          background: linear-gradient(180deg, rgba(15, 22, 40, 0.94), rgba(12, 16, 32, 0.9));
          border-radius: 999px;
          border: 1px solid rgba(108, 136, 210, 0.18);
        }
        .workbenchInspectorShell .workbenchInspectorScroll::-webkit-scrollbar-thumb {
          background:
            linear-gradient(180deg, rgba(187, 219, 255, 0.96) 0%, rgba(114, 160, 255, 0.94) 42%, rgba(174, 130, 255, 0.95) 100%);
          border-radius: 999px;
          border: 2px solid rgba(10, 14, 26, 0.82);
          box-shadow:
            0 0 10px rgba(126, 188, 255, 0.34),
            0 0 18px rgba(171, 137, 255, 0.18);
        }
        .workbenchInspectorShell .workbenchInspectorScroll::-webkit-scrollbar-thumb:hover {
          background:
            linear-gradient(180deg, rgba(205, 230, 255, 0.98) 0%, rgba(136, 182, 255, 0.96) 45%, rgba(189, 152, 255, 0.97) 100%);
          box-shadow:
            0 0 12px rgba(126, 188, 255, 0.55),
            0 0 20px rgba(171, 137, 255, 0.24);
        }
      `}</style>
      <div ref={headerRef} style={{ display: "flex", justifyContent: "space-between", gap: 16, flex: "0 0 auto" }}>
        <div onPointerDown={beginDrag} style={{ flex: 1, cursor: dragState ? "grabbing" : "grab", userSelect: "none" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.65 }}>
            Workbench Inspector
          </div>
          <strong style={{ fontSize: "15px" }}>{mergedLabel}</strong>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {state.debug ? (
            <span
              style={{
                borderRadius: "999px",
                padding: "8px 12px",
                background: "rgba(255, 209, 102, 0.16)",
                color: "#ffd166",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              Debug on
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setFocusMode("all")}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "999px",
              padding: "8px 12px",
              background: state.hierarchy.focusMode === "all" ? "rgba(110, 168, 255, 0.18)" : "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFocusMode("marked")}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "999px",
              padding: "8px 12px",
              background: state.hierarchy.focusMode === "marked" ? "rgba(255, 216, 118, 0.18)" : "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Focus
          </button>
          <button
            type="button"
            onClick={() => setPickMode(state.pickMode === "on" ? "off" : "on")}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "999px",
              padding: "8px 12px",
              background: state.pickMode === "on" ? "rgba(124, 247, 198, 0.18)" : "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Pick mode {state.pickMode === "on" ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={() => refreshNodes()}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "999px",
              padding: "8px 12px",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Refresh tree
          </button>
          <button
            type="button"
            onClick={() =>
              setTreeFilterMode(
                state.hierarchy.treeFilterMode === "smart"
                  ? "all"
                  : state.hierarchy.treeFilterMode === "all"
                    ? "repeated"
                    : "smart"
              )
            }
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "999px",
              padding: "8px 12px",
              background:
                state.hierarchy.treeFilterMode !== "all" ? "rgba(164, 145, 255, 0.18)" : "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            {state.hierarchy.treeFilterMode === "smart"
              ? "Meaningful components"
              : state.hierarchy.treeFilterMode === "all"
                ? "All registered nodes"
                : "Cycles only"}
          </button>
          {hasAnySourceBackedDraftChanges ? (
            <button
              type="button"
              onClick={() => setShowDraftReview((current) => !current)}
              style={{
                border: "1px solid rgba(132, 243, 207, 0.2)",
                borderRadius: "999px",
                padding: "8px 12px",
                background: showDraftReview ? "rgba(132, 243, 207, 0.16)" : "rgba(132, 243, 207, 0.08)",
                color: "rgba(235, 255, 247, 0.92)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              Drafts pending: {sourceBackedDraftChanges.length}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            style={{
              border: 0,
              borderRadius: "999px",
              padding: "8px 12px",
              background: "rgba(255,255,255,0.08)",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Collapse
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${treePaneWidth}px 14px minmax(${detailsPaneWidth}px, 1fr)`,
          gap: 0,
          minHeight: 0,
          height: `${bodyHeight}px`,
          flex: "1 1 auto",
        }}
      >
        <section
          style={{
            minWidth: 0,
            minHeight: 0,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            paddingRight: 12,
            background: "rgba(255,255,255,0.02)",
            borderRadius: "16px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div ref={leftChromeRef} style={{ flex: "0 0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>Layers</div>
              <div style={{ fontSize: "12px", opacity: 0.75 }}>
                {state.hierarchy.focusMode === "marked" && !focusFilteredRootNodes.length
                  ? "Fallback to all nodes"
                  : state.hierarchy.focusMode === "marked"
                    ? "Focused nodes"
                    : "All visible nodes"}
              </div>
            </div>
            <div style={{ fontSize: "11px", opacity: 0.55, alignSelf: "end", textAlign: "right" }}>
              <div>
                {state.hierarchy.treeFilterMode === "smart"
                  ? "Meaningful components"
                  : state.hierarchy.treeFilterMode === "all"
                    ? "All registered nodes"
                    : "Cycles only"}
              </div>
              <div>{visibleNodeCount} nodes</div>
            </div>
          </div>
          <input
            type="text"
            value={state.hierarchy.query}
            onChange={(event) => setHierarchyQuery(event.target.value)}
            placeholder="Search components"
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginBottom: 10,
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(7,10,16,0.56)",
              color: "inherit",
              padding: "10px 12px",
            }}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              fontSize: "12px",
              opacity: 0.82,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={state.hierarchy.hideInvisible}
              onChange={(event) => setHideInvisible(event.target.checked)}
            />
            Hide invisible
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              fontSize: "12px",
              opacity: 0.82,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={state.hierarchy.autoRefreshTree}
              onChange={(event) => setAutoRefreshTree(event.target.checked)}
            />
            Auto-refresh tree
          </label>
          {treeFallbackReason ? (
            <div
              style={{
                marginBottom: 10,
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                padding: "8px 10px",
                fontSize: "12px",
                opacity: 0.82,
              }}
            >
              {treeFallbackReason}
            </div>
          ) : null}
          </div>
          <div className="workbenchInspectorScroll" style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", paddingRight: 2 }}>
          {filteredRootNodes.length ? (
            <Tree<InspectorNode>
              ref={treeRef}
              key={`${state.hierarchy.treeFilterMode}:${state.hierarchy.hideInvisible ? "visible" : "all"}:${state.hierarchy.focusMode}`}
              data={filteredRootNodes}
              width={Math.max(240, treePaneWidth - 12)}
              height={treeHeight}
              indent={20}
              rowHeight={64}
              overscanCount={8}
              padding={0}
              searchTerm={state.hierarchy.query}
              searchMatch={(node, searchTerm) =>
                node.data.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                node.data.tagName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (adapter.enrichNode?.(node.data)?.label ?? "").toLowerCase().includes(searchTerm.toLowerCase())
              }
              childrenAccessor="children"
              idAccessor="id"
              initialOpenState={Object.fromEntries(state.hierarchy.expandedNodeIds.map((id) => [id, true]))}
            >
              {TreeNode}
            </Tree>
          ) : (
            <div
              className="workbenchInspectorScroll"
              style={{
                display: "grid",
                gap: 10,
                alignContent: "start",
                minHeight: treeHeight,
                paddingTop: 8,
                overflow: "auto",
              }}
            >
              <div
                style={{
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  padding: "10px 12px",
                  fontSize: "12px",
                  opacity: 0.82,
                }}
              >
                No nodes match the current inspector filters.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {state.hierarchy.hideInvisible ? (
                  <button
                    type="button"
                    onClick={() => setHideInvisible(false)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      padding: "8px 10px",
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    Show invisible
                  </button>
                ) : null}
                {state.hierarchy.focusMode === "marked" ? (
                  <button
                    type="button"
                    onClick={() => setFocusMode("all")}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      padding: "8px 10px",
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    Show all nodes
                  </button>
                ) : null}
                {state.hierarchy.treeFilterMode !== "all" ? (
                  <button
                    type="button"
                    onClick={() => setTreeFilterMode("all")}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      padding: "8px 10px",
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    All registered nodes
                  </button>
                ) : null}
              </div>
            </div>
          )}
          </div>
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={beginTreePaneResize}
          style={{
            width: "14px",
            cursor: "col-resize",
            position: "relative",
            userSelect: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "6px",
              top: "10px",
              bottom: "10px",
              width: "2px",
              borderRadius: "999px",
              background: resizeState?.kind === "tree" ? "rgba(110, 168, 255, 0.8)" : "rgba(255,255,255,0.12)",
            }}
          />
        </div>

        <section className="workbenchInspectorScroll" style={{ minWidth: 0, minHeight: 0, overflow: "auto", paddingRight: 4, paddingLeft: 14 }}>
          {selectedNode ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => toggleNodeMarked(selectedNode.id)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: "12px",
                    padding: "8px 12px",
                    background: markedNodeIds.has(selectedNode.id) ? "rgba(255, 216, 118, 0.16)" : "transparent",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  {markedNodeIds.has(selectedNode.id) ? "Unmark important" : "Mark important"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const element = selectedElement;
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
                    }
                  }}
                  style={{
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: "12px",
                    padding: "8px 12px",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  Reveal on page
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(selectedNode.id);
                  }}
                  style={{
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: "12px",
                    padding: "8px 12px",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  Copy node id
                </button>
                {hasAnySourceBackedDraftChanges ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowDraftReview((current) => !current)}
                      style={{
                        border: "1px solid rgba(255,255,255,0.14)",
                        borderRadius: "12px",
                        padding: "8px 12px",
                        background: showDraftReview ? "rgba(110, 168, 255, 0.16)" : "transparent",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      Review changes
                    </button>
                    <button
                      type="button"
                      onClick={() => discardSourceBackedDraftChanges()}
                      style={{
                        border: "1px solid rgba(255,255,255,0.14)",
                        borderRadius: "12px",
                        padding: "8px 12px",
                        background: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      Discard drafts
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void applySourceBackedDraftChanges();
                      }}
                      style={{
                        border: 0,
                        borderRadius: "12px",
                        padding: "8px 12px",
                        background: "linear-gradient(135deg, rgba(132, 243, 207, 0.92), rgba(110, 168, 255, 0.92))",
                        color: "#08101d",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Apply all
                    </button>
                  </>
                ) : null}
                {selectedNode && canOpenInWorkbench ? (
                  <button
                    type="button"
                    onClick={() => adapter.openNodeInWorkbench?.(selectedNode)}
                    style={{
                      border: 0,
                      borderRadius: "12px",
                      padding: "8px 12px",
                      background: "linear-gradient(135deg, #84f3cf, #6ea8ff)",
                      color: "#08101d",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Open in Workbench
                  </button>
                ) : null}
              </div>

              {selectedNode ? (
                sourceBackedParameters.length ? (
                  groupedSourceBackedParameters.map(([groupTitle, parameters]) => (
                    <section
                      key={`source-backed-${groupTitle}`}
                      style={{
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "16px",
                        padding: "14px 16px",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div style={{ marginBottom: 10, fontWeight: 700 }}>{groupTitle}</div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {parameters.map((parameter, index) =>
                          renderSourceBackedParameterCard(parameter, { isFirst: index === 0 })
                        )}
                      </div>
                    </section>
                  ))
                ) : (
                  <section
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "16px",
                      padding: "14px 16px",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div style={{ marginBottom: 8, fontWeight: 700 }}>Parameters</div>
                    <div style={{ fontSize: "12px", opacity: 0.76 }}>
                      No source-backed parameters for this node.
                    </div>
                    <div style={{ marginTop: 6, fontSize: "12px", opacity: 0.6 }}>
                      {sourceBackedEmptyStateReason}
                    </div>
                  </section>
                )
              ) : null}
              {showDraftReview && hasAnySourceBackedDraftChanges ? (
                <section
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>Draft review</div>
                      <div style={{ marginTop: 4, fontSize: "11px", opacity: 0.68 }}>
                        {sourceBackedDraftChanges.length} pending draft{sourceBackedDraftChanges.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void applySourceBackedDraftChanges();
                      }}
                      style={{
                        border: 0,
                        borderRadius: "10px",
                        padding: "6px 10px",
                        background: "linear-gradient(135deg, rgba(132, 243, 207, 0.92), rgba(110, 168, 255, 0.92))",
                        color: "#08101d",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      Apply all
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {sourceBackedDraftGroups.map((group) => (
                      <div key={group.sourcePath} style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: "11px", opacity: 0.68 }}>
                          {group.sourcePath}
                        </div>
                        {group.entries.map((draft) => (
                          <div
                            key={draft.id}
                            onClick={() => {
                              const targetNode =
                                sourceNodesBySourceNodeId.get(draft.sourceNodeId) ?? getNodeById(draft.sourceNodeId);
                              if (targetNode) {
                                revealNodeInTreeAndPage(targetNode.id);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                const targetNode =
                                  sourceNodesBySourceNodeId.get(draft.sourceNodeId) ?? getNodeById(draft.sourceNodeId);
                                if (targetNode) {
                                  revealNodeInTreeAndPage(targetNode.id);
                                }
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            style={{
                              display: "grid",
                              gap: 6,
                              borderRadius: "12px",
                              padding: "10px 12px",
                              background: "rgba(7,10,16,0.42)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              width: "100%",
                              textAlign: "left",
                              color: "inherit",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                              <div style={{ fontSize: "12px", fontWeight: 700 }}>{draft.parameterLabel}</div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void applySourceBackedDraftChanges([draft.id]);
                                  }}
                                  style={{
                                    border: "1px solid rgba(132, 243, 207, 0.26)",
                                    borderRadius: "8px",
                                    padding: "4px 8px",
                                    background: "rgba(132, 243, 207, 0.12)",
                                    color: "inherit",
                                    cursor: "pointer",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    discardSourceBackedDraftIds([draft.id]);
                                  }}
                                  style={{
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    borderRadius: "8px",
                                    padding: "4px 8px",
                                    background: "transparent",
                                    color: "inherit",
                                    cursor: "pointer",
                                    fontSize: "11px",
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: "12px", opacity: 0.84 }}>
                              {draft.currentValue} → {draft.normalizedValue ?? draft.draftValue}
                            </div>
                            <div style={{ fontSize: "11px", opacity: 0.64 }}>
                              {draft.targetScope} / {draft.applyStrategy}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {sourceBackedApplyResult ? (
                    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                      <div style={{ fontSize: "12px", fontWeight: 700 }}>
                        {sourceBackedApplyResult.ok ? "Apply result" : "Apply issues"}
                      </div>
                      {sourceBackedApplyResult.issues.length ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {sourceBackedApplyResult.issues.map((issue) => (
                            <div key={`${issue.draftId}:${issue.parameterId}`} style={{ fontSize: "11px", opacity: 0.78 }}>
                              {issue.message}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {sourceBackedApplyResult.patches.length ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {sourceBackedApplyResult.patches.map((patch) => (
                            <div key={patch.id} style={{ fontSize: "11px", opacity: 0.72 }}>
                              {toDisplaySourcePath(patch.sourcePath) ?? patch.sourcePath}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : null}
              {primarySections.map((section) => renderSection(section, "primary"))}
              {(state.debug || diagnosticSections.length > 0) ? (
                <section
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics((current) => !current)}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: 0,
                      background: "transparent",
                      color: "inherit",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>Diagnostics</span>
                    <span style={{ fontSize: "12px", opacity: 0.72 }}>{showDiagnostics ? "Hide" : "Show"}</span>
                  </button>
                  {showDiagnostics ? (
                    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                      {diagnosticSections.map((section) => renderSection(section, "diagnostic"))}
                    </div>
                  ) : (
                    <div style={{ marginTop: 8, fontSize: "12px", opacity: 0.72 }}>
                      Raw node fields, binding diagnostics, overlay state and debug trace.
                    </div>
                  )}
                </section>
              ) : null}
            </div>
          ) : (
            <div style={{ opacity: 0.72 }}>
              Select a React node from the tree or turn pick mode on and choose an element on the page.
            </div>
          )}
        </section>
      </div>
      <div
        aria-hidden="true"
        onPointerDown={beginPanelResize}
        style={{
          position: "absolute",
          right: 6,
          bottom: 6,
          width: 18,
          height: 18,
          cursor: "nwse-resize",
          borderRadius: "8px",
          background:
            resizeState?.kind === "panel"
              ? "linear-gradient(135deg, rgba(110, 168, 255, 0.55), rgba(124, 247, 198, 0.55))"
              : "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.18))",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
        }}
      />
    </aside>
  );
}
