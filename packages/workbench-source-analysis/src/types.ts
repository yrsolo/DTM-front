import type { SourceNodeId } from "@dtm/workbench-contracts";

export type SourceIdentityKind = "component-definition" | "placement";
export type SourceNodeClass =
  | "component-definition"
  | "placement"
  | "structural"
  | "repeated-pattern"
  | "technical-wrapper"
  | "enrichment-wrapper";

export type ComponentDefinitionNode = {
  id: SourceNodeId;
  kind: "component-definition";
  componentName: string;
  sourcePath: string;
  exportName?: string | null;
};

export type PlacementNode = {
  id: SourceNodeId;
  kind: "placement";
  componentDefinitionId: SourceNodeId;
  parentPlacementId?: SourceNodeId | null;
  placementPath: string;
  sourcePath: string;
  sourceLocation?: string | null;
};

export type RepeatedProjectionGroup = {
  id: SourceNodeId;
  sourcePlacementId: SourceNodeId;
  templateKey: string;
};

export type SourceIdentityRecord = ComponentDefinitionNode | PlacementNode;

export type SourceIdentityGraph = {
  definitions: ComponentDefinitionNode[];
  placements: PlacementNode[];
  repeatedProjectionGroups: RepeatedProjectionGroup[];
};

export type SourceParserFile = {
  path: string;
  content: string;
};

export type RawParsedSourceNode = {
  rawId: string;
  componentName: string;
  sourcePath: string;
  sourceLocation?: string | null;
  nodeClass?: SourceNodeClass;
  repeated?: boolean;
  children: RawParsedSourceNode[];
};

export type NormalizedSourceNode = {
  id: SourceNodeId;
  class: SourceNodeClass;
  componentName: string;
  sourcePath: string;
  sourceLocation?: string | null;
  canonicalPath: string;
  repeated?: boolean;
  children: NormalizedSourceNode[];
};

export type SourceParserContext = {
  files: SourceParserFile[];
};

export type SourceParserAdapter = {
  parse(context: SourceParserContext): SourceIdentityGraph;
};
