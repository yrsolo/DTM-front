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

const FUNCTION_COMPONENT = 0;
const CLASS_COMPONENT = 1;
const HOST_ROOT = 3;
const HOST_COMPONENT = 5;
const FORWARD_REF = 11;
const MEMO_COMPONENT = 14;
const SIMPLE_MEMO_COMPONENT = 15;

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
      if (value && typeof value === "object") return value as FiberRoot;
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
  if (["img", "svg", "picture", "canvas"].includes(tagName)) return "image";
  if (["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "label", "strong"].includes(tagName)) return "text";
  if (lowered.includes("button") || lowered.includes("control") || lowered.includes("input") || lowered.includes("filter")) return "control";
  if (lowered.includes("image") || lowered.includes("icon") || lowered.includes("logo")) return "image";
  if (lowered.includes("text") || lowered.includes("title") || lowered.includes("label")) return "text";
  if (lowered.includes("container") || lowered.includes("layout") || lowered.includes("wrapper")) return "container";
  return "content";
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

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
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
  const bounds = anchor?.getBoundingClientRect();
  return {
    id,
    sourceNodeId,
    bounds: bounds
      ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      : null,
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

export function buildFiberSourceGraph(
  rootElement: Element | null,
  registrations: InspectorRuntimeRegistration[]
): {
  rootNodes: SourceNode[];
  runtimeProjectionsById: Map<string, InspectorRuntimeProjection>;
  elementsBySourceNodeId: Map<SourceNodeId, Element>;
} | null {
  const fiberRoot = getContainerFiberRoot(rootElement);
  const hostRoot = fiberRoot?.current;
  if (!hostRoot) return null;

  const registrationByElement = buildRegistrationByElement(registrations);
  const runtimeProjectionsById = new Map<string, InspectorRuntimeProjection>();
  const elementsBySourceNodeId = new Map<SourceNodeId, Element>();
  const repeatedTemplateCounts = new Map<string, number>();

  const collectTemplateCounts = (firstChild: FiberNode | null | undefined) => {
    let child = firstChild ?? null;
    while (child) {
      if (isCompositeFiber(child.tag)) {
        const componentName = getComponentName(child) ?? "Anonymous component";
        const sourceLocation = getSourceLocation(child);
        const templateKey = getTemplateKey(componentName, sourceLocation);
        repeatedTemplateCounts.set(templateKey, (repeatedTemplateCounts.get(templateKey) ?? 0) + 1);
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
    let index = 0;

    while (child) {
      if (isCompositeFiber(child.tag)) {
        const componentName = getComponentName(child) ?? "Anonymous component";
        const label = humanizeLabel(componentName);
        const sourceLocation = getSourceLocation(child);
        const sourcePath = child._debugSource?.fileName ? normalizePath(child._debugSource.fileName) : null;
        const idSeed = sourceLocation ? `${sourceLocation}:${componentName}` : componentName;
        const sourceNodeId = parentId
          ? `${parentId}.${sanitizeIdPart(idSeed)}_${index}`
          : `src_${sanitizeIdPart(idSeed)}_${index}`;
        const definitionId = getDefinitionId(componentName, sourcePath);
        const definitionBindingKey = getDefinitionBindingKey(componentName, sourcePath);
        const templateKey = getTemplateKey(componentName, sourceLocation);
        const repeatedGroupId =
          (repeatedTemplateCounts.get(templateKey) ?? 0) > 1 ? `grp_${templateKey}` : null;
        const repeatedGroupBindingKey =
          repeatedGroupId ? getRepeatedGroupBindingKey(componentName, sourcePath, sourceLocation) : null;
        const placementBindingKey = getPlacementBindingKey(componentName, sourcePath, sourceLocation);
        const anchor = resolveFiberAnchorElement(child);
        const registration = anchor ? registrationByElement.get(anchor) : undefined;
        const ownerComponentPath = buildOwnerComponentPath([...parentOwnerComponents, componentName]);
        const projectionId = registration?.id ?? `proj_${sourceNodeId}`;
        const projection = toProjection(projectionId, sourceNodeId, anchor);
        runtimeProjectionsById.set(projection.id, projection);
        if (anchor) {
          elementsBySourceNodeId.set(sourceNodeId, anchor);
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
        index += 1;
      } else if (child.tag === HOST_ROOT) {
        output.push(...buildChildren(child.child, parentPath, parentOwnerComponents, parentId, depth, parentContext));
      } else if (child.child) {
        output.push(...buildChildren(child.child, parentPath, parentOwnerComponents, parentId, depth, parentContext));
      }
      child = child.sibling ?? null;
    }

    return output;
  };

  const rootNodes = buildChildren(hostRoot.child, [], [], null, 0, null);
  if (!rootNodes.length) return null;
  return {
    rootNodes,
    runtimeProjectionsById,
    elementsBySourceNodeId,
  };
}
