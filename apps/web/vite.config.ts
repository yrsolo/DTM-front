import react from "@vitejs/plugin-react";
import fs from "node:fs/promises";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import { workbenchAuthoringIdsPlugin } from "../../packages/workbench-source-analysis/src/viteWorkbenchAuthoringIds.mjs";
import postcss from "postcss";
import ts from "typescript";

type SourceSyncPatchOperation = {
  start: number;
  end: number;
  nextText: string;
  description: string;
  oldText: string;
};

type SourceSyncPatchPayload = {
  id: string;
  sourceNodeId: string;
  sourcePath: string;
  description: string;
  patchText: string;
  operations?: SourceSyncPatchOperation[];
  baseText?: string;
  nextText?: string;
};

type SourceValueOriginPayload = {
  sourceLocation?: string | null;
  astPath: string;
  resolvedSourcePath?: string | null;
};

type SourceBackedDraftPayload = {
  id: string;
  sourceNodeId: string;
  parameterId: string;
  draftValue: string;
  normalizedValue?: string | null;
  currentValue: string;
  valueKind: "string" | "number" | "boolean" | "enum" | "color" | "length";
  editKind:
    | "set-literal"
    | "delta-number"
    | "delta-length"
    | "replace-text"
    | "css-rule-set"
    | "placement-style-override";
  applyStrategy: "patch-origin" | "wrap-expression" | "create-placement-override";
  cssProperty?: string | null;
  selector?: string | null;
  nodeSourceLocation?: string | null;
  origin: SourceValueOriginPayload;
};

type SourceBackedApplyIssuePayload = {
  draftId: string;
  parameterId: string;
  message: string;
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

function serializeJsLiteral(value: string, valueKind: SourceBackedDraftPayload["valueKind"]): string {
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

function serializeJsxAttributeInitializer(value: string, valueKind: SourceBackedDraftPayload["valueKind"]): string {
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

function wrapExpressionText(originalText: string, draft: SourceBackedDraftPayload): string {
  const delta = coerceFiniteNumber(draft.draftValue) ?? 0;
  if (draft.editKind === "delta-number" || draft.editKind === "delta-length") {
    if (delta === 0) return originalText;
    const sign = delta >= 0 ? "+" : "-";
    return `(${originalText}) ${sign} ${Math.abs(delta)}`;
  }
  return originalText;
}

function findDescendant(node: ts.Node, predicate: (current: ts.Node) => boolean): ts.Node | null {
  let found: ts.Node | null = null;
  const visit = (current: ts.Node) => {
    if (found) return;
    if (predicate(current)) {
      found = current;
      return;
    }
    current.forEachChild(visit);
  };
  visit(node);
  return found;
}

function createTsSourceFile(fileName: string, text: string) {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function findJsxAttributeNode(sourceFile: ts.SourceFile, attributeName: string, location: { line: number; column: number } | null) {
  return findDescendant(sourceFile, (node) => {
    if (!ts.isJsxAttribute(node) || !ts.isIdentifier(node.name) || node.name.text !== attributeName) return false;
    if (!location) return true;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return start.line + 1 === location.line;
  }) as ts.JsxAttribute | null;
}

function findStylePropertyNode(sourceFile: ts.SourceFile, propertyName: string, location: { line: number; column: number } | null) {
  return findDescendant(sourceFile, (node) => {
    if (!ts.isPropertyAssignment(node)) return false;
    const name = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : null;
    if (name !== propertyName) return false;
    if (!location) return true;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return start.line + 1 === location.line;
  }) as ts.PropertyAssignment | null;
}

function findJsxTextLikeNode(sourceFile: ts.SourceFile, location: { line: number; column: number } | null) {
  return findDescendant(sourceFile, (node) => {
    if (!(ts.isJsxText(node) || ts.isJsxExpression(node))) return false;
    if (!location) return true;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return start.line + 1 === location.line;
  });
}

function findOpeningLikeElementNode(sourceFile: ts.SourceFile, location: { line: number; column: number } | null) {
  return findDescendant(sourceFile, (node) => {
    if (!(ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))) return false;
    if (!location) return true;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return start.line + 1 === location.line;
  }) as ts.JsxOpeningLikeElement | null;
}

function createPatchOperation(text: string, start: number, end: number, nextText: string, description: string): SourceSyncPatchOperation {
  return {
    start,
    end,
    nextText,
    description,
    oldText: text.slice(start, end),
  };
}

async function buildTsPatchOperation(absolutePath: string, text: string, draft: SourceBackedDraftPayload): Promise<SourceSyncPatchOperation | null> {
  const sourceFile = createTsSourceFile(absolutePath, text);
  const location = parseSourceLocation(draft.origin.sourceLocation);

  if (draft.editKind === "placement-style-override") {
    const openingLike = findOpeningLikeElementNode(sourceFile, parseSourceLocation(draft.nodeSourceLocation ?? draft.origin.sourceLocation));
    if (!openingLike || !draft.cssProperty) return null;
    const cssProperty = draft.cssProperty;
    const styleAttribute = openingLike.attributes.properties.find(
      (attribute) => ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name) && attribute.name.text === "style"
    ) as ts.JsxAttribute | undefined;
    const jsValue = serializeJsLiteral(draft.normalizedValue ?? draft.draftValue, draft.valueKind);

    if (
      styleAttribute?.initializer &&
      ts.isJsxExpression(styleAttribute.initializer) &&
      styleAttribute.initializer.expression &&
      ts.isObjectLiteralExpression(styleAttribute.initializer.expression)
    ) {
      const objectLiteral = styleAttribute.initializer.expression;
      const property = objectLiteral.properties.find((entry) => {
        if (!ts.isPropertyAssignment(entry)) return false;
        const name = ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name) ? entry.name.text : null;
        return name === cssProperty;
      }) as ts.PropertyAssignment | undefined;
      if (property) {
        return createPatchOperation(text, property.initializer.getStart(sourceFile), property.initializer.getEnd(), jsValue, `Set inline style ${cssProperty}`);
      }
      const insertAt = objectLiteral.properties.end;
      const separator = objectLiteral.properties.length ? ", " : "";
      return createPatchOperation(text, insertAt, insertAt, `${separator}${cssProperty}: ${jsValue}`, `Add inline style ${cssProperty}`);
    }

    if (styleAttribute) return null;

    const insertionPoint = openingLike.tagName.end;
    return createPatchOperation(text, insertionPoint, insertionPoint, ` style={{ ${cssProperty}: ${jsValue} }}`, `Create local style override ${cssProperty}`);
  }

  if (draft.origin.astPath.startsWith("attr:style.")) {
    const propertyName = draft.origin.astPath.slice("attr:style.".length);
    const property = findStylePropertyNode(sourceFile, propertyName, location);
    if (!property) return null;
    const nextText =
      draft.applyStrategy === "wrap-expression"
        ? wrapExpressionText(property.initializer.getText(sourceFile), draft)
        : serializeJsLiteral(draft.normalizedValue ?? draft.draftValue, draft.valueKind);
    return createPatchOperation(text, property.initializer.getStart(sourceFile), property.initializer.getEnd(), nextText, `Update inline style ${propertyName}`);
  }

  if (draft.origin.astPath.startsWith("attr:")) {
    const attributeName = draft.origin.astPath.slice("attr:".length).split(".")[0] ?? "";
    const attribute = findJsxAttributeNode(sourceFile, attributeName, location);
    if (!attribute || !attribute.initializer) return null;
    if (draft.applyStrategy === "wrap-expression" && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
      return createPatchOperation(
        text,
        attribute.initializer.expression.getStart(sourceFile),
        attribute.initializer.expression.getEnd(),
        wrapExpressionText(attribute.initializer.expression.getText(sourceFile), draft),
        `Wrap expression for ${attributeName}`
      );
    }
    return createPatchOperation(
      text,
      attribute.initializer.getStart(sourceFile),
      attribute.initializer.getEnd(),
      serializeJsxAttributeInitializer(draft.normalizedValue ?? draft.draftValue, draft.valueKind),
      `Set attribute ${attributeName}`
    );
  }

  if (draft.origin.astPath === "child:text") {
    const target = findJsxTextLikeNode(sourceFile, location);
    if (!target) return null;
    if (ts.isJsxText(target)) {
      return createPatchOperation(text, target.getStart(sourceFile), target.getEnd(), draft.normalizedValue ?? draft.draftValue, "Replace JSX text");
    }
    if (ts.isJsxExpression(target) && target.expression && draft.applyStrategy === "wrap-expression") {
      return createPatchOperation(
        text,
        target.expression.getStart(sourceFile),
        target.expression.getEnd(),
        wrapExpressionText(target.expression.getText(sourceFile), draft),
        "Wrap JSX text expression"
      );
    }
  }

  return null;
}

async function buildCssPatchOperation(absolutePath: string, text: string, draft: SourceBackedDraftPayload): Promise<SourceSyncPatchOperation | null> {
  const root = postcss.parse(text, { from: absolutePath });
  const location = parseSourceLocation(draft.origin.sourceLocation);
  const selector = draft.selector;
  const cssProperty = draft.cssProperty;
  if (!selector || !cssProperty) return null;
  const normalizedDraftSelector = selector.trim();
  let matchedDeclaration: { value: string; source: { start: { line: number; column: number }; end: { line: number; column: number } }; lineDistance: number } | null = null;
  root.walkDecls((declaration) => {
    if (declaration.prop !== cssProperty) return;
    if (declaration.parent?.type !== "rule") return;
    const parentSelectors = declaration.parent.selector
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parentSelectors.includes(normalizedDraftSelector)) return;
    if (!declaration.source?.start || !declaration.source.end) return;
    const lineDistance = location ? Math.abs(declaration.source.start.line - location.line) : 0;
    if (matchedDeclaration && lineDistance >= matchedDeclaration.lineDistance) return;
    matchedDeclaration = {
      value: declaration.value,
      source: { start: declaration.source.start, end: declaration.source.end },
      lineDistance,
    };
  });
  if (!matchedDeclaration) return null;
  const lineStarts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") lineStarts.push(index + 1);
  }
  const declStart = (lineStarts[matchedDeclaration.source.start.line - 1] ?? 0) + (matchedDeclaration.source.start.column - 1);
  const declEnd = (lineStarts[matchedDeclaration.source.end.line - 1] ?? 0) + (matchedDeclaration.source.end.column - 1);
  const previousText = text.slice(declStart, declEnd);
  const nextText = previousText.replace(matchedDeclaration.value, draft.normalizedValue ?? draft.draftValue);
  return createPatchOperation(text, declStart, declEnd, nextText, `Set CSS ${normalizedDraftSelector} ${cssProperty}`);
}

function buildSourcePatch(filePath: string, sourceNodeId: string, baseText: string, nextText: string, operations: SourceSyncPatchOperation[]): SourceSyncPatchPayload {
  const patchText = operations
    .map((operation) => `${operation.description}\n- ${operation.oldText.replace(/\r?\n/g, "\\n")}\n+ ${operation.nextText.replace(/\r?\n/g, "\\n")}`)
    .join("\n\n");
  return {
    id: `patch:${filePath}`,
    sourceNodeId,
    sourcePath: filePath,
    description: `Source-backed edits for ${filePath}`,
    patchText,
    operations,
    baseText,
    nextText,
  };
}

function isPathInside(rootPath: string, candidatePath: string): boolean {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function workbenchSourceSyncApplyPlugin(repoRoot: string) {
  return {
    name: "workbench-source-sync-apply",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/__workbench/source-sync/apply", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ ok: false, issues: [{ message: "Method not allowed." }] }));
          return;
        }

        const chunks: Uint8Array[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }

        try {
          const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
            patches?: SourceSyncPatchPayload[];
            drafts?: SourceBackedDraftPayload[];
          };
          let patches = Array.isArray(payload?.patches) ? payload.patches : [];
          const drafts = Array.isArray(payload?.drafts) ? payload.drafts : [];
          const issues: SourceBackedApplyIssuePayload[] = [];

          if (!patches.length && drafts.length) {
            const draftsByFile = new Map<string, SourceBackedDraftPayload[]>();
            for (const draft of drafts) {
              const absolutePath = draft.origin.resolvedSourcePath ? path.resolve(draft.origin.resolvedSourcePath) : null;
              if (!absolutePath) {
                issues.push({
                  draftId: draft.id,
                  parameterId: draft.parameterId,
                  message: "No resolved source path for draft origin.",
                });
                continue;
              }
              const bucket = draftsByFile.get(absolutePath) ?? [];
              bucket.push(draft);
              draftsByFile.set(absolutePath, bucket);
            }

            for (const [absolutePath, fileDrafts] of draftsByFile) {
              try {
                const baseText = await fs.readFile(absolutePath, "utf8");
                let text = baseText;
                const operations: SourceSyncPatchOperation[] = [];
                for (const draft of fileDrafts) {
                  const operation = absolutePath.endsWith(".css")
                    ? await buildCssPatchOperation(absolutePath, text, draft)
                    : await buildTsPatchOperation(absolutePath, text, draft);
                  if (!operation) {
                    issues.push({
                      draftId: draft.id,
                      parameterId: draft.parameterId,
                      message: "Could not build a source patch for this draft.",
                    });
                    continue;
                  }
                  text = `${text.slice(0, operation.start)}${operation.nextText}${text.slice(operation.end)}`;
                  operations.unshift(operation);
                }
                if (operations.length) {
                  patches.push(buildSourcePatch(absolutePath, fileDrafts[0]?.sourceNodeId ?? absolutePath, baseText, text, operations.reverse()));
                }
              } catch (error) {
                issues.push({
                  draftId: absolutePath,
                  parameterId: absolutePath,
                  message: error instanceof Error ? error.message : "Unknown patch planning error.",
                });
              }
            }
          }

          for (const patch of patches) {
            const absolutePath = path.resolve(patch.sourcePath);
            if (!isPathInside(repoRoot, absolutePath)) {
              issues.push({
                draftId: patch.id,
                parameterId: patch.sourceNodeId,
                message: `Refused to write outside repo root: ${patch.sourcePath}`,
              });
              continue;
            }

            const currentText = await fs.readFile(absolutePath, "utf8");
            if (typeof patch.baseText === "string" && currentText !== patch.baseText) {
              issues.push({
                draftId: patch.id,
                parameterId: patch.sourceNodeId,
                message: `File changed on disk before apply: ${patch.sourcePath}`,
              });
              continue;
            }

            let nextText = patch.nextText;
            if (typeof nextText !== "string") {
              const operations = [...(patch.operations ?? [])].sort((left, right) => right.start - left.start);
              nextText = currentText;
              for (const operation of operations) {
                const currentSlice = nextText.slice(operation.start, operation.end);
                if (currentSlice !== operation.oldText) {
                  issues.push({
                    draftId: patch.id,
                    parameterId: patch.sourceNodeId,
                    message: `Patch validation failed for ${patch.sourcePath}: expected source slice mismatch.`,
                  });
                  nextText = null;
                  break;
                }
                nextText = `${nextText.slice(0, operation.start)}${operation.nextText}${nextText.slice(operation.end)}`;
              }
            }

            if (typeof nextText !== "string") continue;
            await fs.writeFile(absolutePath, nextText, "utf8");
          }

          res.statusCode = issues.length ? 409 : 200;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              ok: issues.length === 0,
              patches,
              issues,
            })
          );
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              issues: [
                {
                  draftId: "dev-server",
                  parameterId: "dev-server",
                  message: error instanceof Error ? error.message : "Unknown apply server error.",
                },
              ],
            })
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const buildBase = env.DTM_WEB_BUILD_BASE?.trim() || "/";
  const repoRoot = path.resolve(__dirname, "../..");
  return {
    base: buildBase,
    plugins: [workbenchAuthoringIdsPlugin(), workbenchSourceSyncApplyPlugin(repoRoot), react()],
    resolve: {
      alias: {
        "@dtm/workbench-inspector": path.resolve(__dirname, "../../packages/workbench-inspector/src/public.ts"),
        "@dtm/workbench-contracts": path.resolve(__dirname, "../../packages/workbench-contracts/src/index.ts"),
        "@dtm/workbench-source-analysis": path.resolve(__dirname, "../../packages/workbench-source-analysis/src/public.ts"),
      },
    },
    server: {
      port: 5173,
    },
  };
});
