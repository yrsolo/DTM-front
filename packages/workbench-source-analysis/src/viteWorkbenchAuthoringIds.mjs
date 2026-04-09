import path from "node:path";
import ts from "typescript";

import { analyzeSourceFile } from "./analyzeSourceFile.mjs";

const HELPERS_IMPORT_SOURCE = "@dtm/workbench-contracts";
const WORKBENCH_SCOPE_ALIAS = "__WorkbenchScopeBoundary";
const USE_SCOPE_ALIAS = "__wbUseScope";
const NEXT_SCOPE_ALIAS = "__wbNextScope";
const NODE_ID_ALIAS = "__wbNodeId";
const SCOPE_VAR = "__wbScope";

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function isTsxFile(id) {
  return /\.(tsx|jsx)$/.test(id);
}

function isLocalAppFile(id) {
  const normalized = normalizePath(id);
  return normalized.includes("/apps/web/src/");
}

function toLocation(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${normalizePath(sourceFile.fileName)}:${line + 1}:${character + 1}`;
}

function getNodeLocation(sourceFile, node) {
  if (ts.isJsxElement(node)) {
    return toLocation(sourceFile, node.openingElement);
  }
  if (ts.isJsxSelfClosingElement(node)) {
    return toLocation(sourceFile, node);
  }
  return toLocation(sourceFile, node);
}

function createStringLiteral(value) {
  return ts.factory.createStringLiteral(String(value));
}

function createHelperImport() {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports([
        ts.factory.createImportSpecifier(false, ts.factory.createIdentifier("WorkbenchScopeBoundary"), ts.factory.createIdentifier(WORKBENCH_SCOPE_ALIAS)),
        ts.factory.createImportSpecifier(false, ts.factory.createIdentifier("useWorkbenchScope"), ts.factory.createIdentifier(USE_SCOPE_ALIAS)),
        ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(NEXT_SCOPE_ALIAS)),
        ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(NODE_ID_ALIAS)),
      ])
    ),
    createStringLiteral(HELPERS_IMPORT_SOURCE),
    undefined
  );
}

function createScopeStatement(rootScopeId, isolate) {
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(SCOPE_VAR),
          undefined,
          undefined,
          ts.factory.createCallExpression(ts.factory.createIdentifier(USE_SCOPE_ALIAS), undefined, [
            createStringLiteral(rootScopeId),
            isolate ? ts.factory.createTrue() : ts.factory.createFalse(),
          ])
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

function hasStatementNamed(statements, identifierText) {
  return statements.some(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === identifierText
      )
  );
}

function injectScopeIntoBlock(block, rootScopeId, isolate) {
  if (hasStatementNamed(block.statements, SCOPE_VAR)) {
    return block;
  }
  return ts.factory.updateBlock(block, [createScopeStatement(rootScopeId, isolate), ...block.statements]);
}

function ensureFunctionBody(body, rootScopeId, isolate) {
  if (ts.isBlock(body)) {
    return injectScopeIntoBlock(body, rootScopeId, isolate);
  }
  return ts.factory.createBlock([createScopeStatement(rootScopeId, isolate), ts.factory.createReturnStatement(body)], true);
}

function createDataWbAttribute(plan) {
  return ts.factory.createJsxAttribute(
    ts.factory.createIdentifier("data-wb-id"),
    ts.factory.createJsxExpression(
      undefined,
      ts.factory.createCallExpression(ts.factory.createIdentifier(NODE_ID_ALIAS), undefined, [
        ts.factory.createIdentifier(SCOPE_VAR),
        createStringLiteral(plan.templateToken),
        createStringLiteral(plan.category),
      ])
    )
  );
}

function updateJsxAttributes(attributes, extraAttributes) {
  const filtered = attributes.properties.filter((attribute) => {
    if (!ts.isJsxAttribute(attribute)) return true;
    return !extraAttributes.some((extra) => extra.name.text === attribute.name.text);
  });
  return ts.factory.updateJsxAttributes(attributes, [...filtered, ...extraAttributes]);
}

function cloneKeyAttributeToWrapper(openingLikeElement) {
  const attributes = ts.isJsxElement(openingLikeElement)
    ? openingLikeElement.openingElement.attributes.properties
    : openingLikeElement.attributes.properties;
  for (const attribute of attributes) {
    if (!ts.isJsxAttribute(attribute)) continue;
    if (attribute.name.text !== "key") continue;
    return attribute;
  }
  return null;
}

function wrapWithScopeBoundary(node, placementToken) {
  const keyAttribute = cloneKeyAttributeToWrapper(node);
  const wrapperAttributes = [
    ...(keyAttribute ? [keyAttribute] : []),
    ts.factory.createJsxAttribute(
      ts.factory.createIdentifier("scope"),
      ts.factory.createJsxExpression(
        undefined,
        ts.factory.createCallExpression(ts.factory.createIdentifier(NEXT_SCOPE_ALIAS), undefined, [
          ts.factory.createIdentifier(SCOPE_VAR),
          createStringLiteral(placementToken),
        ])
      )
    ),
  ];

  return ts.factory.createJsxElement(
    ts.factory.createJsxOpeningElement(
      ts.factory.createIdentifier(WORKBENCH_SCOPE_ALIAS),
      undefined,
      ts.factory.createJsxAttributes(wrapperAttributes)
    ),
    [node],
    ts.factory.createJsxClosingElement(ts.factory.createIdentifier(WORKBENCH_SCOPE_ALIAS))
  );
}

function buildPlanIndexes(manifest) {
  return {
    definitionsByName: new Map((manifest.definitions ?? []).map((plan) => [plan.componentName, plan])),
    hostPlansByLocation: new Map((manifest.hostNodes ?? []).map((plan) => [plan.sourceLocation, plan])),
    invocationPlansByLocation: new Map((manifest.localInvocations ?? []).map((plan) => [plan.sourceLocation, plan])),
  };
}

function instrumentSourceFile(sourceFile, manifest) {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const { definitionsByName, hostPlansByLocation, invocationPlansByLocation } = buildPlanIndexes(manifest);
  let usedScopeBoundary = false;
  let usedScopeHook = false;
  let usedNodeId = false;
  let usedNextScope = false;
  const transformer = (context) => {
    const visit = (node) => {
      if (ts.isFunctionDeclaration(node) && node.name && definitionsByName.has(node.name.text) && node.body) {
        const definitionPlan = definitionsByName.get(node.name.text);
        usedScopeHook = true;
        const instrumentedBody = ts.visitEachChild(
          ensureFunctionBody(node.body, definitionPlan.rootScopeId, Boolean(definitionPlan.isSurfaceBoundary)),
          visit,
          context
        );
        return ts.factory.updateFunctionDeclaration(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          node.parameters,
          node.type,
          instrumentedBody
        );
      }

      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && definitionsByName.has(node.name.text) && node.initializer) {
        const definitionPlan = definitionsByName.get(node.name.text);
        let nextInitializer = node.initializer;
        if (ts.isArrowFunction(node.initializer)) {
          usedScopeHook = true;
          const instrumentedBody = ts.visitEachChild(
            ensureFunctionBody(node.initializer.body, definitionPlan.rootScopeId, Boolean(definitionPlan.isSurfaceBoundary)),
            visit,
            context
          );
          nextInitializer = ts.factory.updateArrowFunction(
            node.initializer,
            node.initializer.modifiers,
            node.initializer.typeParameters,
            node.initializer.parameters,
            node.initializer.type,
            node.initializer.equalsGreaterThanToken,
            instrumentedBody
          );
        } else if (ts.isFunctionExpression(node.initializer) && node.initializer.body) {
          usedScopeHook = true;
          const instrumentedBody = ts.visitEachChild(
            ensureFunctionBody(node.initializer.body, definitionPlan.rootScopeId, Boolean(definitionPlan.isSurfaceBoundary)),
            visit,
            context
          );
          nextInitializer = ts.factory.updateFunctionExpression(
            node.initializer,
            node.initializer.modifiers,
            node.initializer.asteriskToken,
            node.initializer.name,
            node.initializer.typeParameters,
            node.initializer.parameters,
            node.initializer.type,
            instrumentedBody
          );
        }
        return ts.factory.updateVariableDeclaration(node, node.name, node.exclamationToken, node.type, nextInitializer);
      }

      if (ts.isJsxElement(node)) {
        const location = getNodeLocation(sourceFile, node);
        const hostPlan = hostPlansByLocation.get(location) ?? null;
        if (hostPlan) {
          usedNodeId = true;
          const openingElement = ts.factory.updateJsxOpeningElement(
            node.openingElement,
            node.openingElement.tagName,
            node.openingElement.typeArguments,
            updateJsxAttributes(node.openingElement.attributes, [createDataWbAttribute(hostPlan)])
          );
          return ts.factory.updateJsxElement(
            node,
            openingElement,
            node.children.map((child) => ts.visitNode(child, visit)),
            node.closingElement
          );
        }

        const invocationPlan = invocationPlansByLocation.get(location) ?? null;
        if (invocationPlan) {
          usedScopeBoundary = true;
          usedNextScope = true;
          const visitedNode = ts.factory.updateJsxElement(
            node,
            node.openingElement,
            node.children.map((child) => ts.visitNode(child, visit)),
            node.closingElement
          );
          return wrapWithScopeBoundary(visitedNode, invocationPlan.placementToken);
        }
      }

      if (ts.isJsxSelfClosingElement(node)) {
        const location = getNodeLocation(sourceFile, node);
        const hostPlan = hostPlansByLocation.get(location) ?? null;
        if (hostPlan) {
          usedNodeId = true;
          return ts.factory.updateJsxSelfClosingElement(
            node,
            node.tagName,
            node.typeArguments,
            updateJsxAttributes(node.attributes, [createDataWbAttribute(hostPlan)])
          );
        }

        const invocationPlan = invocationPlansByLocation.get(location) ?? null;
        if (invocationPlan) {
          usedScopeBoundary = true;
          usedNextScope = true;
          return wrapWithScopeBoundary(node, invocationPlan.placementToken);
        }
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (root) => ts.visitNode(root, visit);
  };

  const transformedResult = ts.transform(sourceFile, [transformer]);
  const transformedSourceFile = transformedResult.transformed[0];
  const transformedStatementList = transformedSourceFile.statements.filter(Boolean);
  const needsHelpers = usedScopeBoundary || usedScopeHook || usedNodeId || usedNextScope;
  const hasWorkbenchImport = sourceFile.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === HELPERS_IMPORT_SOURCE
  );
  const statements = needsHelpers && !hasWorkbenchImport ? [createHelperImport(), ...transformedStatementList] : transformedStatementList;
  const printableSourceFile = ts.factory.updateSourceFile(transformedSourceFile, statements);
  transformedResult.dispose();
  return {
    code: printer.printFile(printableSourceFile),
    usedHelpers: needsHelpers,
  };
}

export function workbenchAuthoringIdsPlugin() {
  return {
    name: "workbench-authoring-ids",
    enforce: "pre",
    transform(code, id) {
      if (!isTsxFile(id) || !isLocalAppFile(id)) {
        return null;
      }

      const report = analyzeSourceFile(path.resolve(id));
      const manifest = report?.instrumentationManifest ?? null;
      if (!manifest) {
        return null;
      }

      const sourceFile = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true, id.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TSX);
      const transformed = instrumentSourceFile(sourceFile, manifest);
      if (!transformed.usedHelpers) {
        return null;
      }

      return {
        code: transformed.code,
        map: null,
      };
    },
  };
}
