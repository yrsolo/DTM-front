export const WORKBENCH_SOURCE_ID_VERSION: string;

export function normalizeRepoRelativeSourcePath(value: string | null | undefined): string | null;
export function normalizeRepoRelativeSourceLocation(value: string | null | undefined): string | null;

export function createDefinitionId(input: {
  sourcePath: string | null | undefined;
  exportName: string | null | undefined;
}): string;

export function createDefinitionRootScopeId(definitionId: string): string;
export function createTemplateNodeToken(input: {
  definitionId: string;
  canonicalPath: string;
  componentName: string;
  nodeClass: string;
}): string;
export function createPlacementScopeId(parentScopeId: string, placementToken: string): string;
export function getSourceNodeIdPrefix(category: "component-definition" | "placement" | "repeated-projection-group"): string;
export function createSourceNodeId(
  scopeId: string,
  templateToken: string,
  category: "component-definition" | "placement" | "repeated-projection-group"
): string;
export function __wbNextScope(parentScopeId: string, placementToken: string): string;
export function __wbNodeId(
  scopeId: string,
  templateToken: string,
  category: "component-definition" | "placement" | "repeated-projection-group"
): string;
