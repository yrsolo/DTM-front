import React from "react";
import { Tree, type NodeApi, type NodeRendererProps } from "react-arborist";

import type { DraftChangeScope, InspectorNode, InspectorPropertiesSection, InspectorPropertyField } from "../contracts/types";
import { useInspectorContext } from "../runtime/InspectorContext";
import { resolveAuthoringInput } from "../utils/authoringValueSemantics";

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

function hasRenderableBounds(node: InspectorNode): boolean {
  if (!node.bounds) return false;
  return node.bounds.width > 0 && node.bounds.height > 0;
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

function filterNodesForVisibleOnly(nodes: InspectorNode[]): InspectorNode[] {
  if (!hasAnyRuntimeVisibilityData(nodes)) return nodes;

  const filter = (input: InspectorNode[], ancestorRenderable: boolean): InspectorNode[] => {
    const output: InspectorNode[] = [];
    for (const node of input) {
      const hasRuntimeVisibilitySignal = node.projectionCount > 0 || node.bounds != null;
      const nodeIsRenderable =
        (node.projectionCount > 1) ||
        (hasRuntimeVisibilitySignal && node.isVisible && (node.projectionCount > 0 || hasRenderableBounds(node)));
      const nextAncestorRenderable = ancestorRenderable || nodeIsRenderable;
      const children = filter(node.children ?? [], nextAncestorRenderable);
      const keepBecauseOfVisibleAncestor =
        ancestorRenderable &&
        (node.children?.length ?? 0) === 0 &&
        node.nodeType !== "definition" &&
        (node.kind === "text" || node.kind === "image" || node.kind === "control");
      const keepBecauseOfRepeatedStructure =
        ancestorRenderable && node.nodeType !== "definition" && (node.kind === "text" || node.kind === "image");
      if (!nodeIsRenderable && !children.length && !keepBecauseOfVisibleAncestor && !keepBecauseOfRepeatedStructure) continue;
      output.push({ ...node, children });
    }
    return output;
  };
  return filter(nodes, false);
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

export function InspectorSidebar() {
  const {
    adapter,
    allRootNodes,
    debugEvents,
    draftChanges,
    clearDraftChangesForNode,
    getNodeById,
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
    state,
    toggleNodeExpanded,
    toggleNodeMarked,
    upsertDraftChange,
    removeDraftChange,
  } = useInspectorContext();
  const [dragState, setDragState] = React.useState<DragState | null>(null);
  const [resizeState, setResizeState] = React.useState<ResizeState | null>(null);
  const [parameterInputValues, setParameterInputValues] = React.useState<Record<string, string>>({});
  const shellRef = React.useRef<HTMLElement | null>(null);
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const leftChromeRef = React.useRef<HTMLDivElement | null>(null);
  const [bodyHeight, setBodyHeight] = React.useState(320);
  const [leftChromeHeight, setLeftChromeHeight] = React.useState(120);

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
    ? filterNodesForVisibleOnly(repeatedFilterFallbackRootNodes)
    : repeatedFilterFallbackRootNodes;
  const runtimeVisibilityFallbackRootNodes =
    state.hierarchy.hideInvisible && !visibilityFilteredRootNodes.length
      ? repeatedFilterFallbackRootNodes
      : visibilityFilteredRootNodes;
  const nodesById = buildNodeIndex(runtimeVisibilityFallbackRootNodes);
  const markedNodeIds = new Set(state.hierarchy.markedNodeIds);
  const focusFilteredRootNodes = filterNodesForFocus(
    runtimeVisibilityFallbackRootNodes,
    nodesById,
    markedNodeIds,
    state.hierarchy.focusMode
  );
  const filteredRootNodes =
    state.hierarchy.focusMode === "marked" && !focusFilteredRootNodes.length
      ? runtimeVisibilityFallbackRootNodes
      : focusFilteredRootNodes;
  const treeFallbackReason =
    state.hierarchy.treeFilterMode === "repeated" && !visibleTreeRootNodes.length
      ? "Cycles only found no nodes, showing all registered nodes."
      : state.hierarchy.hideInvisible && !visibilityFilteredRootNodes.length
      ? "Hide invisible hidden all nodes, showing the broader tree."
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
  const parameterDescriptors = selectedNode ? adapter.getParameterDescriptors?.(selectedNode) ?? [] : [];
  const effectivePreviewValues =
    selectedNode ? adapter.getEffectivePreviewValues?.(selectedNode, draftChanges) ?? [] : [];
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
    if (!selectedNode) return;
    setParameterInputValues((current) => {
      let changed = false;
      const next = { ...current };
      for (const descriptor of parameterDescriptors) {
        if (next[descriptor.id] != null) continue;
        const effective = effectivePreviewValues.find((item) => item.parameterId === descriptor.id);
        next[descriptor.id] = effective?.value ?? "";
        changed = true;
      }
      return changed ? next : current;
    });
  }, [effectivePreviewValues, parameterDescriptors, selectedNode]);

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

  const createDraftChange = (scope: DraftChangeScope, parameterId?: string) => {
    if (!selectedNode) return;
    if (!previewCapabilities[scope]) return;
    const sourceNodeId = selectedNode.sourceNodeId ?? selectedNode.id;
    const descriptor = parameterId ? parameterDescriptors.find((item) => item.id === parameterId) ?? null : parameterDescriptors[0] ?? null;
    const controlKey = String(descriptor?.meta?.controlKey ?? "demo");
    const effective = descriptor ? effectivePreviewValues.find((item) => item.parameterId === descriptor.id) : null;
    const rawInput = descriptor ? parameterInputValues[descriptor.id] ?? effective?.normalizedValue ?? effective?.value ?? "" : mergedLabel;
    const resolution = descriptor ? resolveAuthoringInput(descriptor, rawInput) : { normalizedValue: rawInput, state: "valid" as const, message: null };
    upsertDraftChange({
      sourceNodeId,
      scope,
      group: descriptor?.group ?? (selectedNode.kind === "control" ? "controls" : "appearance"),
      key: controlKey,
      value: resolution.normalizedValue ?? rawInput,
      status:
        resolution.state === "invalid"
          ? "invalid"
          : resolution.state === "unresolved"
            ? "unresolved"
            : "active",
    });
  };

  const genericSections: InspectorPropertiesSection[] = selectedNode
    ? [
        {
          id: "node",
          title: "Node",
          fields: [
            toField("label", "Label", mergedLabel),
            toField("nodeType", "Node type", selectedNode.nodeType),
            toField("componentName", "Component", selectedNode.componentName ?? null),
            toField("sourceNodeId", "Source node", selectedNode.sourceNodeId ?? selectedNode.id),
            toField("sourceCategory", "Source category", selectedNode.sourceCategory ?? null),
            toField("bindingKey", "Binding key", selectedNode.bindingKey ?? null),
            toField("bindingStatus", "Binding status", selectedNode.bindingStatus ?? null),
            toField("projectionCount", "Projection count", selectedNode.projectionCount),
            toField("runtimeProjectionCount", "Runtime projections", selectedNode.runtimeProjectionCount ?? 0),
            toField("definitionId", "Definition", selectedNode.definitionId ?? null),
            toField("placementId", "Placement", selectedNode.placementId ?? null),
            toField("repeatedGroupId", "Repeated group", selectedNode.repeatedGroupId ?? null),
            toField("runtimeId", "Runtime id", selectedNode.runtimeId ?? selectedNode.id),
            toField("kind", "Kind", selectedNode.kind),
            toField("tag", "Anchor tag", selectedNode.tagName),
            toField("path", "Path", selectedNode.path),
            toField("ownerPath", "Owner path", selectedNode.ownerPath ?? null),
            toField("sourcePath", "Source path", selectedNode.sourcePath ?? null),
            toField("sourceLocation", "Source location", selectedNode.sourceLocation ?? null),
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
              toField("parameterCount", "Parameters", parameterDescriptors.length),
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

  const parameterSections: InspectorPropertiesSection[] =
    selectedNode && parameterDescriptors.length
      ? [
          {
            id: "parameters",
            title: "Parameters",
            fields: parameterDescriptors.map((descriptor) => {
              const effective = effectivePreviewValues.find((item) => item.parameterId === descriptor.id);
              return toField(
                descriptor.id,
                descriptor.label,
                `${effective?.value ?? "-"} (${effective?.resolvedFrom ?? "base"})`
              );
            }),
          },
        ]
      : [];

  const bridgeSections = enrichment?.propertySections ?? [];
  const allSections = [...genericSections, ...authoringSections, ...draftSections, ...parameterSections, ...semanticSection, ...ownershipSection, ...bridgeSections, ...debugSections];

  function TreeNode(props: NodeRendererProps<InspectorNode>) {
    const nodeData = props.node.data;
    const nodeEnrichment = adapter.enrichNode?.(nodeData) ?? null;
    const nodeLabel = nodeEnrichment?.label ?? nodeData.label;
    const nodeRuntimePreview = getNodeRuntimePreviewText(nodeData, getNodeElements(nodeData.id));
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

              {allSections.map((section) => (
                <section
                  key={section.id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ marginBottom: 10, fontWeight: 700 }}>{section.title}</div>
                  {section.fields?.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {section.fields.map((field) => (
                        <div key={field.id} style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
                          <div style={{ opacity: 0.7, fontSize: "12px" }}>{field.label}</div>
                          <div
                            onClick={() => copyFieldValue(field.value)}
                            title={field.value && field.value !== "-" ? "Click to copy full value" : undefined}
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
                              cursor: field.value && field.value !== "-" ? "copy" : "default",
                              userSelect: "none",
                            }}
                          >
                            {field.value}
                          </div>
                        </div>
                      ))}
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
                            if (action.id === "draft-token") createDraftChange("token");
                            else if (action.id === "draft-component") createDraftChange("component");
                            else if (action.id === "draft-placement") createDraftChange("placement");
                            else if (action.id === "draft-instance") createDraftChange("instance-preview");
                            else if (action.id === "draft-clear" && selectedNode) {
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
                  {section.id === "parameters" && parameterDescriptors.length ? (
                    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                      {parameterDescriptors.map((descriptor) => {
                        const effective = effectivePreviewValues.find((item) => item.parameterId === descriptor.id);
                        const draftsForParameter = selectedDraftChanges.filter(
                          (entry) => entry.key === String(descriptor.meta?.controlKey ?? "")
                        );
                        const inputType =
                          descriptor.valueKind === "number" || descriptor.valueKind === "length"
                            ? "number"
                            : descriptor.valueKind === "color"
                              ? "color"
                              : "text";
                        const inputValue = parameterInputValues[descriptor.id] ?? effective?.value ?? "";
                        return (
                          <div
                            key={descriptor.id}
                            style={{
                              display: "grid",
                              gap: 8,
                              borderRadius: "10px",
                              padding: "10px",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "12px", fontWeight: 600 }}>{descriptor.label}</div>
                                <div style={{ fontSize: "11px", opacity: 0.7 }}>
                                  {descriptor.valueKind} / {effective?.resolvedFrom ?? "base"} / {effective?.value ?? "-"}
                                </div>
                              </div>
                              <div style={{ fontSize: "11px", opacity: 0.65, textAlign: "right" }}>{descriptor.group}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: "11px", opacity: 0.72 }}>
                              {typeof descriptor.min === "number" || typeof descriptor.max === "number" ? (
                                <span>
                                  range: {descriptor.min ?? "-"} .. {descriptor.max ?? "-"}
                                </span>
                              ) : null}
                              {typeof descriptor.step === "number" ? <span>step: {descriptor.step}</span> : null}
                              {descriptor.unit ? <span>unit: {descriptor.unit}</span> : null}
                              <span>state: {effective?.state ?? "unresolved"}</span>
                            </div>
                            <input
                              type={inputType}
                              value={inputValue}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                setParameterInputValues((current) => ({
                                  ...current,
                                  [descriptor.id]: nextValue,
                                }));
                              }}
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                borderRadius: "8px",
                                border: "1px solid rgba(255,255,255,0.12)",
                                background: "rgba(7,10,16,0.56)",
                                color: "inherit",
                                padding: "8px 10px",
                                fontSize: "12px",
                              }}
                            />
                            {effective?.message ? (
                              <div style={{ fontSize: "11px", opacity: 0.68 }}>{effective.message}</div>
                            ) : null}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                disabled={!previewCapabilities.placement}
                                onClick={() => createDraftChange("placement", descriptor.id)}
                                style={{
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  borderRadius: "8px",
                                  padding: "6px 8px",
                                  background: "transparent",
                                  color: previewCapabilities.placement ? "inherit" : "rgba(239,246,255,0.5)",
                                  cursor: previewCapabilities.placement ? "pointer" : "not-allowed",
                                  fontSize: "11px",
                                }}
                              >
                                Placement draft
                              </button>
                              <button
                                type="button"
                                disabled={!previewCapabilities.component}
                                onClick={() => createDraftChange("component", descriptor.id)}
                                style={{
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  borderRadius: "8px",
                                  padding: "6px 8px",
                                  background: "transparent",
                                  color: previewCapabilities.component ? "inherit" : "rgba(239,246,255,0.5)",
                                  cursor: previewCapabilities.component ? "pointer" : "not-allowed",
                                  fontSize: "11px",
                                }}
                              >
                                Component draft
                              </button>
                              <button
                                type="button"
                                disabled={!previewCapabilities.token}
                                onClick={() => createDraftChange("token", descriptor.id)}
                                style={{
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  borderRadius: "8px",
                                  padding: "6px 8px",
                                  background: "transparent",
                                  color: previewCapabilities.token ? "inherit" : "rgba(239,246,255,0.5)",
                                  cursor: previewCapabilities.token ? "pointer" : "not-allowed",
                                  fontSize: "11px",
                                }}
                              >
                                Token draft
                              </button>
                            </div>
                            {draftsForParameter.length ? (
                              <div style={{ fontSize: "11px", opacity: 0.68 }}>
                                Drafts: {draftsForParameter.map((draft) => `${draft.scope}=${draft.value}`).join(" • ")}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
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
              ))}
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
