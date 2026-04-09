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
  elementsByProjectionId: Map<string, Element>;
};

type SourceGraphArtifacts = {
  rootNodes: SourceNode[];
  runtimeProjectionsById: Map<string, InspectorRuntimeProjection>;
  elementsBySourceNodeId: Map<SourceNodeId, Element>;
  elementsByProjectionId: Map<string, Element>;
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

function getCanonicalSourceNodeIdFromElement(element: Element | null | undefined): SourceNodeId | null {
  const sourceNodeId = element?.getAttribute("data-wb-id")?.trim() ?? "";
  return sourceNodeId ? (sourceNodeId as SourceNodeId) : null;
}

function toProjection(
  registration: InspectorRuntimeRegistration,
  sourceNodeId: SourceNodeId
): InspectorRuntimeProjection {
  return {
    id: registration.id,
    sourceNodeId,
    bounds: null,
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
  const elementsByProjectionId = new Map<string, Element>();

  const buildNode = (registration: InspectorRuntimeRegistration, depth: number, ancestors: string[]): SourceNode => {
    const label = normalizeLabel(registration);
    const childRegistrations = childrenByParent.get(registration.id) ?? [];
    const canonicalSourceNodeId = getCanonicalSourceNodeIdFromElement(registration.anchorElement);
    const sourceNodeId = canonicalSourceNodeId ?? registration.id;
    const node: SourceNode = {
      id: sourceNodeId,
      label,
      category: "placement",
      bindingKey: canonicalSourceNodeId ?? null,
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
      meta:
        registration.debugName || canonicalSourceNodeId
          ? {
              ...(registration.debugName ? { debugName: registration.debugName } : {}),
              ...(canonicalSourceNodeId ? { canonicalSourceNodeId } : {}),
            }
          : undefined,
      runtimeProjectionIds: [registration.id],
    };
    sourceNodesById.set(node.id, node);

    const projection = toProjection(registration, sourceNodeId);
    runtimeProjectionsById.set(projection.id, projection);
    if (registration.anchorElement) {
      elementsBySourceNodeId.set(sourceNodeId, registration.anchorElement);
      elementsByProjectionId.set(projection.id, registration.anchorElement);
    }
    return node;
  };

  const rootNodes = (childrenByParent.get(null) ?? []).map((registration) => buildNode(registration, 0, []));

  return {
    rootNodes,
    sourceNodesById,
    runtimeProjectionsById,
    elementsBySourceNodeId,
    elementsByProjectionId,
  };
}

export function mergeSourceGraphArtifacts(graphs: SourceGraphArtifacts[]): SourceGraphBuildResult {
  const rootNodes: SourceNode[] = [];
  const sourceNodesById = new Map<SourceNodeId, SourceNode>();
  const runtimeProjectionsById = new Map<string, InspectorRuntimeProjection>();
  const elementsBySourceNodeId = new Map<SourceNodeId, Element>();
  const elementsByProjectionId = new Map<string, Element>();
  const seenNodeIds = new Set<string>();

  const pushNode = (node: SourceNode) => {
    if (seenNodeIds.has(node.id)) return;
    seenNodeIds.add(node.id);
    rootNodes.push(node);
  };

  const indexNode = (node: SourceNode) => {
    if (!sourceNodesById.has(node.id)) {
      sourceNodesById.set(node.id, node);
    }
    for (const child of node.children ?? []) indexNode(child);
  };

  for (const graph of graphs) {
    for (const node of graph.rootNodes) {
      pushNode(node);
      indexNode(node);
    }
    for (const [projectionId, projection] of graph.runtimeProjectionsById) {
      if (!runtimeProjectionsById.has(projectionId)) {
        runtimeProjectionsById.set(projectionId, projection);
      }
    }
    for (const [sourceNodeId, element] of graph.elementsBySourceNodeId) {
      if (!elementsBySourceNodeId.has(sourceNodeId)) {
        elementsBySourceNodeId.set(sourceNodeId, element);
      }
    }
    for (const [projectionId, element] of graph.elementsByProjectionId) {
      if (!elementsByProjectionId.has(projectionId)) {
        elementsByProjectionId.set(projectionId, element);
      }
    }
  }

  return {
    rootNodes,
    sourceNodesById,
    runtimeProjectionsById,
    elementsBySourceNodeId,
    elementsByProjectionId,
  };
}

export function mapSourceGraphToInspectorTree(sourceNodes: SourceNode[], projectionsById: Map<string, InspectorRuntimeProjection>): InspectorNode[] {
  const mapNode = (node: SourceNode): InspectorNode => {
    const primaryProjection = node.runtimeProjectionIds.length ? projectionsById.get(node.runtimeProjectionIds[0]) ?? null : null;
    const projectionCount = node.runtimeProjectionIds.length;
    const nodeType =
      node.category === "component-definition"
        ? "definition"
        : node.category === "repeated-projection-group"
          ? "repeated-group"
          : "placement";
    const label =
      nodeType === "repeated-group" && projectionCount > 0
        ? `${node.label} x${projectionCount}`
        : node.label;
    return {
      id: node.id as InspectorNodeId,
      sourceNodeId: node.id,
      runtimeId: primaryProjection?.id ?? node.id,
      nodeType,
      bindingKey: node.bindingKey ?? null,
      bindingStatus: (node.meta?.bindingStatus as InspectorNode["bindingStatus"]) ?? undefined,
      projectionIds: [...node.runtimeProjectionIds],
      projectionCount,
      highlightMode: nodeType === "repeated-group" || projectionCount > 1 ? "multi" : "single",
      runtimeProjectionCount: node.runtimeProjectionIds.length,
      label,
      displayLabel: label,
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
      sourceBackedParameters: node.sourceBackedParameters,
    };
  };

  return sourceNodes.map(mapNode);
}
