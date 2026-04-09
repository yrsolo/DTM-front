const WORKBENCH_SOURCE_ID_VERSION = "wbid-v1";
const REPO_ROOT_SEGMENTS = ["apps", "packages", "docs", "scripts", "work", "presentation", "agent"];

function toForwardSlashes(value) {
  return String(value || "").replace(/\\/g, "/");
}

function stripFsPrefixes(value) {
  const normalized = toForwardSlashes(value);
  return normalized
    .replace(/^https?:\/\/[^/]+\/@fs\//i, "")
    .replace(/^\/@fs\//i, "")
    .replace(/^file:\/\//i, "");
}

export function normalizeRepoRelativeSourcePath(value) {
  if (!value) return null;
  const normalized = stripFsPrefixes(value).trim();
  if (!normalized) return null;

  const matcher = new RegExp(`(?:^|/)(${REPO_ROOT_SEGMENTS.join("|")})/`, "i");
  const match = matcher.exec(normalized);
  if (match?.index != null) {
    const startIndex = normalized[match.index] === "/" ? match.index + 1 : match.index;
    return normalized.slice(startIndex);
  }

  return normalized.replace(/^[A-Za-z]:\//, "");
}

export function normalizeRepoRelativeSourceLocation(value) {
  if (!value) return null;
  const normalized = stripFsPrefixes(value);
  const match = /^(.*?):(\d+):(\d+)$/.exec(normalized);
  if (!match) return normalizeRepoRelativeSourcePath(normalized);
  const sourcePath = normalizeRepoRelativeSourcePath(match[1]);
  if (!sourcePath) return null;
  return `${sourcePath}:${match[2]}:${match[3]}`;
}

function hashString(value) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const input = String(value);
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(36);
}

function createOpaqueId(prefix, parts) {
  const normalizedParts = parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean);
  return `${prefix}_${hashString([WORKBENCH_SOURCE_ID_VERSION, ...normalizedParts].join("|"))}`;
}

export function createDefinitionId(input) {
  return createOpaqueId("def", [normalizeRepoRelativeSourcePath(input.sourcePath), input.exportName]);
}

export function createDefinitionRootScopeId(definitionId) {
  return createOpaqueId("scp", [definitionId, "root"]);
}

export function createTemplateNodeToken(input) {
  return createOpaqueId("tpl", [input.definitionId, input.canonicalPath, input.componentName, input.nodeClass]);
}

export function createPlacementScopeId(parentScopeId, placementToken) {
  return createOpaqueId("scp", [parentScopeId, placementToken]);
}

export function getSourceNodeIdPrefix(category) {
  if (category === "component-definition") return "defn";
  if (category === "repeated-projection-group") return "rpt";
  return "src";
}

export function createSourceNodeId(scopeId, templateToken, category) {
  return createOpaqueId(getSourceNodeIdPrefix(category), [scopeId, templateToken, category]);
}

export function __wbNextScope(parentScopeId, placementToken) {
  return createPlacementScopeId(parentScopeId, placementToken);
}

export function __wbNodeId(scopeId, templateToken, category) {
  return createSourceNodeId(scopeId, templateToken, category);
}

export { WORKBENCH_SOURCE_ID_VERSION };
