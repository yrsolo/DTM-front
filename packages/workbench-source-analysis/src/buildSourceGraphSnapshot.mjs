import {
  WORKBENCH_SOURCE_ID_VERSION,
  createPlacementScopeId,
  createSourceNodeId,
  createTemplateNodeToken,
  normalizeRepoRelativeSourceLocation,
  normalizeRepoRelativeSourcePath,
} from "../../workbench-contracts/src/sourceNodeIds.js";

function toSourceCategory(nodeClass) {
  if (nodeClass === "component-definition") return "component-definition";
  if (nodeClass === "repeated-pattern") return "repeated-projection-group";
  return "placement";
}

function inferKind(node) {
  const lowered = String(node.componentName || "").toLowerCase();
  const tagName = String(node.tagName || "").toLowerCase();
  if (
    tagName === "button" ||
    tagName === "select" ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "a" ||
    lowered.includes("button") ||
    lowered.includes("input") ||
    lowered.includes("filter") ||
    lowered.includes("control")
  ) {
    return "control";
  }
  if (
    tagName === "img" ||
    tagName === "picture" ||
    tagName === "image" ||
    tagName === "svg" ||
    lowered.includes("image") ||
    lowered.includes("icon") ||
    lowered.includes("logo")
  ) {
    return "image";
  }
  if (
    tagName === "span" ||
    tagName === "label" ||
    tagName === "strong" ||
    tagName === "em" ||
    tagName === "p" ||
    tagName === "text" ||
    tagName === "tspan" ||
    lowered.includes("text") ||
    lowered.includes("title") ||
    lowered.includes("label")
  ) {
    return "text";
  }
  if (
    tagName === "div" ||
    tagName === "section" ||
    tagName === "header" ||
    tagName === "footer" ||
    tagName === "nav" ||
    tagName === "main" ||
    lowered.includes("layout") ||
    lowered.includes("container") ||
    lowered.includes("wrapper") ||
    lowered.includes("dock") ||
    lowered.includes("panel")
  ) {
    return "container";
  }
  return "content";
}

function buildLinkedModuleIndex(reports, output = new Map()) {
  for (const linkedReport of reports ?? []) {
    const requestedSymbols = linkedReport?.requestedSymbols ?? [];
    const definitionPlans = linkedReport?.instrumentationManifest?.definitions ?? [];
    const firstDefinitionPlan = definitionPlans[0] ?? null;
    if (firstDefinitionPlan) {
      const keys = requestedSymbols.length ? requestedSymbols : [firstDefinitionPlan.componentName];
      for (const key of keys) {
        if (!output.has(key)) {
          output.set(key, {
            report: linkedReport,
            definitionPlan:
              definitionPlans.find((definition) => keys.includes(definition.componentName)) ?? firstDefinitionPlan,
            definitionNode:
              (linkedReport?.normalizedTree ?? []).find((node) => node.class === "component-definition") ?? null,
          });
        }
      }
    }
    buildLinkedModuleIndex(linkedReport?.linkedModules ?? [], output);
  }
  return output;
}

function buildDefinitionPlanIndex(report) {
  const byComponentName = new Map();
  for (const definition of report?.instrumentationManifest?.definitions ?? []) {
    byComponentName.set(definition.componentName, definition);
  }
  return byComponentName;
}

function buildPath(parentPath, label) {
  return parentPath ? `${parentPath} > ${label}` : label;
}

function materializeSourceBackedParameters(node, sourceNodeId) {
  return (node.sourceBackedParameterCandidates ?? []).map((candidate, index) => {
    const normalizedSourcePath = normalizeRepoRelativeSourcePath(candidate.origin.sourcePath) ?? candidate.origin.sourcePath;
    const normalizedSourceLocation =
      normalizeRepoRelativeSourceLocation(candidate.origin.sourceLocation) ?? candidate.origin.sourceLocation;
    return {
      id: `${sourceNodeId}::param:${index}:${candidate.origin.astPath}`,
      sourceNodeId,
      label: candidate.label,
      group: candidate.group,
      valueKind: candidate.valueKind,
      currentValue: candidate.currentValue,
      normalizedValue: candidate.normalizedValue ?? null,
      origin: {
        ...candidate.origin,
        sourcePath: normalizedSourcePath,
        sourceLocation: normalizedSourceLocation,
        displaySourcePath: normalizedSourcePath,
        resolvedSourcePath: candidate.origin.sourcePath ?? null,
      },
      readonlyReason: candidate.readonlyReason ?? null,
      supportedScopes: [...(candidate.supportedScopes ?? [])],
      selector: candidate.selector ?? null,
      cssProperty: candidate.cssProperty ?? null,
      canCreatePlacementOverride: candidate.canCreatePlacementOverride ?? false,
      expressionEditMode: candidate.expressionEditMode ?? null,
    };
  });
}

function projectNode(node, options) {
  const {
    currentScopeId,
    parentId = null,
    parentPath = "",
    owningDefinitionId,
    currentDefinitionPlan,
    linkedModuleIndex,
    rootDefinitionPlanIndex,
  } = options;

  const category = toSourceCategory(node.class);
  const templateToken =
    node.templateToken ??
    createTemplateNodeToken({
      definitionId: owningDefinitionId,
      canonicalPath: node.canonicalPath,
      componentName: node.componentName,
      nodeClass: node.class,
    });
  const sourceNodeId = createSourceNodeId(currentScopeId, templateToken, category);
  const label = node.displayLabel ?? node.componentName;
  const path = buildPath(parentPath, label);
  const projectedChildren = (node.children ?? []).map((child) =>
    projectNode(child, {
      currentScopeId,
      parentId: sourceNodeId,
      parentPath: path,
      owningDefinitionId,
      currentDefinitionPlan,
      linkedModuleIndex,
      rootDefinitionPlanIndex,
    })
  );

  const projectedNode = {
    id: sourceNodeId,
    label,
    category,
    bindingKey: sourceNodeId,
    componentName: node.componentName,
    kind: inferKind(node),
    path,
    ownerPath: path,
    sourcePath: normalizeRepoRelativeSourcePath(node.sourcePath) ?? node.sourcePath ?? null,
    sourceLocation: normalizeRepoRelativeSourceLocation(node.sourceLocation) ?? node.sourceLocation ?? null,
    definitionId: owningDefinitionId,
    placementScopeId: currentScopeId,
    templateToken,
    idVersion: WORKBENCH_SOURCE_ID_VERSION,
    placementId: category === "placement" ? sourceNodeId : null,
    repeatedGroupId: category === "repeated-projection-group" ? sourceNodeId : null,
    depth: parentPath ? parentPath.split(" > ").length : 0,
    parentId,
    children: projectedChildren,
    semanticTargetId: null,
    meta: {
      canonicalPath: node.canonicalPath,
      sourceNodeClass: node.class,
      displayLabel: node.displayLabel ?? node.componentName,
      tagName: node.tagName ?? null,
      sourceNodeId,
    },
    runtimeProjectionIds: [],
    sourceBackedParameters: materializeSourceBackedParameters(node, sourceNodeId),
  };

  if (!/^[A-Z]/.test(node.componentName || "")) {
    return projectedNode;
  }

  const linkedModule =
    linkedModuleIndex.get(node.componentName) ??
    (() => {
      const definitionPlan = rootDefinitionPlanIndex.get(node.componentName) ?? null;
      const definitionNode =
        (options.rootNodes ?? []).find((candidate) => candidate.class === "component-definition" && candidate.componentName === node.componentName) ??
        null;
      return definitionPlan && definitionNode
        ? { definitionPlan, definitionNode, report: null }
        : null;
    })();

  const linkedDefinitionNode = linkedModule?.definitionNode ?? null;
  const linkedDefinitionPlan = linkedModule?.definitionPlan ?? null;
  if (!linkedDefinitionNode || !linkedDefinitionPlan?.definitionId) {
    return projectedNode;
  }

  const childScopeId = createPlacementScopeId(currentScopeId, templateToken);
  const linkedChildren = (linkedDefinitionNode.children ?? []).map((child) =>
    projectNode(child, {
      currentScopeId: childScopeId,
      parentId: sourceNodeId,
      parentPath: path,
      owningDefinitionId: linkedDefinitionPlan.definitionId,
      currentDefinitionPlan: linkedDefinitionPlan,
      linkedModuleIndex,
      rootDefinitionPlanIndex,
      rootNodes: linkedModule?.report?.normalizedTree ?? options.rootNodes,
    })
  );

  return {
    ...projectedNode,
    children: [...projectedChildren, ...linkedChildren],
  };
}

export function buildSourceGraphSnapshot({ snapshotId, entry, report }) {
  const linkedModuleIndex = buildLinkedModuleIndex(report.linkedModules ?? []);
  const definitionPlanIndex = buildDefinitionPlanIndex(report);
  const rootNodes = [];

  for (const rootNode of report.normalizedTree ?? []) {
    if (rootNode.class !== "component-definition") continue;
    const definitionPlan = definitionPlanIndex.get(rootNode.componentName) ?? null;
    if (!definitionPlan) continue;
    const definitionNodeId = definitionPlan.definitionId;
    const definitionPath = rootNode.displayLabel ?? rootNode.componentName;
    const projectedChildren = (rootNode.children ?? []).map((child) =>
      projectNode(child, {
        currentScopeId: definitionPlan.rootScopeId,
        parentId: definitionNodeId,
        parentPath: definitionPath,
        owningDefinitionId: definitionPlan.definitionId,
        currentDefinitionPlan: definitionPlan,
        linkedModuleIndex,
        rootDefinitionPlanIndex: definitionPlanIndex,
        rootNodes: report.normalizedTree ?? [],
      })
    );
    rootNodes.push({
      id: definitionNodeId,
      label: rootNode.displayLabel ?? rootNode.componentName,
      category: "component-definition",
      bindingKey: definitionNodeId,
      componentName: rootNode.componentName,
      kind: "content",
      path: definitionPath,
      ownerPath: definitionPath,
      sourcePath: normalizeRepoRelativeSourcePath(rootNode.sourcePath) ?? rootNode.sourcePath ?? null,
      sourceLocation: normalizeRepoRelativeSourceLocation(rootNode.sourceLocation) ?? rootNode.sourceLocation ?? null,
      definitionId: definitionNodeId,
      placementScopeId: definitionPlan.rootScopeId,
      templateToken: createTemplateNodeToken({
        definitionId: definitionNodeId,
        canonicalPath: rootNode.canonicalPath,
        componentName: rootNode.componentName,
        nodeClass: rootNode.class,
      }),
      idVersion: WORKBENCH_SOURCE_ID_VERSION,
      placementId: null,
      repeatedGroupId: null,
      depth: 0,
      parentId: null,
      children: projectedChildren,
      semanticTargetId: null,
      meta: {
        canonicalPath: rootNode.canonicalPath,
        sourceNodeClass: rootNode.class,
        displayLabel: rootNode.displayLabel ?? rootNode.componentName,
        tagName: rootNode.tagName ?? null,
      },
      runtimeProjectionIds: [],
      sourceBackedParameters: materializeSourceBackedParameters(rootNode, definitionNodeId),
    });
  }

  return {
    id: snapshotId,
    version: WORKBENCH_SOURCE_ID_VERSION,
    entry: normalizeRepoRelativeSourcePath(entry) ?? entry,
    generatedAt: new Date().toISOString(),
    rootNodes,
  };
}
