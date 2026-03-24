import React from "react";
import { Tree, type NodeApi, type NodeRendererProps } from "react-arborist";

import type { InspectorNode, InspectorPropertiesSection, InspectorPropertyField } from "../contracts/types";
import { useInspectorContext } from "../runtime/InspectorContext";

type DragState = {
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
};

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

export function InspectorSidebar() {
  const {
    adapter,
    getNodeById,
    getNodeElement,
    rootNodes,
    setFocusMode,
    setHierarchyQuery,
    setHoveredNodeId,
    setPanelOpen,
    setPanelPosition,
    setPickMode,
    setSelectedNodeId,
    setTreeFilterMode,
    state,
    toggleNodeExpanded,
    toggleNodeMarked,
  } = useInspectorContext();
  const [dragState, setDragState] = React.useState<DragState | null>(null);

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

  const shellStyle: React.CSSProperties = {
    position: "fixed",
    left: `${state.panelPosition.x}px`,
    top: `${state.panelPosition.y}px`,
    zIndex: 9999,
    color: "#eff6ff",
  };

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

  const nodesById = buildNodeIndex(rootNodes);
  const markedNodeIds = new Set(state.hierarchy.markedNodeIds);
  const filteredRootNodes = filterNodesForFocus(rootNodes, nodesById, markedNodeIds, state.hierarchy.focusMode);
  const selectedNode = getNodeById(state.selectedNodeId);
  const selectedElement = getNodeElement(state.selectedNodeId);
  const enrichment = selectedNode ? adapter.enrichNode?.(selectedNode) ?? null : null;
  const canOpenInWorkbench = selectedNode ? (adapter.canOpenNodeInWorkbench?.(selectedNode) ?? false) : false;
  const mergedLabel = enrichment?.label ?? selectedNode?.label ?? "No node selected";

  const genericSections: InspectorPropertiesSection[] = selectedNode
    ? [
        {
          id: "node",
          title: "Node",
          fields: [
            toField("label", "Label", mergedLabel),
            toField("id", "Node id", selectedNode.id),
            toField("kind", "Kind", selectedNode.kind),
            toField("tag", "Tag", selectedNode.tagName),
            toField("path", "Path", selectedNode.path),
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

  const bridgeSections = enrichment?.propertySections ?? [];
  const allSections = [...genericSections, ...semanticSection, ...ownershipSection, ...bridgeSections];

  const treeHeight =
    typeof window !== "undefined" ? Math.max(360, Math.min(720, window.innerHeight - state.panelPosition.y - 160)) : 520;

  function TreeNode(props: NodeRendererProps<InspectorNode>) {
    const nodeData = props.node.data;
    const nodeEnrichment = adapter.enrichNode?.(nodeData) ?? null;
    const nodeLabel = nodeEnrichment?.label ?? nodeData.label;
    const isMarked = markedNodeIds.has(nodeData.id);
    const kindColor = getKindBadgeColor(nodeData.kind);
    const availability = nodeEnrichment?.meta?.availability;
    const depth = props.node.level;
    const branchWidth = Math.max(0, depth * 18);
    const hasChildren = (nodeData.children?.length ?? 0) > 0;
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
          background: props.node.isSelected ? "rgba(110, 168, 255, 0.14)" : "transparent",
          cursor: "pointer",
          overflow: "hidden",
        }}
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
        <div
          style={{ flex: 1, minWidth: 0 }}
          onClick={() => {
            if (state.selectedNodeId === nodeData.id && hasChildren) {
              props.node.toggle();
              toggleNodeExpanded(nodeData.id);
            } else {
              setSelectedNodeId(nodeData.id);
              setHoveredNodeId(nodeData.id);
            }
          }}
        >
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
      aria-label="Workbench inspector"
      data-workbench-inspector-shell="true"
      data-workbench-inspector-sidebar="foundation"
      style={{
        ...shellStyle,
        width: "980px",
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "calc(100vh - 24px)",
        overflow: "hidden",
        padding: "14px",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "linear-gradient(180deg, rgba(23, 28, 38, 0.98), rgba(13, 17, 24, 0.98))",
        boxShadow: "0 30px 80px rgba(0, 0, 0, 0.42)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
        <div onPointerDown={beginDrag} style={{ flex: 1, cursor: dragState ? "grabbing" : "grab", userSelect: "none" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.65 }}>
            Workbench Inspector
          </div>
          <strong style={{ fontSize: "15px" }}>{mergedLabel}</strong>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
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
            onClick={() => setTreeFilterMode(state.hierarchy.treeFilterMode === "smart" ? "all" : "smart")}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "999px",
              padding: "8px 12px",
              background: state.hierarchy.treeFilterMode === "smart" ? "rgba(164, 145, 255, 0.18)" : "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            {state.hierarchy.treeFilterMode === "smart" ? "Smart DOM" : "Raw DOM"}
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

      <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 14, height: `${treeHeight + 96}px` }}>
        <section
          style={{
            minWidth: 0,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            paddingRight: 12,
            background: "rgba(255,255,255,0.02)",
            borderRadius: "16px",
            padding: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>Layers</div>
              <div style={{ fontSize: "12px", opacity: 0.75 }}>
                {state.hierarchy.focusMode === "marked" ? "Focused nodes" : "All visible nodes"}
              </div>
            </div>
            <div style={{ fontSize: "11px", opacity: 0.55, alignSelf: "end" }}>
              {state.hierarchy.treeFilterMode === "smart" ? "Smart DOM" : "Raw DOM"}
            </div>
          </div>
          <input
            type="text"
            value={state.hierarchy.query}
            onChange={(event) => setHierarchyQuery(event.target.value)}
            placeholder="Search nodes"
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
          <Tree<InspectorNode>
            key={state.hierarchy.treeFilterMode}
            data={filteredRootNodes}
            width={348}
            height={treeHeight}
            indent={20}
            rowHeight={52}
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
            selection={state.selectedNodeId ?? undefined}
            initialOpenState={Object.fromEntries(state.hierarchy.expandedNodeIds.map((id) => [id, true]))}
            onActivate={(node) => setSelectedNodeId(node.id)}
            onSelect={(nodes) => {
              const first = nodes[0];
              if (first) setSelectedNodeId(first.id);
            }}
          >
            {TreeNode}
          </Tree>
        </section>

        <section style={{ minWidth: 0, overflow: "auto", paddingRight: 4 }}>
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
                </section>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.72 }}>
              Select a node from the tree or turn pick mode on and choose an element on the page.
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
