import type {
  InspectorNode,
  InspectorNodeBounds,
  InspectorNodeId,
  InspectorNodeKind,
  InspectorTreeFilterMode,
} from "../contracts/types";

type ScanResult = {
  rootNodes: InspectorNode[];
  nodesById: Map<InspectorNodeId, InspectorNode>;
  elementsById: Map<InspectorNodeId, Element>;
};

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "HEAD", "BR"]);

function toBounds(rect: DOMRect): InspectorNodeBounds | null {
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return null;
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function isVisibleElement(element: Element): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isInteractiveElement(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();
  if (["button", "a", "input", "select", "textarea", "summary"].includes(tagName)) return true;
  if (typeof element.onclick === "function") return true;
  if (element.getAttribute("role") === "button") return true;
  const tabIndex = element.tabIndex;
  return Number.isFinite(tabIndex) && tabIndex >= 0;
}

function getNodeKind(element: Element, semanticTargetId: string | null): InspectorNodeKind {
  const tagName = element.tagName.toLowerCase();
  if (semanticTargetId) return "semantic";
  if (isInteractiveElement(element)) return "control";
  if (["img", "svg", "canvas", "picture", "video"].includes(tagName)) return "image";
  if (!element.children.length && (element.textContent ?? "").trim()) return "text";
  if (["section", "article", "aside", "header", "footer", "nav", "main", "form"].includes(tagName)) return "content";
  if (["div", "span", "ul", "ol", "li"].includes(tagName)) return "container";
  return "unknown";
}

function getMeaningfulText(element: Element): string | null {
  const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > 32 ? `${text.slice(0, 29)}...` : text;
}

function getNodeLabel(element: Element, semanticTargetId: string | null): string {
  if (semanticTargetId) return semanticTargetId;
  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;
  const title = element.getAttribute("title")?.trim();
  if (title) return title;
  const text = getMeaningfulText(element);
  if (text) return text;
  return element.tagName.toLowerCase();
}

function isMeaningfulElement(element: Element, filterMode: InspectorTreeFilterMode): boolean {
  if (filterMode === "all") return true;
  if (!isVisibleElement(element)) return false;
  if (element instanceof HTMLElement && element.dataset.workbenchInspectorShell) return false;
  const semanticTargetId = element.getAttribute("data-inspector-target-id")?.trim();
  if (semanticTargetId) return true;
  if (isInteractiveElement(element)) return true;
  if (element.getAttribute("role")) return true;
  if (element.getAttribute("aria-label")) return true;
  if (["img", "svg", "canvas", "picture", "video", "main", "section", "article", "aside", "nav", "header", "footer", "form"].includes(element.tagName.toLowerCase())) {
    return true;
  }
  if (!element.children.length && Boolean(getMeaningfulText(element))) return true;
  return false;
}

export function scanInspectorDom(filterMode: InspectorTreeFilterMode): ScanResult {
  const nodesById = new Map<InspectorNodeId, InspectorNode>();
  const elementsById = new Map<InspectorNodeId, Element>();

  const walk = (
    element: Element,
    parentId: InspectorNodeId | null,
    pathSegments: string[]
  ): InspectorNode[] => {
    if (SKIP_TAGS.has(element.tagName)) return [];
    if (element.closest("[data-workbench-inspector-shell='true']")) return [];

    const childElements = Array.from(element.children).filter((child): child is Element => child instanceof Element);
    const nextPathSegments = [...pathSegments, `${element.tagName.toLowerCase()}:${pathSegments.length}`];
    const semanticTargetId = element.getAttribute("data-inspector-target-id")?.trim() ?? null;
    const shouldInclude = isMeaningfulElement(element, filterMode);
    const nodeId = nextPathSegments.join("/");
    const children = childElements.flatMap((child, index) =>
      walk(child, shouldInclude ? nodeId : parentId, [...nextPathSegments, `child:${index}`])
    );

    if (!shouldInclude) {
      return children;
    }

    const node: InspectorNode = {
      id: nodeId,
      label: getNodeLabel(element, semanticTargetId),
      kind: getNodeKind(element, semanticTargetId),
      tagName: element.tagName.toLowerCase(),
      path: nextPathSegments.join(" > "),
      depth: pathSegments.length,
      parentId,
      children,
      bounds: toBounds(element.getBoundingClientRect()),
      isVisible: isVisibleElement(element),
      isInteractive: isInteractiveElement(element),
      semanticTargetId,
    };

    nodesById.set(node.id, node);
    elementsById.set(node.id, element);

    return [node];
  };

  const body = document.body;
  const rootNodes = Array.from(body.children)
    .filter((child): child is Element => child instanceof Element)
    .flatMap((child, index) => walk(child, null, [`root:${index}`]));

  return {
    rootNodes,
    nodesById,
    elementsById,
  };
}
