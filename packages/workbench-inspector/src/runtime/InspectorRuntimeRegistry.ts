import type { InspectorNodeId, InspectorNodeKind } from "../contracts/types";

export type InspectorRuntimeRegistration = {
  id: InspectorNodeId;
  parentId?: InspectorNodeId | null;
  label?: string;
  componentName?: string | null;
  kind?: InspectorNodeKind;
  semanticTargetId?: string | null;
  sourcePath?: string | null;
  ownerPath?: string | null;
  debugName?: string | null;
  anchorElement?: Element | null;
};

type RuntimeListener = () => void;

type RuntimeStore = {
  registrations: Map<InspectorNodeId, InspectorRuntimeRegistration>;
  listeners: Set<RuntimeListener>;
  emitScheduled: boolean;
};

const runtimeStore: RuntimeStore = {
  registrations: new Map(),
  listeners: new Set(),
  emitScheduled: false,
};

function registrationsEqual(
  left: InspectorRuntimeRegistration | undefined,
  right: InspectorRuntimeRegistration
): boolean {
  if (!left) return false;
  return (
    left.id === right.id &&
    left.parentId === right.parentId &&
    left.label === right.label &&
    left.componentName === right.componentName &&
    left.kind === right.kind &&
    left.semanticTargetId === right.semanticTargetId &&
    left.sourcePath === right.sourcePath &&
    left.ownerPath === right.ownerPath &&
    left.debugName === right.debugName &&
    left.anchorElement === right.anchorElement
  );
}

function emitChange() {
  if (runtimeStore.emitScheduled) return;
  runtimeStore.emitScheduled = true;
  const flush = () => {
    runtimeStore.emitScheduled = false;
    for (const listener of runtimeStore.listeners) listener();
  };
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => flush());
    return;
  }
  setTimeout(flush, 0);
}

export function registerInspectorRuntimeNode(registration: InspectorRuntimeRegistration): () => void {
  const current = runtimeStore.registrations.get(registration.id);
  if (!registrationsEqual(current, registration)) {
    runtimeStore.registrations.set(registration.id, registration);
    emitChange();
  }
  return () => {
    const current = runtimeStore.registrations.get(registration.id);
    if (current === registration) {
      runtimeStore.registrations.delete(registration.id);
      emitChange();
    } else if (current) {
      runtimeStore.registrations.delete(registration.id);
      emitChange();
    }
  };
}

export function updateInspectorRuntimeNode(registration: InspectorRuntimeRegistration) {
  const current = runtimeStore.registrations.get(registration.id);
  if (registrationsEqual(current, registration)) {
    return;
  }
  runtimeStore.registrations.set(registration.id, registration);
  emitChange();
}

export function subscribeInspectorRuntime(listener: RuntimeListener): () => void {
  runtimeStore.listeners.add(listener);
  return () => {
    runtimeStore.listeners.delete(listener);
  };
}

export function resolveInspectorNodeIdFromElement(element: Element | null): InspectorNodeId | null {
  let current = element;
  while (current) {
    const runtimeId = current.getAttribute("data-inspector-runtime-id");
    if (runtimeId) return runtimeId;
    current = current.parentElement;
  }
  return null;
}

export function getInspectorRuntimeRegistrations(): InspectorRuntimeRegistration[] {
  return [...runtimeStore.registrations.values()];
}
