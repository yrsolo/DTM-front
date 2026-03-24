import React from "react";

import { useInspectorContext } from "../runtime/InspectorContext";

function isInsideInspectorShell(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("[data-workbench-inspector-shell='true']"));
}

function getUnderlyingElementAtPoint(clientX: number, clientY: number): Element | null {
  const elements = document.elementsFromPoint(clientX, clientY);
  for (const element of elements) {
    if (element.closest("[data-workbench-inspector-shell='true']")) continue;
    if (element.hasAttribute("data-workbench-inspector-pick-shield")) continue;
    if (element.hasAttribute("data-workbench-inspector-overlay")) continue;
    return element;
  }
  return null;
}

export function InspectorOverlay() {
  const { getNodeById, getNodeElement, refreshNodes, resolveNodeFromElement, setHoveredNodeId, setPanelOpen, setPickMode, setSelectedNodeId, state } =
    useInspectorContext();

  React.useEffect(() => {
    if (!state.enabled || state.pickMode !== "on") return;

    const onPointerMove = (event: PointerEvent) => {
      if (isInsideInspectorShell(event.target)) return;
      const element = getUnderlyingElementAtPoint(event.clientX, event.clientY);
      const node = element ? resolveNodeFromElement(element) : null;
      setHoveredNodeId(node?.id ?? null);
    };

    const onClick = (event: MouseEvent) => {
      if (isInsideInspectorShell(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      const element = getUnderlyingElementAtPoint(event.clientX, event.clientY);
      const node = element ? resolveNodeFromElement(element) : null;
      if (!node) return;
      setSelectedNodeId(node.id);
      setPanelOpen(true);
      refreshNodes();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPickMode("off");
      setHoveredNodeId(null);
    };

    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [refreshNodes, resolveNodeFromElement, setHoveredNodeId, setPanelOpen, setPickMode, setSelectedNodeId, state.enabled, state.pickMode]);

  if (!state.enabled) return null;

  const activeNode = state.selectedNodeId ? getNodeById(state.selectedNodeId) : state.hoveredNodeId ? getNodeById(state.hoveredNodeId) : null;
  const activeElement = activeNode ? getNodeElement(activeNode.id) : null;
  const rect = activeElement?.getBoundingClientRect() ?? null;

  return (
    <>
      {state.pickMode === "on" ? (
        <div
          aria-hidden="true"
          data-workbench-inspector-pick-shield="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 10, 18, 0.04)",
            cursor: "crosshair",
            zIndex: 9997,
          }}
        />
      ) : null}
      {activeNode && rect ? (
        <div
          aria-hidden="true"
          data-workbench-inspector-overlay="foundation"
          style={{
            position: "fixed",
            left: `${Math.max(0, rect.left)}px`,
            top: `${Math.max(0, rect.top)}px`,
            width: `${Math.max(0, rect.width)}px`,
            height: `${Math.max(0, rect.height)}px`,
            border: state.selectedNodeId === activeNode.id ? "2px solid #7cf7c6" : "2px solid #ffd166",
            background: state.selectedNodeId === activeNode.id ? "rgba(124, 247, 198, 0.12)" : "rgba(255, 209, 102, 0.12)",
            boxShadow: "0 0 0 1px rgba(12, 16, 28, 0.7)",
            pointerEvents: "none",
            zIndex: 9998,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-28px",
              left: 0,
              maxWidth: "min(40vw, 320px)",
              padding: "6px 10px",
              borderRadius: "10px",
              background: "rgba(10, 14, 24, 0.92)",
              color: "#eff6ff",
              fontSize: "12px",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activeNode.label}
          </div>
        </div>
      ) : (
        <div aria-hidden="true" data-workbench-inspector-overlay="foundation" style={{ display: "none" }} />
      )}
    </>
  );
}
