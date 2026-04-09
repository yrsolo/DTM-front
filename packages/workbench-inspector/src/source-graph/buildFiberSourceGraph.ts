import type {
  InspectorNodeKind,
  InspectorRuntimeProjection,
  SourceNode,
  SourceNodeId,
} from "../contracts/types";
import type { InspectorRuntimeRegistration } from "../runtime/InspectorRuntimeRegistry";

type FiberNode = {
  tag: number;
  key?: string | null;
  type?: unknown;
  elementType?: unknown;
  stateNode?: unknown;
  return?: FiberNode | null;
  child?: FiberNode | null;
  sibling?: FiberNode | null;
  _debugSource?: { fileName?: string | null; lineNumber?: number | null; columnNumber?: number | null } | null;
};

type FiberRoot = {
  current?: FiberNode | null;
};

type FiberContext = {
  definitionId: SourceNodeId | null;
  templateKey: string | null;
};

type TraversalBudget = {
  startedAt: number;
  visited: number;
  maxVisited: number;
  maxDurationMs: number;
  aborted: boolean;
};

const FUNCTION_COMPONENT = 0;
const CLASS_COMPONENT = 1;
const HOST_ROOT = 3;
const HOST_COMPONENT = 5;
const FORWARD_REF = 11;
const MEMO_COMPONENT = 14;
const SIMPLE_MEMO_COMPONENT = 15;
const TECHNICAL_WRAPPER_NAMES = new Set([
  "Fragment",
  "React.Fragment",
  "StrictMode",
  "Suspense",
  "Profiler",
]);
const ENRICHMENT_WRAPPER_NAMES = new Set(["InspectorNodeBoundary"]);
const INTERACTIVE_HOST_TAGS = new Set(["button", "select", "input", "textarea", "a"]);
const TEXTUAL_HOST_TAGS = new Set(["span", "label", "strong", "em", "p", "h1", "h2", "h3", "h4", "h5", "h6", "text", "tspan"]);
const STRUCTURAL_HOST_TAGS = new Set(["form", "section", "header", "footer", "nav", "aside", "main", "article", "svg", "g"]);
const GRAPHICAL_HOST_TAGS = new Set(["img", "picture", "canvas", "image", "rect", "line", "path", "circle", "ellipse", "polyline", "polygon"]);
const CONDITIONAL_CONTAINER_TAGS = new Set(["div", "ul", "li", "g"]);
const STRUCTURAL_NAME_RE =
  /(Shell|Layout|Page|Panel|Section|Header|Footer|Body|Content|Toolbar|Group|Row|Column|Modal|Drawer|Sidebar|Dock|Surface|Frame|Wrapper|Container)$/;

function createTraversalBudget(): TraversalBudget {
  return {
    startedAt: typeof performance !== "undefined" ? performance.now() : Date.now(),
    visited: 0,
    maxVisited: 8000,
    maxDurationMs: 120,
    aborted: false,
  };
}

function touchTraversalBudget(budget: TraversalBudget): boolean {
  budget.visited += 1;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (budget.visited > budget.maxVisited || now - budget.startedAt > budget.maxDurationMs) {
    budget.aborted = true;
    return false;
  }
  return true;
}

function humanizeLabel(value: string): string {
  const normalized = value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (!normalized) return "Unnamed node";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getContainerFiberRoot(rootElement: Element | null): FiberRoot | null {
  if (!rootElement) return null;
  const elementRecord = rootElement as unknown as Record<string, unknown>;
  for (const key of Object.keys(elementRecord)) {
    if (key.startsWith("__reactContainer$")) {
      const value = elementRecord[key];
      if (!value || typeof value !== "object") continue;
      const fiberRoot = value as FiberRoot;
      if ("current" in fiberRoot) return fiberRoot;
      const hostRootFiber = value as FiberNode;
      if (hostRootFiber.tag === HOST_ROOT) {
        return { current: hostRootFiber };
      }
    }
    if (key.startsWith("__reactFiber$")) {
      const value = elementRecord[key];
      if (!value || typeof value !== "object") continue;
      const fiberNode = value as FiberNode;
      return { current: fiberNode };
    }
  }
  return null;
}

function isCompositeFiber(tag: number): boolean {
  return (
    tag === FUNCTION_COMPONENT ||
    tag === CLASS_COMPONENT ||
    tag === FORWARD_REF ||
    tag === MEMO_COMPONENT ||
    tag === SIMPLE_MEMO_COMPONENT
  );
}

function isSkippableCompositeName(name: string | null): boolean {
  if (!name) return false;
  return TECHNICAL_WRAPPER_NAMES.has(name) || ENRICHMENT_WRAPPER_NAMES.has(name);
}

function getComponentName(fiber: FiberNode): string | null {
  const typeCandidate = fiber.type ?? fiber.elementType;
  if (typeof typeCandidate === "string") return typeCandidate;
  if (typeof typeCandidate === "function") {
    const component = typeCandidate as { displayName?: string; name?: string };
    return component.displayName || component.name || null;
  }
  if (typeCandidate && typeof typeCandidate === "object") {
    const component = typeCandidate as { displayName?: string; name?: string; render?: { displayName?: string; name?: string } };
    return component.displayName || component.name || component.render?.displayName || component.render?.name || null;
  }
  return null;
}

function resolveFiberAnchorElement(fiber: FiberNode | null | undefined): Element | null {
  const visit = (node: FiberNode | null | undefined): Element | null => {
    if (!node) return null;
    if (node.tag === HOST_COMPONENT && node.stateNode instanceof Element) {
      return node.stateNode;
    }
    let child = node.child ?? null;
    while (child) {
      const resolved = visit(child);
      if (resolved) return resolved;
      child = child.sibling ?? null;
    }
    return null;
  };
  return visit(fiber);
}

function inferKind(name: string, anchor: Element | null): InspectorNodeKind {
  const lowered = name.toLowerCase();
  const tagName = anchor?.tagName?.toLowerCase() ?? lowered;
  if (["button", "input", "select", "textarea", "a"].includes(tagName)) return "control";
  if (["img", "svg", "picture", "canvas", ...GRAPHICAL_HOST_TAGS].includes(tagName)) return "image";
  if (["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "label", "strong", "text", "tspan"].includes(tagName)) return "text";
  if (lowered.includes("button") || lowered.includes("control") || lowered.includes("input") || lowered.includes("filter")) return "control";
  if (lowered.includes("image") || lowered.includes("icon") || lowered.includes("logo")) return "image";
  if (lowered.includes("text") || lowered.includes("title") || lowered.includes("label")) return "text";
  if (lowered.includes("container") || lowered.includes("layout") || lowered.includes("wrapper")) return "container";
  return "content";
}

function isMeaningfulHostTag(tagName: string): boolean {
  return (
    INTERACTIVE_HOST_TAGS.has(tagName) ||
    TEXTUAL_HOST_TAGS.has(tagName) ||
    STRUCTURAL_HOST_TAGS.has(tagName) ||
    GRAPHICAL_HOST_TAGS.has(tagName)
  );
}

function getFirstClassName(anchor: Element | null): string {
  if (!(anchor instanceof HTMLElement) && !(anchor instanceof SVGElement)) return "";
  const className =
    typeof anchor.className === "string"
      ? anchor.className
      : typeof anchor.className?.baseVal === "string"
        ? anchor.className.baseVal
        : "";
  return className.trim().split(/\s+/)[0] ?? "";
}

function normalizeInlineText(value: string | null | undefined, maxLength = 48): string {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getHostInlineText(anchor: Element | null): string {
  if (!anchor) return "";
  if (anchor instanceof HTMLInputElement) {
    return normalizeInlineText(anchor.value || anchor.placeholder || anchor.getAttribute("aria-label"));
  }
  if (anchor instanceof HTMLTextAreaElement) {
    return normalizeInlineText(anchor.value || anchor.placeholder || anchor.getAttribute("aria-label"));
  }
  if (anchor instanceof HTMLSelectElement) {
    const selectedLabel =
      anchor.selectedOptions?.length
        ? [...anchor.selectedOptions].map((option) => option.textContent ?? "").join(", ")
        : anchor.value;
    return normalizeInlineText(selectedLabel || anchor.getAttribute("aria-label"));
  }
  return normalizeInlineText(
    anchor.getAttribute("aria-label") ||
      anchor.getAttribute("title") ||
      anchor.textContent
  );
}

function getHostIdentityName(tagName: string, anchor: Element | null): string {
  if (INTERACTIVE_HOST_TAGS.has(tagName) || TEXTUAL_HOST_TAGS.has(tagName)) {
    return tagName;
  }
  const firstClassName = getFirstClassName(anchor);
  return firstClassName ? `${tagName}.${firstClassName}` : tagName;
}

function getHostDisplayLabel(tagName: string, anchor: Element | null): string {
  const ariaLabel = anchor?.getAttribute("aria-label")?.trim();
  if (ariaLabel) return `${tagName} "${ariaLabel}"`;
  const title = anchor?.getAttribute("title")?.trim();
  if (title) return `${tagName} "${title}"`;
  if (INTERACTIVE_HOST_TAGS.has(tagName) || TEXTUAL_HOST_TAGS.has(tagName)) {
    const inlineText = getHostInlineText(anchor);
    if (inlineText) return `${tagName} "${inlineText}"`;
  }
  return getHostIdentityName(tagName, anchor);
}

function shouldTrackHostTemplate(tagName: string): boolean {
  return tagName === "g";
}

function shouldKeepHostNode(tagName: string, anchor: Element | null, childNodes: SourceNode[]): boolean {
  if (isMeaningfulHostTag(tagName)) return true;
  if (!CONDITIONAL_CONTAINER_TAGS.has(tagName)) return false;
  const ariaLabel = anchor?.getAttribute("aria-label")?.trim();
  if (ariaLabel && childNodes.length > 0) return true;
  const firstClassName = getFirstClassName(anchor);
  if (!firstClassName) return false;
  if (childNodes.length > 1) return true;
  return (
    STRUCTURAL_NAME_RE.test(firstClassName) ||
    /(list|grid|card|item|dock|panel|toolbar|header|footer|row|column|group|section|board|canvas|surface|wrapper|container)/i.test(
      firstClassName
    )
  );
}

function buildPath(parts: string[]): string {
  return parts.filter(Boolean).join(" > ");
}

function buildOwnerComponentPath(parts: string[]): string {
  return parts.filter(Boolean).join(" > ");
}

function sanitizeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function getCanonicalSourceNodeId(anchor: Element | null | undefined): SourceNodeId | null {
  const sourceNodeId = anchor?.getAttribute("data-wb-id")?.trim() ?? "";
  return sourceNodeId ? (sourceNodeId as SourceNodeId) : null;
}

function normalizePath(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  const viteFsMatch = normalized.match(/^https?:\/\/[^/]+\/@fs\/(.+)$/i);
  if (viteFsMatch?.[1]) return viteFsMatch[1];
  if (normalized.startsWith("/@fs/")) return normalized.slice("/@fs/".length);
  return normalized;
}

function getSourceLocation(fiber: FiberNode): string | null {
  const source = fiber._debugSource;
  if (!source?.fileName) return null;
  const line = source.lineNumber ?? 0;
  const column = source.columnNumber ?? 0;
  return `${normalizePath(source.fileName)}:${line}:${column}`;
}

function getDefinitionId(componentName: string, sourcePath: string | null): SourceNodeId {
  const seed = sourcePath ? `${sourcePath}:${componentName}` : componentName;
  return `def_${sanitizeIdPart(seed)}`;
}

function getDefinitionBindingKey(componentName: string, sourcePath: string | null): string | null {
  return sourcePath ? `def:${sourcePath}:${componentName}` : null;
}

function getTemplateKey(componentName: string, sourceLocation: string | null): string {
  return sanitizeIdPart(sourceLocation ? `${sourceLocation}:${componentName}` : componentName);
}

function getPlacementBindingKey(componentName: string, sourcePath: string | null, sourceLocation: string | null): string | null {
  if (!sourcePath || !sourceLocation) return null;
  return `plc:${sourcePath}:${sourceLocation}:${componentName}`;
}

function getRepeatedGroupBindingKey(componentName: string, sourcePath: string | null, sourceLocation: string | null): string | null {
  if (!sourcePath || !sourceLocation) return null;
  return `rpt:${sourcePath}:${sourceLocation}:${componentName}`;
}

function toProjection(id: string, sourceNodeId: SourceNodeId, anchor: Element | null): InspectorRuntimeProjection {
  return {
    id,
    sourceNodeId,
    bounds: null,
    isVisible: Boolean(anchor),
    isInteractive:
      anchor instanceof HTMLElement ? anchor.tabIndex >= 0 || typeof anchor.onclick === "function" : false,
    tagName: anchor?.tagName?.toLowerCase() ?? "component",
  };
}

function buildRegistrationByElement(registrations: InspectorRuntimeRegistration[]): Map<Element, InspectorRuntimeRegistration> {
  const map = new Map<Element, InspectorRuntimeRegistration>();
  for (const registration of registrations) {
    if (registration.anchorElement) {
      map.set(registration.anchorElement, registration);
    }
  }
  return map;
}

function createRepeatedGroupNode(groupedNodes: SourceNode[], parentId: string | null, depth: number): SourceNode | null {
  const first = groupedNodes[0];
  const bindingKey = typeof first.meta?.repeatedGroupBindingKey === "string" ? first.meta.repeatedGroupBindingKey : null;
  if (!first || !bindingKey) return null;
  const projectionIds = [...new Set(groupedNodes.flatMap((node) => node.runtimeProjectionIds ?? []))];
  const repeatedCount = projectionIds.length || groupedNodes.length;
  const label = humanizeLabel(first.componentName ?? first.label);
  const groupId = `rgrp_${sanitizeIdPart(bindingKey)}`;

  return {
    id: groupId,
    label,
    category: "repeated-projection-group",
    bindingKey,
    componentName: first.componentName,
    kind: first.kind,
    path: first.path,
    ownerPath: first.ownerPath ?? null,
    sourcePath: first.sourcePath ?? null,
    sourceLocation: first.sourceLocation ?? null,
    definitionId: first.definitionId ?? null,
    placementId: null,
    repeatedGroupId: groupId,
    depth,
    parentId,
    children: (first.children ?? []).map((child) => ({
      ...child,
      parentId: groupId,
      depth: depth + 1,
    })),
    semanticTargetId: first.semanticTargetId ?? null,
    meta: {
      ...(first.meta ?? {}),
      repeatedCount,
      sourceNodeClass: "runtime-repeated-group",
    },
    runtimeProjectionIds: projectionIds,
  };
}

function collapseRepeatedProjectionGroups(nodes: SourceNode[], parentId: string | null, depth: number): SourceNode[] {
  const normalizedNodes = nodes.map((node) => ({
    ...node,
    parentId,
    depth,
    children: collapseRepeatedProjectionGroups(node.children ?? [], node.id, depth + 1),
  }));

  const output: SourceNode[] = [];
  const repeatedBuckets = new Map<string, SourceNode[]>();

  for (const node of normalizedNodes) {
    const bindingKey = typeof node.meta?.repeatedGroupBindingKey === "string" ? node.meta.repeatedGroupBindingKey : null;
    const repeatedCount = Number(node.meta?.repeatedCount ?? 0);
    if (bindingKey && repeatedCount > 1) {
      const bucket = repeatedBuckets.get(bindingKey) ?? [];
      bucket.push(node);
      repeatedBuckets.set(bindingKey, bucket);
      continue;
    }
    output.push(node);
  }

  for (const groupedNodes of repeatedBuckets.values()) {
    const groupNode = createRepeatedGroupNode(groupedNodes, parentId, depth);
    if (groupNode) {
      output.push(groupNode);
      continue;
    }
    output.push(...groupedNodes);
  }

  return output;
}

export function buildFiberSourceGraph(
  rootElement: Element | null,
  registrations: InspectorRuntimeRegistration[]
): {
  rootNodes: SourceNode[];
  runtimeProjectionsById: Map<string, InspectorRuntimeProjection>;
  elementsBySourceNodeId: Map<SourceNodeId, Element>;
  elementsByProjectionId: Map<string, Element>;
  debug: {
    aborted: boolean;
    visited: number;
    durationMs: number;
  };
} | null {
  const fiberRoot = getContainerFiberRoot(rootElement);
  const hostRoot = fiberRoot?.current;
  if (!hostRoot) return null;

  const registrationByElement = buildRegistrationByElement(registrations);
  const runtimeProjectionsById = new Map<string, InspectorRuntimeProjection>();
  const elementsBySourceNodeId = new Map<SourceNodeId, Element>();
  const elementsByProjectionId = new Map<string, Element>();
  const repeatedTemplateCounts = new Map<string, number>();
  const siblingOccurrenceCounts = new Map<string, number>();
  const templateCountBudget = createTraversalBudget();
  templateCountBudget.maxVisited = 4000;
  templateCountBudget.maxDurationMs = 40;
  const traversalBudget = createTraversalBudget();
  traversalBudget.maxVisited = 16000;
  traversalBudget.maxDurationMs = 80;

  const takeSiblingOccurrenceIndex = (parentId: string | null, idSeed: string): number => {
    const key = `${parentId ?? "__root__"}::${idSeed}`;
    const next = siblingOccurrenceCounts.get(key) ?? 0;
    siblingOccurrenceCounts.set(key, next + 1);
    return next;
  };

  const collectTemplateCounts = (firstChild: FiberNode | null | undefined) => {
    let child = firstChild ?? null;
    while (child) {
      if (!touchTraversalBudget(templateCountBudget)) return;
      if (isCompositeFiber(child.tag)) {
        const componentName = getComponentName(child) ?? "Anonymous component";
        const sourceLocation = getSourceLocation(child);
        const templateKey = getTemplateKey(componentName, sourceLocation);
        repeatedTemplateCounts.set(templateKey, (repeatedTemplateCounts.get(templateKey) ?? 0) + 1);
        collectTemplateCounts(child.child);
      } else if (child.tag === HOST_COMPONENT && child.stateNode instanceof Element) {
        const anchor = child.stateNode;
        const tagName = anchor.tagName.toLowerCase();
        if (shouldTrackHostTemplate(tagName)) {
          const componentName = getHostIdentityName(tagName, anchor);
          const sourceLocation = getSourceLocation(child);
          const templateKey = getTemplateKey(componentName, sourceLocation);
          repeatedTemplateCounts.set(templateKey, (repeatedTemplateCounts.get(templateKey) ?? 0) + 1);
        }
        collectTemplateCounts(child.child);
      } else if (child.child) {
        collectTemplateCounts(child.child);
      }
      child = child.sibling ?? null;
    }
  };
  collectTemplateCounts(hostRoot.child);

  const buildChildren = (
    firstChild: FiberNode | null | undefined,
    parentPath: string[],
    parentOwnerComponents: string[],
    parentId: string | null,
    depth: number,
    parentContext: FiberContext | null
  ): SourceNode[] => {
    const output: SourceNode[] = [];
    let child = firstChild ?? null;

    while (child) {
      if (!touchTraversalBudget(traversalBudget)) return output;
      if (isCompositeFiber(child.tag)) {
        const componentName = getComponentName(child) ?? "Anonymous component";
        if (isSkippableCompositeName(componentName)) {
          output.push(...buildChildren(child.child, parentPath, parentOwnerComponents, parentId, depth, parentContext));
          child = child.sibling ?? null;
          continue;
        }
        const label = humanizeLabel(componentName);
        const sourceLocation = getSourceLocation(child);
        const sourcePath = child._debugSource?.fileName ? normalizePath(child._debugSource.fileName) : null;
        const idSeed = sourceLocation ? `${sourceLocation}:${componentName}` : componentName;
        const occurrenceIndex = takeSiblingOccurrenceIndex(parentId, idSeed);
        const sourceNodeId = parentId
          ? `${parentId}.${sanitizeIdPart(idSeed)}_${occurrenceIndex}`
          : `src_${sanitizeIdPart(idSeed)}_${occurrenceIndex}`;
        const definitionId = getDefinitionId(componentName, sourcePath);
        const definitionBindingKey = getDefinitionBindingKey(componentName, sourcePath);
        const templateKey = getTemplateKey(componentName, sourceLocation);
        const repeatedGroupBindingKey =
          (repeatedTemplateCounts.get(templateKey) ?? 0) > 1
            ? getRepeatedGroupBindingKey(componentName, sourcePath, sourceLocation)
            : null;
        const repeatedGroupId = repeatedGroupBindingKey;
        const placementBindingKey = getPlacementBindingKey(componentName, sourcePath, sourceLocation);
        const anchor = resolveFiberAnchorElement(child);
        const registration = anchor ? registrationByElement.get(anchor) : undefined;
        const canonicalSourceNodeId = getCanonicalSourceNodeId(anchor);
        const ownerComponentPath = buildOwnerComponentPath([...parentOwnerComponents, componentName]);
        const projectionId = registration?.id ?? `proj_${sourceNodeId}`;
        const projection = toProjection(projectionId, sourceNodeId, anchor);
        runtimeProjectionsById.set(projection.id, projection);
        if (anchor) {
          elementsBySourceNodeId.set(sourceNodeId, anchor);
          elementsByProjectionId.set(projection.id, anchor);
        }

        const node: SourceNode = {
          id: sourceNodeId,
          label: registration?.label?.trim() || label,
          category: "placement",
          bindingKey: placementBindingKey,
          componentName,
          kind: registration?.kind ?? inferKind(componentName, anchor),
          path: buildPath([...parentPath, registration?.label?.trim() || label]),
          ownerPath: ownerComponentPath,
          sourcePath: registration?.sourcePath ?? sourcePath,
          sourceLocation,
          definitionId,
          placementId: sourceNodeId,
          repeatedGroupId,
          depth,
          parentId,
          children: buildChildren(
            child.child,
            [...parentPath, registration?.label?.trim() || label],
            [...parentOwnerComponents, componentName],
            sourceNodeId,
            depth + 1,
            { definitionId, templateKey }
          ),
          semanticTargetId: registration?.semanticTargetId ?? null,
          meta: {
            ...(registration?.debugName ? { debugName: registration.debugName } : {}),
            ...(canonicalSourceNodeId ? { canonicalSourceNodeId } : {}),
            definitionId,
            definitionBindingKey,
            repeatedGroupId,
            repeatedGroupBindingKey,
            repeatedCount: repeatedTemplateCounts.get(templateKey) ?? 1,
            parentDefinitionId: parentContext?.definitionId ?? null,
            parentTemplateKey: parentContext?.templateKey ?? null,
          },
          runtimeProjectionIds: [projection.id],
        };
        output.push(node);
      } else if (child.tag === HOST_COMPONENT && child.stateNode instanceof Element) {
        const anchor = child.stateNode;
        const tagName = anchor.tagName.toLowerCase();
        const sourceLocation = getSourceLocation(child);
        const sourcePath = child._debugSource?.fileName ? normalizePath(child._debugSource.fileName) : null;
        const flattenedChildNodes = buildChildren(
          child.child,
          parentPath,
          parentOwnerComponents,
          parentId,
          depth,
          parentContext
        );

        if (!shouldKeepHostNode(tagName, anchor, flattenedChildNodes)) {
          output.push(...flattenedChildNodes);
          child = child.sibling ?? null;
          continue;
        }

        const componentName = getHostIdentityName(tagName, anchor);
        const displayLabel = getHostDisplayLabel(tagName, anchor);
        const label = displayLabel || humanizeLabel(componentName);
        const idSeed = sourceLocation ? `${sourceLocation}:${componentName}` : componentName;
        const occurrenceIndex = takeSiblingOccurrenceIndex(parentId, idSeed);
        const canonicalSourceNodeId = getCanonicalSourceNodeId(anchor);
        const sourceNodeId =
          canonicalSourceNodeId ??
          (parentId ? `${parentId}.${sanitizeIdPart(idSeed)}_${occurrenceIndex}` : `src_${sanitizeIdPart(idSeed)}_${occurrenceIndex}`);
        const templateKey = getTemplateKey(componentName, sourceLocation);
        const repeatedGroupBindingKey =
          shouldTrackHostTemplate(tagName) && (repeatedTemplateCounts.get(templateKey) ?? 0) > 1
            ? getRepeatedGroupBindingKey(componentName, sourcePath, sourceLocation)
            : null;
        const repeatedGroupId = repeatedGroupBindingKey;
        const path = buildPath([...parentPath, componentName]);
        const ownerPath = buildOwnerComponentPath([...parentOwnerComponents, componentName]);
        const projectionId = `proj_${sourceNodeId}`;
        const projection = toProjection(projectionId, sourceNodeId, anchor);
        runtimeProjectionsById.set(projection.id, projection);
        elementsBySourceNodeId.set(sourceNodeId, anchor);
        elementsByProjectionId.set(projection.id, anchor);
        const childNodes = buildChildren(
          child.child,
          [...parentPath, label],
          [...parentOwnerComponents, componentName],
          sourceNodeId,
          depth + 1,
          parentContext
        );

        output.push({
          id: sourceNodeId,
          label,
          category: "placement",
          bindingKey: canonicalSourceNodeId ?? getPlacementBindingKey(componentName, sourcePath, sourceLocation),
          componentName,
          kind: inferKind(componentName, anchor),
          path,
          ownerPath,
          sourcePath,
          sourceLocation,
          definitionId: null,
          placementId: sourceNodeId,
          repeatedGroupId,
          depth,
          parentId,
          children: childNodes,
          semanticTargetId: null,
          meta: {
            displayLabel,
            ...(canonicalSourceNodeId ? { canonicalSourceNodeId } : {}),
            repeatedGroupId,
            repeatedGroupBindingKey,
            repeatedCount: repeatedTemplateCounts.get(templateKey) ?? 1,
            parentDefinitionId: parentContext?.definitionId ?? null,
            parentTemplateKey: parentContext?.templateKey ?? null,
          },
          runtimeProjectionIds: [projection.id],
        });
      } else if (child.tag === HOST_ROOT) {
        output.push(...buildChildren(child.child, parentPath, parentOwnerComponents, parentId, depth, parentContext));
      } else if (child.child) {
        output.push(...buildChildren(child.child, parentPath, parentOwnerComponents, parentId, depth, parentContext));
      }
      child = child.sibling ?? null;
    }

    return output;
  };

  const rootNodes = collapseRepeatedProjectionGroups(buildChildren(hostRoot.child, [], [], null, 0, null), null, 0);
  if (!rootNodes.length) return null;
  const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    rootNodes,
    runtimeProjectionsById,
    elementsBySourceNodeId,
    elementsByProjectionId,
    debug: {
      aborted: traversalBudget.aborted,
      visited: traversalBudget.visited,
      durationMs: Math.max(0, finishedAt - traversalBudget.startedAt),
    },
  };
}
