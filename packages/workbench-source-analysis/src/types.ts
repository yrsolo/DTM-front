import type { DraftChangeScope, SourceBackedParameter, SourceNodeId, SourceValueOrigin } from "@dtm/workbench-contracts";

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
  displayLabel?: string;
  tagName?: string | null;
  sourcePath: string;
  sourceLocation?: string | null;
  nodeClass?: SourceNodeClass;
  repeated?: boolean;
  sourceBackedParameterCandidates?: SourceBackedParameterCandidate[];
  children: RawParsedSourceNode[];
};

export type NormalizedSourceNode = {
  id: SourceNodeId;
  class: SourceNodeClass;
  componentName: string;
  displayLabel?: string;
  tagName?: string | null;
  sourcePath: string;
  sourceLocation?: string | null;
  canonicalPath: string;
  repeated?: boolean;
  sourceBackedParameterCandidates?: SourceBackedParameterCandidate[];
  children: NormalizedSourceNode[];
};

export type SourceBackedParameterCandidate = Omit<SourceBackedParameter, "id" | "sourceNodeId"> & {
  origin: Omit<SourceValueOrigin, "displaySourcePath">;
  supportedScopes: DraftChangeScope[];
};

export type InstrumentationDefinitionPlan = {
  componentName: string;
  sourcePath: string;
  sourceLocation?: string | null;
  canonicalSymbolId?: string | null;
  definitionId: SourceNodeId;
  rootScopeId: string;
  isSurfaceBoundary?: boolean;
};

export type InstrumentationHostPlan = {
  sourceLocation: string;
  sourcePath: string;
  componentName: string;
  displayLabel: string;
  tagName: string;
  category: "placement" | "repeated-projection-group";
  definitionId: SourceNodeId;
  templateToken: string;
};

export type InstrumentationInvocationPlan = {
  sourceLocation: string;
  sourcePath: string;
  componentName: string;
  category: "placement" | "repeated-projection-group";
  definitionId: SourceNodeId;
  placementToken: string;
};

export type InstrumentationManifest = {
  idVersion: string;
  file: string;
  definitions: InstrumentationDefinitionPlan[];
  hostNodes: InstrumentationHostPlan[];
  localInvocations: InstrumentationInvocationPlan[];
};

export type SourceParserContext = {
  files: SourceParserFile[];
};

export type SourceParserAdapter = {
  parse(context: SourceParserContext): SourceIdentityGraph;
};
