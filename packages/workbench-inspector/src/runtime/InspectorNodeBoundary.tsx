import React from "react";

import type { InspectorNodeKind } from "../contracts/types";
import { registerInspectorRuntimeNode, updateInspectorRuntimeNode } from "./InspectorRuntimeRegistry";

type InspectorBoundaryContextValue = {
  parentId: string | null;
  ownerPath: string[];
};

const InspectorBoundaryContext = React.createContext<InspectorBoundaryContextValue>({
  parentId: null,
  ownerPath: [],
});

function sanitizeRuntimeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function getChildComponentName(child: React.ReactElement): string | null {
  if (typeof child.type === "string") return child.type;
  if (typeof child.type === "function") {
    const component = child.type as { displayName?: string; name?: string };
    return component.displayName || component.name || null;
  }
  if (typeof child.type === "object" && child.type) {
    const typeObject = child.type as { displayName?: string; name?: string };
    return typeObject.displayName || typeObject.name || null;
  }
  return null;
}

function resolveUsableAnchorElement(element: Element | null): Element | null {
  if (!element) return null;
  if (element.firstElementChild instanceof Element) {
    return element.firstElementChild;
  }
  return element;
}

type BoundaryProps = {
  children: React.ReactNode;
  label?: string;
  kind?: InspectorNodeKind;
  semanticTargetId?: string | null;
  sourcePath?: string;
  debugName?: string;
};

export function InspectorNodeBoundary(props: BoundaryProps) {
  const parent = React.useContext(InspectorBoundaryContext);
  const generatedId = React.useId();
  const runtimeId = React.useMemo(() => `rt_${sanitizeRuntimeId(generatedId)}`, [generatedId]);
  const childCount = React.Children.count(props.children);
  const singleChild = childCount === 1 ? React.Children.only(props.children) : null;
  const anchorRef = React.useRef<Element | null>(null);
  const componentName = React.useMemo(
    () => (singleChild && React.isValidElement(singleChild) ? getChildComponentName(singleChild) : "Boundary"),
    [singleChild]
  );
  const ownerPath = React.useMemo(
    () => [...parent.ownerPath, props.label || componentName || props.semanticTargetId || runtimeId],
    [componentName, parent.ownerPath, props.label, props.semanticTargetId, runtimeId]
  );

  React.useEffect(() => {
    const registration = {
      id: runtimeId,
      parentId: parent.parentId,
      label: props.label,
      componentName,
      kind: props.kind,
      semanticTargetId: props.semanticTargetId ?? null,
      sourcePath: props.sourcePath ?? null,
      ownerPath: ownerPath.join(" > "),
      debugName: props.debugName ?? null,
      anchorElement: resolveUsableAnchorElement(anchorRef.current),
    };
    const unregister = registerInspectorRuntimeNode(registration);
    return unregister;
  }, [componentName, ownerPath, parent.parentId, props.debugName, props.kind, props.label, props.semanticTargetId, props.sourcePath, runtimeId]);

  React.useLayoutEffect(() => {
    updateInspectorRuntimeNode({
      id: runtimeId,
      parentId: parent.parentId,
      label: props.label,
      componentName,
      kind: props.kind,
      semanticTargetId: props.semanticTargetId ?? null,
      sourcePath: props.sourcePath ?? null,
      ownerPath: ownerPath.join(" > "),
      debugName: props.debugName ?? null,
      anchorElement: resolveUsableAnchorElement(anchorRef.current),
    });
  }, [componentName, ownerPath, parent.parentId, props.debugName, props.kind, props.label, props.semanticTargetId, props.sourcePath, runtimeId]);

  const contextValue = React.useMemo(
    () => ({ parentId: runtimeId, ownerPath }),
    [ownerPath, runtimeId]
  );

  const canAttachDirectly = Boolean(singleChild && React.isValidElement(singleChild) && typeof singleChild.type === "string");
  const wrappedChild = canAttachDirectly && singleChild && React.isValidElement(singleChild)
    ? React.cloneElement(singleChild, {
        ref: (node: Element | null) => {
          anchorRef.current = resolveUsableAnchorElement(node);
          const originalRef = (singleChild as React.ReactElement & { ref?: React.Ref<Element> }).ref;
          if (typeof originalRef === "function") originalRef(node);
          else if (originalRef && typeof originalRef === "object") {
            (originalRef as React.MutableRefObject<Element | null>).current = node;
          }
        },
        "data-inspector-runtime-id": runtimeId,
      })
    : (
        <div
          ref={(node) => {
            anchorRef.current = resolveUsableAnchorElement(node);
          }}
          data-inspector-runtime-id={runtimeId}
          style={{ display: "contents" }}
        >
          {props.children}
        </div>
      );

  return <InspectorBoundaryContext.Provider value={contextValue}>{wrappedChild}</InspectorBoundaryContext.Provider>;
}
