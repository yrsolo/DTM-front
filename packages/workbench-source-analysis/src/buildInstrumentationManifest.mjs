import {
  WORKBENCH_SOURCE_ID_VERSION,
  createDefinitionId,
  createDefinitionRootScopeId,
  createTemplateNodeToken,
  normalizeRepoRelativeSourcePath,
} from "../../workbench-contracts/src/sourceNodeIds.js";

function isComponentName(value) {
  return /^[A-Z]/.test(value || "");
}

function normalizeSourceNodeCategory(nodeClass) {
  return nodeClass === "repeated-pattern" ? "repeated-projection-group" : "placement";
}

function buildLocalComponentSet(report) {
  const localNames = new Set();
  for (const definition of report.componentDefinitions ?? []) {
    if (definition.componentName) localNames.add(definition.componentName);
  }
  for (const componentName of Object.keys(report.localComponentImports ?? {})) {
    localNames.add(componentName);
  }
  return localNames;
}

function buildDefinitionPlanIndex(report) {
  const definitions = [];
  const definitionsByComponentName = new Map();

  for (const definition of report.componentDefinitions ?? []) {
    const definitionId = createDefinitionId({
      sourcePath: definition.sourcePath,
      exportName: definition.componentName ?? definition.exportName ?? "default",
    });
    const definitionPlan = {
      componentName: definition.componentName,
      sourcePath: normalizeRepoRelativeSourcePath(definition.sourcePath) ?? definition.sourcePath,
      sourceLocation: definition.sourceLocation ?? null,
      canonicalSymbolId: definition.canonicalSymbolId ?? null,
      definitionId,
      rootScopeId: createDefinitionRootScopeId(definitionId),
      isSurfaceBoundary: /(?:^|\/)pages\//.test(normalizeRepoRelativeSourcePath(definition.sourcePath) ?? definition.sourcePath) && /Page$/.test(definition.componentName),
    };
    definitions.push(definitionPlan);
    definitionsByComponentName.set(definition.componentName, definitionPlan);
  }

  return { definitions, definitionsByComponentName };
}

function walkDefinitionNodes(nodes, definitionPlan, localComponentNames, hostNodes, localInvocations) {
  for (const node of nodes ?? []) {
    const templateToken = createTemplateNodeToken({
      definitionId: definitionPlan.definitionId,
      canonicalPath: node.canonicalPath,
      componentName: node.componentName,
      nodeClass: node.class,
    });
    const category = normalizeSourceNodeCategory(node.class);
    const sourceLocation = node.sourceLocation ?? null;
    const sourcePath = normalizeRepoRelativeSourcePath(node.sourcePath) ?? node.sourcePath;
    const tagName = node.tagName ?? (isComponentName(node.componentName) ? null : String(node.componentName).split(/[.\s"]/)[0] ?? null);

    if (sourceLocation && tagName) {
      hostNodes.push({
        sourceLocation,
        sourcePath,
        componentName: node.componentName,
        displayLabel: node.displayLabel ?? node.componentName,
        tagName,
        category,
        definitionId: definitionPlan.definitionId,
        templateToken,
      });
    }

    if (sourceLocation && isComponentName(node.componentName) && localComponentNames.has(node.componentName)) {
      localInvocations.push({
        sourceLocation,
        sourcePath,
        componentName: node.componentName,
        category,
        definitionId: definitionPlan.definitionId,
        placementToken: templateToken,
      });
    }

    walkDefinitionNodes(node.children ?? [], definitionPlan, localComponentNames, hostNodes, localInvocations);
  }
}

export function buildInstrumentationManifest(report) {
  const { definitions, definitionsByComponentName } = buildDefinitionPlanIndex(report);
  const hostNodes = [];
  const localInvocations = [];
  const localComponentNames = buildLocalComponentSet(report);

  for (const rootNode of report.normalizedTree ?? []) {
    if (rootNode.class !== "component-definition") continue;
    const definitionPlan = definitionsByComponentName.get(rootNode.componentName) ?? null;
    if (!definitionPlan) continue;
    walkDefinitionNodes(rootNode.children ?? [], definitionPlan, localComponentNames, hostNodes, localInvocations);
  }

  return {
    idVersion: WORKBENCH_SOURCE_ID_VERSION,
    file: normalizeRepoRelativeSourcePath(report.file) ?? report.file,
    definitions,
    hostNodes,
    localInvocations,
  };
}
