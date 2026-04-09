export { noopSourceParserAdapter } from "./noopSourceParser";
export { classifyRawParsedSourceNode, normalizeParsedSourceTree } from "./normalizeParsedSourceTree";
export { projectNormalizedSourceTree } from "./projectNormalizedSourceTree";
export { buildInstrumentationManifest } from "./buildInstrumentationManifest.mjs";
export { buildSourceGraphSnapshot } from "./buildSourceGraphSnapshot.mjs";
export { workbenchAuthoringIdsPlugin } from "./viteWorkbenchAuthoringIds.mjs";
export type {
  ComponentDefinitionNode,
  InstrumentationDefinitionPlan,
  InstrumentationHostPlan,
  InstrumentationInvocationPlan,
  InstrumentationManifest,
  NormalizedSourceNode,
  PlacementNode,
  RawParsedSourceNode,
  RepeatedProjectionGroup,
  SourceIdentityGraph,
  SourceBackedParameterCandidate,
  SourceIdentityKind,
  SourceNodeClass,
  SourceParserAdapter,
  SourceParserContext,
  SourceParserFile,
} from "./types";
