export { noopSourceParserAdapter } from "./noopSourceParser";
export { classifyRawParsedSourceNode, normalizeParsedSourceTree } from "./normalizeParsedSourceTree";
export { projectNormalizedSourceTree } from "./projectNormalizedSourceTree";
export { buildSourceGraphSnapshot } from "./buildSourceGraphSnapshot.mjs";
export type {
  ComponentDefinitionNode,
  NormalizedSourceNode,
  PlacementNode,
  RawParsedSourceNode,
  RepeatedProjectionGroup,
  SourceIdentityGraph,
  SourceIdentityKind,
  SourceNodeClass,
  SourceParserAdapter,
  SourceParserContext,
  SourceParserFile,
} from "./types";
