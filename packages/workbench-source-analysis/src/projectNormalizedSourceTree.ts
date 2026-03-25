import type { SourceNodeId } from "@dtm/workbench-contracts";
import type {
  ComponentDefinitionNode,
  NormalizedSourceNode,
  PlacementNode,
  RepeatedProjectionGroup,
  SourceIdentityGraph,
} from "./types";

function sanitizeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function fallbackDefinitionId(node: NormalizedSourceNode): SourceNodeId {
  return `def:${sanitizeIdPart(`${node.sourcePath}:${node.componentName}`)}`;
}

type ProjectionContext = {
  definitionId: SourceNodeId | null;
  parentPlacementId: SourceNodeId | null;
};

function projectNodes(
  nodes: NormalizedSourceNode[],
  context: ProjectionContext,
  graph: SourceIdentityGraph
): void {
  for (const node of nodes) {
    if (node.class === "component-definition") {
      const definition: ComponentDefinitionNode = {
        id: node.id,
        kind: "component-definition",
        componentName: node.componentName,
        sourcePath: node.sourcePath,
        exportName: node.componentName,
      };
      graph.definitions.push(definition);
      projectNodes(node.children, { definitionId: node.id, parentPlacementId: null }, graph);
      continue;
    }

    if (node.class === "placement") {
      const placement: PlacementNode = {
        id: node.id,
        kind: "placement",
        componentDefinitionId: context.definitionId ?? fallbackDefinitionId(node),
        parentPlacementId: context.parentPlacementId,
        placementPath: node.canonicalPath,
        sourcePath: node.sourcePath,
        sourceLocation: node.sourceLocation,
      };
      graph.placements.push(placement);
      projectNodes(
        node.children,
        { definitionId: context.definitionId, parentPlacementId: node.id },
        graph
      );
      continue;
    }

    if (node.class === "repeated-pattern" && context.parentPlacementId) {
      const repeatedGroup: RepeatedProjectionGroup = {
        id: node.id,
        sourcePlacementId: context.parentPlacementId,
        templateKey: node.canonicalPath,
      };
      graph.repeatedProjectionGroups.push(repeatedGroup);
    }

    projectNodes(node.children, context, graph);
  }
}

export function projectNormalizedSourceTree(nodes: NormalizedSourceNode[]): SourceIdentityGraph {
  const graph: SourceIdentityGraph = {
    definitions: [],
    placements: [],
    repeatedProjectionGroups: [],
  };
  projectNodes(nodes, { definitionId: null, parentPlacementId: null }, graph);
  return graph;
}
