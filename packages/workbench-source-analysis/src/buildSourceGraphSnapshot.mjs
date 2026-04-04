function toSourceCategory(nodeClass) {
  if (nodeClass === "component-definition") return "component-definition";
  if (nodeClass === "repeated-pattern") return "repeated-projection-group";
  return "placement";
}

function getDefinitionBindingKey(node) {
  return `def:${node.sourcePath}:${node.componentName}`;
}

function getPlacementBindingKey(node) {
  if (!node.sourceLocation) return null;
  return `plc:${node.sourcePath}:${node.sourceLocation}:${node.componentName}`;
}

function getRepeatedGroupBindingKey(node) {
  if (!node.sourceLocation) return null;
  return `rpt:${node.sourcePath}:${node.sourceLocation}:${node.componentName}`;
}

function getBindingKey(node) {
  if (node.class === "component-definition") return getDefinitionBindingKey(node);
  if (node.class === "repeated-pattern") return getRepeatedGroupBindingKey(node);
  return getPlacementBindingKey(node);
}

function inferKind(componentName) {
  const lowered = String(componentName || "").toLowerCase();
  if (lowered.includes("button") || lowered.includes("input") || lowered.includes("filter") || lowered.includes("control")) {
    return "control";
  }
  if (lowered.includes("image") || lowered.includes("icon") || lowered.includes("logo")) {
    return "image";
  }
  if (lowered.includes("text") || lowered.includes("title") || lowered.includes("label")) {
    return "text";
  }
  if (lowered.includes("layout") || lowered.includes("container") || lowered.includes("wrapper")) {
    return "container";
  }
  return "content";
}

function buildLinkedModuleIndex(reports, output = new Map()) {
  for (const linkedReport of reports ?? []) {
    const requestedSymbols = linkedReport?.requestedSymbols ?? [];
    const firstDefinition =
      (linkedReport?.normalizedTree ?? []).find((node) => node.class === "component-definition") ?? null;
    if (firstDefinition) {
      const keys = requestedSymbols.length ? requestedSymbols : [firstDefinition.componentName];
      for (const key of keys) {
        if (!output.has(key)) {
          output.set(key, linkedReport);
        }
      }
    }
    buildLinkedModuleIndex(linkedReport?.linkedModules ?? [], output);
  }
  return output;
}

function projectNode(node, linkedModuleIndex, parentId = null, parentPath = "") {
  const label = node.displayLabel ?? node.componentName;
  const pathSegment = node.componentName;
  const path = parentPath ? `${parentPath} > ${pathSegment}` : pathSegment;
  const projectedChildren = (node.children ?? []).map((child) => projectNode(child, linkedModuleIndex, node.id, path));
  const projectedNode = {
    id: node.id,
    label,
    category: toSourceCategory(node.class),
    bindingKey: getBindingKey(node),
    componentName: node.componentName,
    kind: inferKind(node.componentName),
    path,
    ownerPath: path,
    sourcePath: node.sourcePath ?? null,
    sourceLocation: node.sourceLocation ?? null,
    definitionId: node.class === "component-definition" ? node.id : null,
    placementId: node.class === "placement" ? node.id : null,
    repeatedGroupId: node.class === "repeated-pattern" ? node.id : null,
    depth: parentPath ? parentPath.split(" > ").length : 0,
    parentId,
    children: projectedChildren,
    semanticTargetId: null,
    meta: {
      canonicalPath: node.canonicalPath,
      sourceNodeClass: node.class,
      displayLabel: node.displayLabel ?? node.componentName,
    },
    runtimeProjectionIds: [],
  };

  if (node.class !== "placement") {
    return projectedNode;
  }

  const linkedReport = linkedModuleIndex.get(node.componentName) ?? null;
  const linkedDefinition =
    (linkedReport?.normalizedTree ?? []).find((candidate) => candidate.class === "component-definition") ?? null;
  if (!linkedDefinition || !linkedDefinition.children?.length) {
    return projectedNode;
  }

  return {
    ...projectedNode,
    definitionId: linkedDefinition.id,
    children: [
      ...projectedChildren,
      ...linkedDefinition.children.map((child) => projectNode(child, linkedModuleIndex, node.id, path)),
    ],
  };
}

export function buildSourceGraphSnapshot({
  snapshotId,
  entry,
  report,
}) {
  const linkedModuleIndex = buildLinkedModuleIndex(report.linkedModules ?? []);
  return {
    id: snapshotId,
    version: "v1",
    entry,
    generatedAt: new Date().toISOString(),
    rootNodes: (report.normalizedTree ?? []).map((node) => projectNode(node, linkedModuleIndex)),
  };
}
