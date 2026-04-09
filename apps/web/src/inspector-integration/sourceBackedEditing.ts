import type {
  SourceBackedApplyIssue,
  SourceBackedApplyResult,
  SourceBackedDraftChange,
  SourceSyncPatch,
  SourceSyncPatchOperation,
} from "@dtm/workbench-inspector";

type PreviewCleanup = () => void;

type PatchOperation = SourceSyncPatchOperation;

type SourcePatchPlanner = {
  previewSourceBackedDrafts(drafts: SourceBackedDraftChange[]): void;
  clearSourceBackedDraftPreview(): void;
  applySourceBackedDrafts(drafts: SourceBackedDraftChange[]): Promise<SourceBackedApplyResult>;
};

function parseSourceLocation(sourceLocation: string | null | undefined): { line: number; column: number } | null {
  if (!sourceLocation) return null;
  const match = sourceLocation.match(/:(\d+):(\d+)$/);
  if (!match) return null;
  const line = Number(match[1]);
  const column = Number(match[2]);
  if (!Number.isFinite(line) || !Number.isFinite(column)) return null;
  return { line, column };
}

function toAbsoluteSourcePath(draft: SourceBackedDraftChange): string | null {
  return draft.origin.resolvedSourcePath ?? null;
}

function toViteSourceUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, "/");
  return `/@fs/${normalized}`;
}

async function fetchSourceText(absolutePath: string): Promise<string> {
  const response = await fetch(toViteSourceUrl(absolutePath), {
    headers: { accept: "text/plain" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load source file: ${absolutePath}`);
  }
  return response.text();
}

function toCssPropertyName(input: string | null | undefined): string | null {
  if (!input) return null;
  if (input.includes("-")) return input.toLowerCase();
  return input.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function escapeAttributeSelector(value: string): string {
  const escapeFn = typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape.bind(CSS)
    : (input: string) => input.replace(/["\\]/g, "\\$&");
  return `[data-wb-id="${escapeFn(value)}"]`;
}

function getElementsForDraft(draft: SourceBackedDraftChange): Element[] {
  if (typeof document === "undefined") return [];
  return [...document.querySelectorAll(escapeAttributeSelector(draft.sourceNodeId))];
}

function coerceFiniteNumber(input: string | number | null | undefined): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  const normalized = input.trim().replace(",", ".");
  if (!normalized) return null;
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function getRuntimeCurrentValue(element: Element, draft: SourceBackedDraftChange): string | null {
  if (draft.origin.astPath === "child:text") {
    return element.textContent ?? null;
  }

  if (draft.cssProperty) {
    const cssProperty = toCssPropertyName(draft.cssProperty) ?? draft.cssProperty;
    if (element instanceof HTMLElement || element instanceof SVGElement) {
      const inlineValue = element.style.getPropertyValue(cssProperty);
      if (inlineValue) return inlineValue;
      const computed = window.getComputedStyle(element as Element).getPropertyValue(cssProperty);
      return computed || null;
    }
  }

  if (draft.origin.astPath.startsWith("attr:")) {
    const attributeName = draft.origin.astPath.slice("attr:".length).split(".")[0] ?? "";
    const direct = element.getAttribute(attributeName);
    if (direct != null) return direct;
    const elementRecord = element as unknown as Record<string, unknown>;
    if (attributeName in elementRecord) {
      const value = elementRecord[attributeName];
      return value == null ? null : String(value);
    }
  }

  return null;
}

function applyPreviewStyle(elements: Element[], cssProperty: string, value: string): PreviewCleanup {
  const entries = elements
    .filter((element): element is HTMLElement | SVGElement => element instanceof HTMLElement || element instanceof SVGElement)
    .map((element) => {
      const previous = element.style.getPropertyValue(cssProperty);
      const previousPriority = element.style.getPropertyPriority(cssProperty);
      element.style.setProperty(cssProperty, value);
      return () => {
        if (previous) {
          element.style.setProperty(cssProperty, previous, previousPriority);
        } else {
          element.style.removeProperty(cssProperty);
        }
      };
    });
  return () => {
    for (const restore of entries.reverse()) restore();
  };
}

function applyPreviewText(elements: Element[], value: string): PreviewCleanup {
  const entries = elements.map((element) => {
    const previous = element.textContent ?? "";
    element.textContent = value;
    return () => {
      element.textContent = previous;
    };
  });
  return () => {
    for (const restore of entries.reverse()) restore();
  };
}

function applyPreviewAttribute(elements: Element[], attributeName: string, value: string): PreviewCleanup {
  const entries = elements.map((element) => {
    const previous = element.getAttribute(attributeName);
    element.setAttribute(attributeName, value);
    return () => {
      if (previous == null) element.removeAttribute(attributeName);
      else element.setAttribute(attributeName, previous);
    };
  });
  return () => {
    for (const restore of entries.reverse()) restore();
  };
}

function buildExpressionPreviewValue(element: Element, draft: SourceBackedDraftChange): string | null {
  const runtimeCurrent = getRuntimeCurrentValue(element, draft);
  const currentNumber = coerceFiniteNumber(runtimeCurrent ?? draft.currentValue);
  const delta = coerceFiniteNumber(draft.draftValue);
  if (currentNumber == null || delta == null) return null;
  const result = currentNumber + delta;
  const currentText = runtimeCurrent ?? draft.currentValue;
  const unitMatch = typeof currentText === "string" ? currentText.trim().match(/[a-z%]+$/i) : null;
  const unit = unitMatch?.[0] ?? "";
  return `${result}${unit}`;
}

function buildPreviewValue(element: Element, draft: SourceBackedDraftChange): string {
  if (draft.applyStrategy === "wrap-expression") {
    return buildExpressionPreviewValue(element, draft) ?? draft.normalizedValue ?? draft.draftValue;
  }
  return draft.normalizedValue ?? draft.draftValue;
}

function previewDraftOnElements(draft: SourceBackedDraftChange, elements: Element[]): PreviewCleanup | null {
  if (!elements.length) return null;

  if (draft.targetScope === "shared-style-rule" && draft.selector && draft.cssProperty) {
    const styleElement = document.createElement("style");
    styleElement.setAttribute("data-wb-preview-style", draft.id);
    styleElement.textContent = `${draft.selector} { ${draft.cssProperty}: ${draft.normalizedValue ?? draft.draftValue} !important; }`;
    document.head.appendChild(styleElement);
    return () => styleElement.remove();
  }

  if (draft.origin.astPath === "child:text") {
    const value = buildPreviewValue(elements[0], draft);
    return applyPreviewText(elements, value);
  }

  if (draft.cssProperty) {
    const cssProperty = toCssPropertyName(draft.cssProperty) ?? draft.cssProperty;
    const value = buildPreviewValue(elements[0], draft);
    return applyPreviewStyle(elements, cssProperty, value);
  }

  if (draft.origin.astPath.startsWith("attr:style.")) {
    const styleProperty = toCssPropertyName(draft.origin.astPath.slice("attr:style.".length));
    if (!styleProperty) return null;
    const value = buildPreviewValue(elements[0], draft);
    return applyPreviewStyle(elements, styleProperty, value);
  }

  if (draft.origin.astPath.startsWith("attr:")) {
    const attributeName = draft.origin.astPath.slice("attr:".length).split(".")[0] ?? "";
    const value = buildPreviewValue(elements[0], draft);
    const styleLikeAttribute = toCssPropertyName(attributeName);
    if (
      attributeName === "color" ||
      attributeName === "fill" ||
      attributeName === "stroke" ||
      attributeName === "background" ||
      attributeName === "backgroundColor" ||
      attributeName === "fontSize" ||
      attributeName === "fontWeight" ||
      attributeName === "opacity"
    ) {
      return applyPreviewStyle(elements, styleLikeAttribute ?? attributeName, value);
    }
    return applyPreviewAttribute(elements, attributeName, value);
  }

  return null;
}

function serializeJsLiteral(value: string, valueKind: SourceBackedDraftChange["valueKind"]): string {
  if (valueKind === "boolean") {
    return value === "true" ? "true" : "false";
  }
  if (valueKind === "number") {
    const numeric = coerceFiniteNumber(value);
    return numeric == null ? JSON.stringify(value) : String(numeric);
  }
  if (valueKind === "length") {
    const trimmed = value.trim();
    const numericOnly = trimmed.match(/^-?\d+(?:\.\d+)?$/);
    return numericOnly ? trimmed : JSON.stringify(trimmed);
  }
  return JSON.stringify(value);
}

function serializeJsxAttributeInitializer(value: string, valueKind: SourceBackedDraftChange["valueKind"]): string {
  if (valueKind === "string" || valueKind === "color" || valueKind === "enum" || valueKind === "length") {
    const trimmed = value.trim();
    if (valueKind === "length" && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      return `{${trimmed}}`;
    }
    return JSON.stringify(trimmed);
  }
  if (valueKind === "boolean") return `{${value === "true" ? "true" : "false"}}`;
  const numeric = coerceFiniteNumber(value);
  return `{${numeric == null ? JSON.stringify(value) : String(numeric)}}`;
}

function wrapExpressionText(originalText: string, draft: SourceBackedDraftChange): string {
  const delta = coerceFiniteNumber(draft.draftValue) ?? 0;
  if (draft.editKind === "delta-number" || draft.editKind === "delta-length") {
    if (delta === 0) return originalText;
    const sign = delta >= 0 ? "+" : "-";
    return `(${originalText}) ${sign} ${Math.abs(delta)}`;
  }
  return originalText;
}

async function applyPatchesViaDevServer(
  drafts: SourceBackedDraftChange[],
  issues: SourceBackedApplyIssue[]
): Promise<SourceBackedApplyResult | null> {
  try {
    const response = await fetch("/__workbench/source-sync/apply", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ drafts }),
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const message = await response.text();
      return {
        ok: false,
        patches: [],
        issues: [
          ...issues,
          {
            draftId: "dev-server",
            parameterId: "dev-server",
            message: message || `Dev server apply failed: ${response.status}`,
          },
        ],
      };
    }

    const payload = (await response.json()) as Partial<SourceBackedApplyResult>;
    return {
      ok: Boolean(payload.ok),
      patches: (payload.patches as SourceSyncPatch[] | undefined) ?? [],
      issues: [...issues, ...((payload.issues as SourceBackedApplyIssue[] | undefined) ?? [])],
    };
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof Error && /fetch/i.test(error.message))
    ) {
      return null;
    }
    return {
      ok: false,
      patches: [],
      issues: [
        ...issues,
        {
          draftId: "dev-server",
          parameterId: "dev-server",
          message: error instanceof Error ? error.message : "Unknown dev server apply error.",
        },
      ],
    };
  }
}

export function createSourceBackedEditingController(): SourcePatchPlanner {
  let previewCleanups: PreviewCleanup[] = [];

  const clearSourceBackedDraftPreview = () => {
    for (const cleanup of previewCleanups.reverse()) cleanup();
    previewCleanups = [];
  };

  return {
    previewSourceBackedDrafts(drafts) {
      clearSourceBackedDraftPreview();
      for (const draft of drafts) {
        if (draft.status !== "active") continue;
        const elements = getElementsForDraft(draft);
        const cleanup = previewDraftOnElements(draft, elements);
        if (cleanup) previewCleanups.push(cleanup);
      }
    },
    clearSourceBackedDraftPreview,
    async applySourceBackedDrafts(drafts) {
      const issues: SourceBackedApplyIssue[] = [];
      for (const draft of drafts) {
        if (!toAbsoluteSourcePath(draft)) {
          issues.push({
            draftId: draft.id,
            parameterId: draft.parameterId,
            message: "No resolved source path for draft origin.",
          });
        }
      }

      const devServerResult = await applyPatchesViaDevServer(drafts, issues);
      if (devServerResult?.ok) return devServerResult;
      if (devServerResult) {
        return devServerResult;
      }

      const applyEvent = new CustomEvent("dtm:inspector-apply-patches", {
        detail: { drafts, patches: [], issues },
        cancelable: true,
      });
      const handled = typeof window !== "undefined" ? !window.dispatchEvent(applyEvent) : false;

      if (!handled) {
        issues.push({
          draftId: "host-bridge",
          parameterId: "host-bridge",
          message: "Generated patches, but no host apply bridge handled them.",
        });
      }

      return {
        ok: handled && issues.length === 0,
        patches: [],
        issues,
      };
    },
  };
}
