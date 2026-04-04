import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const TECHNICAL_WRAPPER_NAMES = new Set([
  "Fragment",
  "React.Fragment",
  "StrictMode",
  "Suspense",
  "Profiler",
]);

const ENRICHMENT_WRAPPER_NAMES = new Set(["InspectorNodeBoundary"]);
const STRUCTURAL_NAME_RE =
  /(Shell|Layout|Page|Panel|Section|Header|Footer|Body|Content|Toolbar|Group|Row|Column|Modal|Drawer|Sidebar|Dock|Surface|Frame|Wrapper|Container)$/;
const INTERACTIVE_HOST_TAGS = new Set(["button", "select", "input", "textarea", "a"]);
const TEXTUAL_HOST_TAGS = new Set(["span", "label", "strong", "em", "p", "h1", "h2", "h3", "h4", "h5", "h6", "text", "tspan"]);
const STRUCTURAL_HOST_TAGS = new Set(["form", "section", "header", "footer", "nav", "aside", "main", "article", "svg", "g"]);
const GRAPHICAL_HOST_TAGS = new Set(["img", "picture", "canvas", "image", "rect", "line", "path", "circle", "ellipse", "polyline", "polygon"]);
const CONDITIONAL_CONTAINER_TAGS = new Set(["div", "ul", "li"]);

const compilerOptionsCache = new Map();
const programCache = new Map();

function isComponentName(name) {
  return /^[A-Z]/.test(name || "");
}

function isMeaningfulHostTag(name) {
  return INTERACTIVE_HOST_TAGS.has(name) || TEXTUAL_HOST_TAGS.has(name) || STRUCTURAL_HOST_TAGS.has(name) || GRAPHICAL_HOST_TAGS.has(name);
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function getNodeText(sourceFile, node) {
  return node.getText(sourceFile);
}

function getLineAndCharacter(sourceFile, position) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(position);
  return { line: line + 1, column: character + 1 };
}

function toLocation(sourceFile, node) {
  const pos = getLineAndCharacter(sourceFile, node.getStart(sourceFile));
  return `${normalizePath(sourceFile.fileName)}:${pos.line}:${pos.column}`;
}

function sanitizeIdPart(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function findNearestTsconfig(startFile) {
  return ts.findConfigFile(path.dirname(startFile), ts.sys.fileExists, "tsconfig.json") ?? null;
}

function getCompilerOptions(filePath) {
  const configPath = findNearestTsconfig(filePath);
  if (!configPath) {
    return {
      options: {
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        jsx: ts.JsxEmit.ReactJSX,
      },
      configPath: null,
    };
  }

  if (compilerOptionsCache.has(configPath)) {
    return compilerOptionsCache.get(configPath);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  const resolved = {
    options: parsed.options,
    configPath,
  };
  compilerOptionsCache.set(configPath, resolved);
  return resolved;
}

function getProgramForFile(filePath) {
  const { options, configPath } = getCompilerOptions(filePath);
  const cacheKey = configPath ?? `no-config:${path.dirname(filePath)}`;

  if (programCache.has(cacheKey)) {
    return programCache.get(cacheKey);
  }

  let rootNames = [filePath];
  if (configPath) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
    rootNames = parsed.fileNames;
  }

  const program = ts.createProgram({
    rootNames,
    options,
  });
  const checker = program.getTypeChecker();
  const resolved = { program, checker };
  programCache.set(cacheKey, resolved);
  return resolved;
}

function isInsideMapCallback(node) {
  let current = node;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === "map"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function detectComponentDefinition(node, sourceFile) {
  if (ts.isFunctionDeclaration(node) && node.name && isComponentName(node.name.text)) {
    return {
      id: `def:${toLocation(sourceFile, node)}:${node.name.text}`,
      kind: "component-definition",
      componentName: node.name.text,
      sourcePath: normalizePath(sourceFile.fileName),
      exportName: node.name.text,
      sourceLocation: toLocation(sourceFile, node),
      body: node.body ?? null,
    };
  }

  if (ts.isVariableStatement(node)) {
    const isExported = node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) return null;
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !isComponentName(declaration.name.text)) continue;
      if (!declaration.initializer) continue;
      if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
        return {
          id: `def:${toLocation(sourceFile, declaration)}:${declaration.name.text}`,
          kind: "component-definition",
          componentName: declaration.name.text,
          sourcePath: normalizePath(sourceFile.fileName),
          exportName: declaration.name.text,
          sourceLocation: toLocation(sourceFile, declaration),
          body: declaration.initializer.body,
        };
      }
    }
  }

  return null;
}

function collectModuleDefinitions(sourceFile) {
  const definitions = [];
  for (const statement of sourceFile.statements) {
    const definition = detectComponentDefinition(statement, sourceFile);
    if (definition) {
      definitions.push(definition);
    }
  }
  return definitions;
}

function collectReExports(sourceFile) {
  const reExports = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

    const sourcePath = resolveImportFile(sourceFile.fileName, statement.moduleSpecifier.text);
    if (!sourcePath) continue;

    const clause = statement.exportClause;
    if (!clause) {
      reExports.push({
        exportedName: "*",
        importedName: "*",
        sourcePath: normalizePath(sourcePath),
      });
      continue;
    }

    if (ts.isNamedExports(clause)) {
      for (const element of clause.elements) {
        reExports.push({
          exportedName: element.name.text,
          importedName: (element.propertyName ?? element.name).text,
          sourcePath: normalizePath(sourcePath),
        });
      }
    }
  }

  return reExports;
}

function resolveAliasedSymbol(checker, symbol) {
  if (!symbol) return null;
  if (symbol.flags & ts.SymbolFlags.Alias) {
    try {
      return checker.getAliasedSymbol(symbol);
    } catch {
      return symbol;
    }
  }
  return symbol;
}

function getCanonicalDeclaration(symbol) {
  const declarations = symbol?.declarations ?? [];
  for (const declaration of declarations) {
    if (
      ts.isFunctionDeclaration(declaration) ||
      ts.isVariableDeclaration(declaration) ||
      ts.isClassDeclaration(declaration) ||
      ts.isExportSpecifier(declaration)
    ) {
      return declaration;
    }
  }
  return declarations[0] ?? null;
}

function getCanonicalSymbolInfo(checker, identifier) {
  const symbol = checker.getSymbolAtLocation(identifier);
  const resolvedSymbol = resolveAliasedSymbol(checker, symbol);
  if (!resolvedSymbol) return null;

  const declaration = getCanonicalDeclaration(resolvedSymbol);
  if (!declaration) return null;
  const declarationFile = declaration.getSourceFile()?.fileName ?? null;
  if (!declarationFile) return null;

  const normalizedPath = normalizePath(declarationFile);
  if (normalizedPath.includes("/node_modules/")) return null;
  if (normalizedPath.endsWith(".d.ts")) return null;

  let exportedName = resolvedSymbol.getName();
  if (exportedName === "default") {
    const parent = declaration.parent;
    if (ts.isFunctionDeclaration(declaration) && declaration.name) {
      exportedName = declaration.name.text;
    } else if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
      exportedName = declaration.name.text;
    } else if (ts.isExportAssignment(parent)) {
      const expr = parent.expression;
      if (ts.isIdentifier(expr)) {
        exportedName = expr.text;
      }
    }
  }

  return {
    sourcePath: normalizedPath,
    importedName: exportedName,
    symbolName: resolvedSymbol.getName(),
    canonicalSymbolId: `${normalizedPath}::${exportedName}`,
  };
}

function getDefinitionSymbolInfo(program, checker, definition) {
  const sourceFile = program.getSourceFile(definition.sourcePath);
  if (!sourceFile) {
    return { canonicalSymbolId: `${definition.sourcePath}::${definition.componentName}` };
  }

  const findDefinitionNode = () => {
    for (const statement of sourceFile.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name?.text === definition.componentName) {
        return statement.name;
      }
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name) && declaration.name.text === definition.componentName) {
            return declaration.name;
          }
        }
      }
    }
    return null;
  };

  const identifier = findDefinitionNode();
  if (!identifier) {
    return {
      canonicalSymbolId: `${definition.sourcePath}::${definition.componentName}`,
    };
  }

  return (
    getCanonicalSymbolInfo(checker, identifier) ?? {
      canonicalSymbolId: `${definition.sourcePath}::${definition.componentName}`,
    }
  );
}

function resolveImportFile(fromFile, specifier) {
  const { options } = getCompilerOptions(fromFile);
  const resolution = ts.resolveModuleName(specifier, fromFile, options, ts.sys);
  const resolvedFileName = resolution.resolvedModule?.resolvedFileName ?? null;
  if (!resolvedFileName) return null;

  const normalized = normalizePath(resolvedFileName);
  if (normalized.includes("/node_modules/")) return null;
  if (normalized.endsWith(".d.ts")) return null;
  return resolvedFileName;
}

function collectLocalComponentImports(sourceFile) {
  const imports = new Map();
  const { checker, program } = getProgramForFile(sourceFile.fileName);
  const programSourceFile = program.getSourceFile(sourceFile.fileName) ?? sourceFile;

  for (const statement of programSourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const specifier =
      statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : null;
    if (!specifier) continue;
    if (!statement.importClause) continue;

  if (statement.importClause.name && isComponentName(statement.importClause.name.text)) {
      const symbolInfo = getCanonicalSymbolInfo(checker, statement.importClause.name);
      if (!symbolInfo) continue;
      imports.set(statement.importClause.name.text, {
        sourcePath: symbolInfo.sourcePath,
        importedName: symbolInfo.importedName,
        importKind: "default",
        symbolName: symbolInfo.symbolName,
        canonicalSymbolId: symbolInfo.canonicalSymbolId,
      });
    }

    const namedBindings = statement.importClause.namedBindings;
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        const localName = element.name.text;
        if (isComponentName(localName)) {
          const symbolInfo = getCanonicalSymbolInfo(checker, element.name);
          if (!symbolInfo) continue;
          imports.set(localName, {
            sourcePath: symbolInfo.sourcePath,
            importedName: symbolInfo.importedName,
            importKind: "named",
            symbolName: symbolInfo.symbolName,
            canonicalSymbolId: symbolInfo.canonicalSymbolId,
          });
        }
      }
    }
  }

  return imports;
}

function createRawNode(sourceFile, jsxNode, componentName, children, repeated) {
  return {
    rawId: `raw:${toLocation(sourceFile, jsxNode)}:${componentName}`,
    componentName,
    displayLabel: componentName,
    sourcePath: normalizePath(sourceFile.fileName),
    sourceLocation: toLocation(sourceFile, jsxNode),
    repeated,
    children,
  };
}

function getJsxAttribute(node, attributeName) {
  const attributes =
    ts.isJsxElement(node) ? node.openingElement.attributes.properties : ts.isJsxSelfClosingElement(node) ? node.attributes.properties : [];
  for (const attr of attributes) {
    if (!ts.isJsxAttribute(attr) || attr.name.text !== attributeName) continue;
    if (!attr.initializer) return "";
    if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
    if (
      ts.isJsxExpression(attr.initializer) &&
      attr.initializer.expression &&
      ts.isStringLiteral(attr.initializer.expression)
    ) {
      return attr.initializer.expression.text;
    }
  }
  return "";
}

function resolveStaticStringExpression(sourceFile, expression) {
  if (!expression) return "";
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isIdentifier(expression)) {
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.name.text !== expression.text) continue;
        const initializer = declaration.initializer;
        if (!initializer) return "";
        if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
          return initializer.text;
        }
      }
    }
  }
  return "";
}

function collectStaticJsxText(parts, child) {
  if (ts.isJsxText(child)) {
    const normalized = child.getText().replace(/\s+/g, " ").trim();
    if (normalized) parts.push(normalized);
    return;
  }
  if (ts.isJsxExpression(child) && child.expression) {
    const resolved = resolveStaticStringExpression(child.getSourceFile(), child.expression);
    const normalized = resolved.replace(/\s+/g, " ").trim();
    if (normalized) {
      parts.push(normalized);
    }
    return;
  }
  if (ts.isJsxElement(child) || ts.isJsxFragment(child)) {
    const nestedChildren = ts.isJsxElement(child) ? child.children : child.children;
    for (const nestedChild of nestedChildren) {
      collectStaticJsxText(parts, nestedChild);
    }
  }
}

function getInlineTextContent(node) {
  const children =
    ts.isJsxElement(node) ? node.children : ts.isJsxSelfClosingElement(node) ? [] : ts.isJsxFragment(node) ? node.children : [];
  if (!children.length) return "";
  const parts = [];
  for (const child of children) {
    collectStaticJsxText(parts, child);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function getHostIdentityName(sourceFile, node, tagName) {
  if (INTERACTIVE_HOST_TAGS.has(tagName) || TEXTUAL_HOST_TAGS.has(tagName)) {
    return tagName;
  }
  const className = getJsxAttribute(node, "className");
  if (className) return `${tagName}.${className.split(/\s+/)[0]}`;
  return tagName;
}

function getHostDisplayLabel(sourceFile, node, tagName) {
  const ariaLabel = getJsxAttribute(node, "aria-label");
  if (ariaLabel) return `${tagName} "${ariaLabel}"`;
  const title = getJsxAttribute(node, "title");
  if (title) return `${tagName} "${title}"`;
  if (INTERACTIVE_HOST_TAGS.has(tagName) || TEXTUAL_HOST_TAGS.has(tagName)) {
    const inlineText = getInlineTextContent(node);
    if (inlineText) return `${tagName} "${inlineText}"`;
  }
  const className = getJsxAttribute(node, "className");
  if (className) return `${tagName}.${className.split(/\s+/)[0]}`;
  return tagName;
}

function shouldKeepConditionalHostTag(tagName, node, children) {
  if (!CONDITIONAL_CONTAINER_TAGS.has(tagName)) return false;
  const ariaLabel = getJsxAttribute(node, "aria-label");
  const className = getJsxAttribute(node, "className");
  if (ariaLabel && children.length > 0) return true;
  if (!className) return false;
  if (children.length > 1) return true;
  return STRUCTURAL_NAME_RE.test(className) || /(list|grid|card|item|dock|panel|toolbar|header|footer|row|column|group|section|board|canvas|surface|wrapper|container)/i.test(className);
}

function extractNodesFromExpression(sourceFile, expression, repeated = false) {
  if (!expression) return [];

  if (ts.isParenthesizedExpression(expression)) {
    return extractNodesFromExpression(sourceFile, expression.expression, repeated);
  }

  if (
    ts.isJsxElement(expression) ||
    ts.isJsxSelfClosingElement(expression) ||
    ts.isJsxFragment(expression)
  ) {
    return extractNodesFromJsx(sourceFile, expression, repeated);
  }

  if (ts.isConditionalExpression(expression)) {
    return [
      ...extractNodesFromExpression(sourceFile, expression.whenTrue, repeated),
      ...extractNodesFromExpression(sourceFile, expression.whenFalse, repeated),
    ];
  }

  if (ts.isBinaryExpression(expression)) {
    return [
      ...extractNodesFromExpression(sourceFile, expression.left, repeated),
      ...extractNodesFromExpression(sourceFile, expression.right, repeated),
    ];
  }

  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.flatMap((element) =>
      extractNodesFromExpression(sourceFile, element, repeated)
    );
  }

  if (ts.isCallExpression(expression)) {
    if (
      ts.isPropertyAccessExpression(expression.expression) &&
      expression.expression.name.text === "map" &&
      expression.arguments.length > 0
    ) {
      const callback = expression.arguments[0];
      if (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) {
        if (ts.isBlock(callback.body)) {
          return extractNodesFromBlock(sourceFile, callback.body, true);
        }
        return extractNodesFromExpression(sourceFile, callback.body, true);
      }
    }
    return expression.arguments.flatMap((arg) =>
      extractNodesFromExpression(sourceFile, arg, repeated)
    );
  }

  return [];
}

function extractNodesFromJsxChildren(sourceFile, children, repeated = false) {
  const output = [];
  for (const child of children) {
    if (ts.isJsxText(child)) continue;
    if (ts.isJsxExpression(child)) {
      output.push(...extractNodesFromExpression(sourceFile, child.expression, repeated));
      continue;
    }
    output.push(...extractNodesFromJsx(sourceFile, child, repeated));
  }
  return output;
}

function extractNodesFromJsx(sourceFile, node, repeated = false) {
  if (ts.isJsxFragment(node)) {
    return extractNodesFromJsxChildren(sourceFile, node.children, repeated);
  }

  if (ts.isJsxSelfClosingElement(node)) {
    const tagName = getNodeText(sourceFile, node.tagName);
    if (isComponentName(tagName)) {
      return [createRawNode(sourceFile, node, tagName, [], repeated || isInsideMapCallback(node))];
    }
    if (!isMeaningfulHostTag(tagName) && !shouldKeepConditionalHostTag(tagName, node, [])) return [];
    const componentName = getHostIdentityName(sourceFile, node, tagName);
    const rawNode = createRawNode(
      sourceFile,
      node,
      componentName,
      [],
      repeated || isInsideMapCallback(node)
    );
    rawNode.displayLabel = getHostDisplayLabel(sourceFile, node, tagName);
    return [
      rawNode,
    ];
  }

  if (ts.isJsxElement(node)) {
    const tagName = getNodeText(sourceFile, node.openingElement.tagName);
    const children = extractNodesFromJsxChildren(
      sourceFile,
      node.children,
      repeated || isInsideMapCallback(node)
    );
    if (!isComponentName(tagName)) {
      if (!isMeaningfulHostTag(tagName) && !shouldKeepConditionalHostTag(tagName, node, children)) return children;
      const componentName = getHostIdentityName(sourceFile, node, tagName);
      const rawNode = createRawNode(
        sourceFile,
        node.openingElement,
        componentName,
        children,
        repeated || isInsideMapCallback(node)
      );
      rawNode.displayLabel = getHostDisplayLabel(sourceFile, node, tagName);
      return [
        rawNode,
      ];
    }
    return [
      createRawNode(
        sourceFile,
        node.openingElement,
        tagName,
        children,
        repeated || isInsideMapCallback(node)
      ),
    ];
  }

  return [];
}

function extractNodesFromBlock(sourceFile, block, repeated = false) {
  const output = [];
  for (const statement of block.statements) {
    if (ts.isReturnStatement(statement)) {
      output.push(...extractNodesFromExpression(sourceFile, statement.expression, repeated));
      continue;
    }
    ts.forEachChild(statement, (child) => {
      output.push(...extractNodesFromExpression(sourceFile, child, repeated));
    });
  }
  return output;
}

function classifyRawNode(node) {
  if (node.nodeClass) return node.nodeClass;
  if (ENRICHMENT_WRAPPER_NAMES.has(node.componentName)) return "enrichment-wrapper";
  if (TECHNICAL_WRAPPER_NAMES.has(node.componentName)) return "technical-wrapper";
  if (node.repeated) return "repeated-pattern";
  if (STRUCTURAL_NAME_RE.test(node.componentName)) return "structural";
  return "placement";
}

function shouldKeepStructuralNode(node, normalizedChildren) {
  if (!normalizedChildren.length) return false;
  if (node.repeated) return true;
  if (normalizedChildren.length > 1) return true;
  return STRUCTURAL_NAME_RE.test(node.componentName);
}

function buildCanonicalPath(parentPath, componentName, index) {
  const segment = `${sanitizeIdPart(componentName)}:${index}`;
  return parentPath ? `${parentPath}/${segment}` : segment;
}

function normalizeRawNodes(rawNodes, parentPath = "", startIndex = 0) {
  const normalized = [];

  for (const rawNode of rawNodes) {
    const nodeClass = classifyRawNode(rawNode);
    const flattenedChildren = normalizeRawNodes(rawNode.children, parentPath, startIndex + normalized.length);

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

    normalized.push({
      id: `${idPrefix}:${sanitizeIdPart(canonicalPath)}`,
      class: nodeClass,
      componentName: rawNode.componentName,
      displayLabel: rawNode.displayLabel ?? rawNode.componentName,
      sourcePath: rawNode.sourcePath,
      sourceLocation: rawNode.sourceLocation ?? null,
      canonicalPath,
      repeated: rawNode.repeated,
      children: normalizeRawNodes(rawNode.children, canonicalPath),
    });
  }

  return normalized;
}

function collectPlacements(
  normalizedNodes,
  parentPlacementId = null,
  placements = [],
  repeatedProjectionGroups = []
) {
  for (const node of normalizedNodes) {
    if (node.class === "placement") {
      placements.push({
        id: node.id,
        kind: "placement",
        componentDefinitionId: `def:${sanitizeIdPart(`${node.sourcePath}:${node.componentName}`)}`,
        parentPlacementId,
        placementPath: node.canonicalPath,
        sourcePath: node.sourcePath,
        sourceLocation: node.sourceLocation,
      });
      collectPlacements(node.children, node.id, placements, repeatedProjectionGroups);
      continue;
    }

    if (node.class === "repeated-pattern") {
      repeatedProjectionGroups.push({
        id: node.id,
        sourcePlacementId: parentPlacementId,
        templateKey: node.canonicalPath,
      });
    }

    collectPlacements(node.children, parentPlacementId, placements, repeatedProjectionGroups);
  }

  return { placements, repeatedProjectionGroups };
}

function collectUsedComponentNames(nodes, output = new Set()) {
  for (const node of nodes) {
    if (isComponentName(node.componentName)) {
      output.add(node.componentName);
    }
    collectUsedComponentNames(node.children, output);
  }
  return output;
}

export function analyzeSourceFile(filePath, visited = new Set()) {
  const absolutePath = path.resolve(filePath);
  let requestedSymbols = null;
  let visitSet = visited;

  if (!(visited instanceof Set)) {
    requestedSymbols = visited?.requestedSymbols
      ? new Set(Array.from(visited.requestedSymbols))
      : null;
    visitSet = visited?.visited ?? new Set();
  }

  const visitKey = `${absolutePath}::${requestedSymbols ? Array.from(requestedSymbols).sort().join(",") : "*"}`;
  if (visitSet.has(visitKey)) {
    return null;
  }
  visitSet.add(visitKey);

  const sourceFile = ts.createSourceFile(
    absolutePath,
    readFile(absolutePath),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const allDefinitions = collectModuleDefinitions(sourceFile);
  const { program, checker } = getProgramForFile(absolutePath);
  const reExports = collectReExports(sourceFile);
  const localComponentImports = collectLocalComponentImports(sourceFile);
  let definitions = allDefinitions;

  if (requestedSymbols?.size) {
    definitions = allDefinitions.filter((definition) => {
      if (requestedSymbols.has(definition.componentName)) return true;
      if (definition.exportName && requestedSymbols.has(definition.exportName)) return true;
      return false;
    });
  }

  const rawTree = definitions.map((definition) => {
    const symbolInfo = getDefinitionSymbolInfo(program, checker, definition);
    const children = !definition.body
      ? []
      : ts.isBlock(definition.body)
        ? extractNodesFromBlock(sourceFile, definition.body)
        : extractNodesFromExpression(sourceFile, definition.body);

    return {
      rawId: `raw-def:${definition.sourceLocation}:${definition.componentName}`,
      componentName: definition.componentName,
      sourcePath: definition.sourcePath,
      sourceLocation: definition.sourceLocation,
      canonicalSymbolId: symbolInfo.canonicalSymbolId,
      nodeClass: "component-definition",
      repeated: false,
      children,
    };
  });

  const normalizedTree = normalizeRawNodes(rawTree);
  const { placements, repeatedProjectionGroups } = collectPlacements(normalizedTree);
  const usedComponentNames = [...collectUsedComponentNames(normalizedTree)];
  const linkedModules = usedComponentNames
    .map((name) => {
      const importRecord = localComponentImports.get(name);
      if (!importRecord) return null;
      return analyzeSourceFile(importRecord.sourcePath, {
        visited: visitSet,
        requestedSymbols: new Set([importRecord.importedName]),
      });
    })
    .filter(Boolean);

  const unresolvedRequestedSymbols =
    requestedSymbols && definitions.length === 0
      ? Array.from(requestedSymbols).filter((symbolName) => symbolName !== "default")
      : [];

  const reExportedModules = unresolvedRequestedSymbols
    .map((symbolName) => {
      const reExport = reExports.find((entry) => entry.exportedName === symbolName || entry.exportedName === "*");
      if (!reExport) return null;
      const nextSymbol =
        reExport.exportedName === "*" ? symbolName : reExport.importedName;
      return analyzeSourceFile(reExport.sourcePath, {
        visited: visitSet,
        requestedSymbols: new Set([nextSymbol]),
      });
    })
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
    .filter(Boolean);

  return {
    file: normalizePath(absolutePath),
    requestedSymbols: requestedSymbols ? Array.from(requestedSymbols) : null,
    localComponentImports: Object.fromEntries(localComponentImports),
    reExports,
    componentDefinitions: definitions.map(({ body: _body, ...definition }) => ({
      ...definition,
      canonicalSymbolId: getDefinitionSymbolInfo(program, checker, definition).canonicalSymbolId,
    })),
    rawTree,
    normalizedTree,
    placements,
    repeatedProjectionGroups,
    linkedModules,
    reExportedModules,
  };
}
