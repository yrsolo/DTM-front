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

function collectRenderableRects(elements: Element[]): DOMRect[] {
  const uniqueRects = new Map<string, DOMRect>();
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const key = [
      Math.round(rect.left),
      Math.round(rect.top),
      Math.round(rect.width),
      Math.round(rect.height),
    ].join(":");
    if (!uniqueRects.has(key)) {
      uniqueRects.set(key, rect);
    }
  }
  return [...uniqueRects.values()].sort((left, right) => {
    if (left.top !== right.top) return left.top - right.top;
    if (left.left !== right.left) return left.left - right.left;
    if (left.width !== right.width) return left.width - right.width;
    return left.height - right.height;
  });
}

export function InspectorOverlay() {
  const { getNodeById, getNodeElement, getNodeElements, getNodeElementDebug, refreshNodes, resolveNodeFromElement, setHoveredNodeId, setPanelOpen, setPickMode, setSelectedNodeId, state } =
    useInspectorContext();
  const [viewportVersion, setViewportVersion] = React.useState(0);

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

  const selectedNode = state.selectedNodeId ? getNodeById(state.selectedNodeId) : null;
  const hoveredNode = state.hoveredNodeId ? getNodeById(state.hoveredNodeId) : null;
  const activeNode = selectedNode ?? hoveredNode;
  const activeElement = activeNode ? getNodeElement(activeNode.id) : null;
  const activeElements = activeNode ? getNodeElements(activeNode.id) : [];
  const selectedRects = selectedNode ? collectRenderableRects(getNodeElements(selectedNode.id)) : [];
  const hoveredRects = hoveredNode ? collectRenderableRects(getNodeElements(hoveredNode.id)) : [];
  React.useEffect(() => {
    if (!selectedNode && !hoveredNode) return;
    const update = () => setViewportVersion((version) => version + 1);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [hoveredNode, selectedNode]);
  const activeElementDebug = activeNode ? getNodeElementDebug(activeNode.id) : null;
  const rects = activeNode === selectedNode ? selectedRects : hoveredRects;

  React.useEffect(() => {
    if (!state.debug) return;
    if (!activeNode) {
      console.debug("[workbench-inspector] overlay", { reason: "no-active-node" });
      return;
    }
    if (!activeElement && !activeElements.length) {
      console.debug("[workbench-inspector] overlay", {
        reason: "no-element",
        nodeId: activeNode.id,
        bindingStatus: activeNode.bindingStatus,
        runtimeProjectionCount: activeNode.runtimeProjectionCount,
        elementDebug: activeElementDebug,
      });
      return;
    }
    if (!rects.length) {
      console.debug("[workbench-inspector] overlay", {
        reason: "zero-rect",
        nodeId: activeNode.id,
        rectCount: rects.length,
      });
      return;
    }
    console.debug("[workbench-inspector] overlay", {
      reason: "rendering-highlight",
      nodeId: activeNode.id,
      bindingStatus: activeNode.bindingStatus,
      mode: activeElementDebug?.mode,
      matchedNodeId: activeElementDebug?.matchedNodeId,
      tagName: activeElementDebug?.tagName,
      rectCount: rects.length,
    });
  }, [activeElement, activeElementDebug, activeElements.length, activeNode, rects.length, state.debug, viewportVersion]);

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
      {selectedNode && selectedRects.length ? (
        <>
          {selectedRects.map((nextRect, index) => (
            <div
              key={`selected-${selectedNode.id}-${index}-${Math.round(nextRect.left)}-${Math.round(nextRect.top)}`}
              aria-hidden="true"
              data-workbench-inspector-overlay="foundation"
              style={{
                position: "fixed",
                left: `${Math.max(0, nextRect.left)}px`,
                top: `${Math.max(0, nextRect.top)}px`,
                width: `${Math.max(0, nextRect.width)}px`,
                height: `${Math.max(0, nextRect.height)}px`,
                border: "2px solid #7cf7c6",
                background: "rgba(124, 247, 198, 0.12)",
                boxShadow: "0 0 0 1px rgba(12, 16, 28, 0.7)",
                pointerEvents: "none",
                zIndex: 9998,
              }}
            >
              {index === 0 ? (
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
                  {selectedNode.label}
                </div>
              ) : null}
            </div>
          ))}
        </>
      ) : null}
      {hoveredNode && hoveredRects.length ? (
        <>
          {hoveredRects.map((nextRect, index) => (
            <div
              key={`hovered-${hoveredNode.id}-${index}-${Math.round(nextRect.left)}-${Math.round(nextRect.top)}`}
              aria-hidden="true"
              data-workbench-inspector-overlay="foundation"
              style={{
                position: "fixed",
                left: `${Math.max(0, nextRect.left)}px`,
                top: `${Math.max(0, nextRect.top)}px`,
                width: `${Math.max(0, nextRect.width)}px`,
                height: `${Math.max(0, nextRect.height)}px`,
                border: "2px solid #ffd166",
                background: "rgba(255, 209, 102, 0.12)",
                boxShadow: "0 0 0 1px rgba(12, 16, 28, 0.7)",
                pointerEvents: "none",
                zIndex: 9999,
              }}
            >
              {index === 0 ? (
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
                  {hoveredNode.label}
                </div>
              ) : null}
            </div>
          ))}
        </>
      ) : null}
      {!selectedRects.length && !hoveredRects.length ? (
        <div aria-hidden="true" data-workbench-inspector-overlay="foundation" style={{ display: "none" }} />
      ) : null}
    </>
  );
}
