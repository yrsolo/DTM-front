import type { SourceIdentityGraph, SourceParserAdapter, SourceParserContext } from "./types";

const EMPTY_GRAPH: SourceIdentityGraph = {
  definitions: [],
  placements: [],
  repeatedProjectionGroups: [],
};

export const noopSourceParserAdapter: SourceParserAdapter = {
  parse(_context: SourceParserContext): SourceIdentityGraph {
    return EMPTY_GRAPH;
  },
};
