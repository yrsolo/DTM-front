import type {
  InspectorNode,
  InspectorNodeBounds,
  InspectorNodeId,
  InspectorNodeKind,
  InspectorRuntimeProjection,
  SourceNode,
  SourceNodeId,
} from "../contracts/types";
import type { InspectorRuntimeRegistration } from "../runtime/InspectorRuntimeRegistry";

type SourceGraphBuildResult = {
  rootNodes: SourceNode[];
  sourceNodesById: Map<SourceNodeId, SourceNode>;
  runtimeProjectionsById: Map<string, InspectorRuntimeProjection>;
  elementsBySourceNodeId: Map<SourceNodeId, Element>;
};

function humanizeLabel(value: string): string {
  const normalized = value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (!normalized) return "Unnamed node";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeLabel(registration: InspectorRuntimeRegistration): string {
  return humanizeLabel(
    registration.label?.trim() ||
      registration.componentName?.trim() ||
      registration.semanticTargetId?.trim() ||
      registration.debugName?.trim() ||
      "Unnamed node"
  );
}

function buildPath(parts: string[]): string {
  return parts.filter(Boolean).join(" > ");
}

function toBounds(element: Element | null | undefined): InspectorNodeBounds | null {
  const bounds = element?.getBoundingClientRect();
  if (!bounds) return null;
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

function toProjection(
  registration: InspectorRuntimeRegistration,
  sourceNodeId: SourceNodeId
): InspectorRuntimeProjection {
  return {
    id: registration.id,
    sourceNodeId,
    bounds: toBounds(registration.anchorElement),
    isVisible: Boolean(registration.anchorElement),
    isInteractive:
      registration.anchorElement instanceof HTMLElement
        ? registration.anchorElement.tabIndex >= 0 || typeof registration.anchorElement.onclick === "function"
        : false,
    tagName: registration.anchorElement?.tagName?.toLowerCase() ?? registration.componentName?.toLowerCase() ?? "component",
  };
}

export function buildInspectorSourceGraph(
  registrations: Iterable<InspectorRuntimeRegistration>
): SourceGraphBuildResult {
  const registrationList = [...registrations];
  const childrenByParent = new Map<string | null, InspectorRuntimeRegistration[]>();

  for (const registration of registrationList) {
    const parentId = registration.parentId ?? null;
    const bucket = childrenByParent.get(parentId) ?? [];
    bucket.push(registration);
    childrenByParent.set(parentId, bucket);
  }

  for (const bucket of childrenByParent.values()) {
    bucket.sort((left, right) => normalizeLabel(left).localeCompare(normalizeLabel(right)));
  }

  const sourceNodesById = new Map<SourceNodeId, SourceNode>();
  const runtimeProjectionsById = new Map<string, InspectorRuntimeProjection>();
  const elementsBySourceNodeId = new Map<SourceNodeId, Element>();

  const buildNode = (registration: InspectorRuntimeRegistration, depth: number, ancestors: string[]): SourceNode => {
    const label = normalizeLabel(registration);
    const childRegistrations = childrenByParent.get(registration.id) ?? [];
    const sourceNodeId = registration.id;
    const node: SourceNode = {
      id: sourceNodeId,
      label,
      category: "placement",
      bindingKey: null,
      componentName: registration.componentName?.trim() || "Component",
      kind: (registration.kind ?? "content") as InspectorNodeKind,
      path: buildPath([...ancestors, label]),
      ownerPath: registration.ownerPath ?? buildPath([...ancestors, label]),
      sourcePath: registration.sourcePath ?? null,
      sourceLocation: null,
      definitionId: null,
      placementId: sourceNodeId,
      repeatedGroupId: null,
      depth,
      parentId: registration.parentId ?? null,
      children: childRegistrations.map((child) => buildNode(child, depth + 1, [...ancestors, label])),
      semanticTargetId: registration.semanticTargetId ?? null,
      meta: registration.debugName ? { debugName: registration.debugName } : undefined,
      runtimeProjectionIds: [registration.id],
    };
    sourceNodesById.set(node.id, node);

    const projection = toProjection(registration, sourceNodeId);
    runtimeProjectionsById.set(projection.id, projection);
    if (registration.anchorElement) {
      elementsBySourceNodeId.set(sourceNodeId, registration.anchorElement);
    }
    return node;
  };

  const rootNodes = (childrenByParent.get(null) ?? []).map((registration) => buildNode(registration, 0, []));

  return {
    rootNodes,
    sourceNodesById,
    runtimeProjectionsById,
    elementsBySourceNodeId,
  };
}

export function mapSourceGraphToInspectorTree(sourceNodes: SourceNode[], projectionsById: Map<string, InspectorRuntimeProjection>): InspectorNode[] {
  const mapNode = (node: SourceNode): InspectorNode => {
    const primaryProjection = node.runtimeProjectionIds.length ? projectionsById.get(node.runtimeProjectionIds[0]) ?? null : null;
    return {
      id: node.id as InspectorNodeId,
      sourceNodeId: node.id,
      runtimeId: primaryProjection?.id ?? node.id,
      bindingKey: node.bindingKey ?? null,
      bindingStatus: (node.meta?.bindingStatus as InspectorNode["bindingStatus"]) ?? undefined,
      runtimeProjectionCount: node.runtimeProjectionIds.length,
      label: node.label,
      displayLabel: node.label,
      componentName: node.componentName ?? null,
      kind: node.kind,
      tagName: primaryProjection?.tagName ?? (node.componentName?.toLowerCase() || "component"),
      path: node.path,
      ownerPath: node.ownerPath ?? null,
      sourcePath: node.sourcePath ?? null,
      sourceLocation: node.sourceLocation ?? null,
      sourceCategory: node.category,
      definitionId: node.definitionId ?? null,
      placementId: node.placementId ?? null,
      repeatedGroupId: node.repeatedGroupId ?? null,
      depth: node.depth,
      parentId: node.parentId ?? null,
      children: (node.children ?? []).map(mapNode),
      bounds: primaryProjection?.bounds ?? null,
      isVisible: primaryProjection?.isVisible ?? false,
      isInteractive: primaryProjection?.isInteractive ?? false,
      semanticTargetId: node.semanticTargetId ?? null,
      meta: node.meta,
    };
  };

  return sourceNodes.map(mapNode);
}
