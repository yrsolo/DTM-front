import type { NormalizedSourceNode, RawParsedSourceNode, SourceNodeClass } from "./types";

const TECHNICAL_WRAPPER_NAMES = new Set([
  "Fragment",
  "React.Fragment",
  "StrictMode",
  "Suspense",
  "Profiler",
]);

const ENRICHMENT_WRAPPER_NAMES = new Set(["InspectorNodeBoundary"]);

const STRUCTURAL_NAME_RE = /(Shell|Layout|Page|Panel|Section|Header|Footer|Body|Content|Toolbar|Group|Row|Column|Modal|Drawer|Sidebar|Dock|Surface|Frame|Wrapper|Container)$/;

function sanitizeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function buildCanonicalPath(parentPath: string, componentName: string, index: number): string {
  const segment = `${sanitizeIdPart(componentName)}:${index}`;
  return parentPath ? `${parentPath}/${segment}` : segment;
}

export function classifyRawParsedSourceNode(node: RawParsedSourceNode): SourceNodeClass {
  if (node.nodeClass) return node.nodeClass;
  if (ENRICHMENT_WRAPPER_NAMES.has(node.componentName)) return "enrichment-wrapper";
  if (TECHNICAL_WRAPPER_NAMES.has(node.componentName)) return "technical-wrapper";
  if (node.repeated) return "repeated-pattern";
  if (STRUCTURAL_NAME_RE.test(node.componentName)) return "structural";
  return "placement";
}

function shouldKeepStructuralNode(node: RawParsedSourceNode, normalizedChildren: NormalizedSourceNode[]): boolean {
  if (!normalizedChildren.length) return false;
  if (node.repeated) return true;
  if (normalizedChildren.length > 1) return true;
  return STRUCTURAL_NAME_RE.test(node.componentName);
}

function normalizeNodeList(
  rawNodes: RawParsedSourceNode[],
  parentPath: string,
  startIndex = 0
): NormalizedSourceNode[] {
  const normalized: NormalizedSourceNode[] = [];

  for (const rawNode of rawNodes) {
    const nodeClass = classifyRawParsedSourceNode(rawNode);
    const flattenedChildren = normalizeNodeList(rawNode.children, parentPath, startIndex + normalized.length);

    if (nodeClass === "technical-wrapper" || nodeClass === "enrichment-wrapper") {
      normalized.push(...flattenedChildren);
      continue;
    }

    if (nodeClass === "structural" && !shouldKeepStructuralNode(rawNode, flattenedChildren)) {
      normalized.push(...flattenedChildren);
      continue;
    }

    const canonicalPath = buildCanonicalPath(parentPath, rawNode.componentName, startIndex + normalized.length);
    const idPrefix =
      nodeClass === "repeated-pattern"
        ? "rpt"
        : nodeClass === "structural"
          ? "str"
          : nodeClass === "component-definition"
            ? "def"
            : "plc";

    const node: NormalizedSourceNode = {
      id: `${idPrefix}:${sanitizeIdPart(canonicalPath)}`,
      class: nodeClass,
      componentName: rawNode.componentName,
      sourcePath: rawNode.sourcePath,
      sourceLocation: rawNode.sourceLocation ?? null,
      canonicalPath,
      repeated: rawNode.repeated,
      children: normalizeNodeList(rawNode.children, canonicalPath),
    };
    normalized.push(node);
  }

  return normalized;
}

export function normalizeParsedSourceTree(rawNodes: RawParsedSourceNode[]): NormalizedSourceNode[] {
  return normalizeNodeList(rawNodes, "");
}
