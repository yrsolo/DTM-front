export type InspectorValue = string | number | boolean | null;
export type InspectorNodeId = string;
export type SourceNodeId = string;
export type SourceNodeCategory = "component-definition" | "placement" | "repeated-projection-group";
export type SourceRuntimeBindingStatus = "bound" | "multiple" | "unresolved" | "stale";
export type DraftChangeScope = "token" | "component" | "placement" | "instance-preview";
export type DraftChangeStatus = "active" | "stale" | "unresolved" | "invalid";
export type AuthoringValueKind = "string" | "number" | "boolean" | "enum" | "color" | "length" | "token-ref" | "expression";
export type AuthoringValueState = "valid" | "invalid" | "clamped" | "coerced" | "unresolved" | "blocked";
export type SourceBackedEditKind =
  | "set-literal"
  | "delta-number"
  | "delta-length"
  | "replace-text"
  | "css-rule-set"
  | "placement-style-override";
export type SourceBackedTargetScope = "placement" | "shared-style-rule" | "component";
export type SourceBackedApplyStrategy = "patch-origin" | "wrap-expression" | "create-placement-override";
export type SourceBackedExpressionEditMode = "delta-number" | "delta-length" | "replace-literal" | "unsupported";
export type InspectorPickMode = "off" | "on";
export type InspectorFocusMode = "all" | "marked";
export type InspectorTreeFilterMode = "smart" | "all" | "repeated";

export type InspectorNodeMeta = Record<string, InspectorValue>;

export type InspectorNodeBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type InspectorPanelPosition = {
  x: number;
  y: number;
};

export type InspectorPanelSize = {
  width: number;
  height: number;
};

export type InspectorNodeKind = "semantic" | "control" | "content" | "text" | "image" | "container" | "unknown";
export type InspectorNodeType = "definition" | "placement" | "repeated-group";
export type InspectorHighlightMode = "single" | "multi";

export type InspectorRuntimeProjection = {
  id: string;
  sourceNodeId: SourceNodeId;
  bounds: InspectorNodeBounds | null;
  isVisible: boolean;
  isInteractive: boolean;
  tagName: string;
};

export type SourceNode = {
  id: SourceNodeId;
  label: string;
  category: SourceNodeCategory;
  bindingKey?: string | null;
  componentName?: string | null;
  kind: InspectorNodeKind;
  path: string;
  ownerPath?: string | null;
  sourcePath?: string | null;
  sourceLocation?: string | null;
  definitionId?: SourceNodeId | null;
  placementScopeId?: string | null;
  templateToken?: string | null;
  idVersion?: string | null;
  placementId?: SourceNodeId | null;
  repeatedGroupId?: SourceNodeId | null;
  depth: number;
  parentId?: SourceNodeId | null;
  children?: SourceNode[];
  semanticTargetId?: string | null;
  meta?: InspectorNodeMeta;
  runtimeProjectionIds: string[];
  sourceBackedParameters?: SourceBackedParameter[];
};

export type SourceGraphSnapshot = {
  id: string;
  version: string;
  entry: string;
  generatedAt: string;
  rootNodes: SourceNode[];
};

export type SourceRuntimeBinding = {
  sourceNodeId: SourceNodeId;
  bindingKey: string | null;
  runtimeProjectionIds: string[];
  elementCount?: number;
  status: SourceRuntimeBindingStatus;
};

export type DraftChange = {
  id: string;
  sourceNodeId: SourceNodeId;
  scope: DraftChangeScope;
  group: string;
  key: string;
  value: string;
  status: DraftChangeStatus;
};

export type AuthoringParameterOption = {
  value: string;
  label: string;
};

export type SourceValueOrigin = {
  kind: "jsx-attr" | "jsx-text" | "inline-style" | "class-name" | "token-ref" | "expression";
  sourcePath: string;
  sourceLocation: string;
  displaySourcePath?: string | null;
  resolvedSourcePath?: string | null;
  astPath: string;
  editable: boolean;
};

export type SourceBackedParameter = {
  id: string;
  sourceNodeId: SourceNodeId;
  label: string;
  group: string;
  valueKind: AuthoringValueKind;
  currentValue: string;
  normalizedValue?: string | null;
  origin: SourceValueOrigin;
  readonlyReason?: string | null;
  supportedScopes: DraftChangeScope[];
  selector?: string | null;
  cssProperty?: string | null;
  canCreatePlacementOverride?: boolean;
  expressionEditMode?: SourceBackedExpressionEditMode | null;
};

export type SourceBackedDraftChange = {
  id: string;
  parameterId: string;
  sourceNodeId: SourceNodeId;
  parameterLabel: string;
  parameterGroup: string;
  valueKind: AuthoringValueKind;
  originKind: SourceValueOrigin["kind"];
  origin: SourceValueOrigin;
  currentValue: string;
  draftValue: string;
  normalizedValue?: string | null;
  editKind: SourceBackedEditKind;
  targetScope: SourceBackedTargetScope;
  applyStrategy: SourceBackedApplyStrategy;
  status: DraftChangeStatus;
  selector?: string | null;
  cssProperty?: string | null;
  canCreatePlacementOverride?: boolean;
  expressionEditMode?: SourceBackedExpressionEditMode | null;
  nodeSourcePath?: string | null;
  nodeSourceLocation?: string | null;
};

export type SourceBackedApplyIssue = {
  draftId: string;
  parameterId: string;
  message: string;
};

export type SourceBackedApplyResult = {
  ok: boolean;
  patches: SourceSyncPatch[];
  issues: SourceBackedApplyIssue[];
};

export type AuthoringParameterDescriptor = {
  id: string;
  sourceNodeId: SourceNodeId;
  label: string;
  group: string;
  valueKind: AuthoringValueKind;
  supportedScopes: DraftChangeScope[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string | null;
  nullable?: boolean;
  options?: AuthoringParameterOption[];
  editorHint?: "text" | "textarea" | "number" | "slider" | "toggle" | "select" | "color" | "token-picker";
  meta?: InspectorNodeMeta;
};

export type EffectivePreviewValue = {
  parameterId: string;
  sourceNodeId: SourceNodeId;
  valueKind: AuthoringValueKind;
  value: string;
  normalizedValue?: string | null;
  state: AuthoringValueState;
  resolvedFrom: DraftChangeScope | "base";
  trace?: string | null;
  message?: string | null;
};

export type HostPreviewCapabilities = Record<DraftChangeScope, boolean>;

export type AuthoringNode = {
  id: SourceNodeId;
  sourceNodeId: SourceNodeId;
  label: string;
  scopes: Array<"token" | "component" | "instance">;
  parameterGroups: string[];
  hasEditableSurface: boolean;
  targetCategory?: SourceNodeCategory;
};

export type AuthoringValue = {
  id: string;
  sourceNodeId: SourceNodeId;
  scope: "token" | "component" | "instance";
  valueType: "string" | "number" | "boolean" | "token-ref" | "expression";
  value: string;
};

export type SourceSyncPatchOperation = {
  start: number;
  end: number;
  nextText: string;
  description: string;
  oldText: string;
};

export type SourceSyncPatch = {
  id: string;
  sourceNodeId: SourceNodeId;
  sourcePath: string;
  description: string;
  patchText: string;
  operations: SourceSyncPatchOperation[];
  baseText?: string;
  nextText?: string;
};

export type InspectorNode = {
  id: InspectorNodeId;
  sourceNodeId?: SourceNodeId;
  runtimeId?: string;
  nodeType: InspectorNodeType;
  bindingKey?: string | null;
  bindingStatus?: SourceRuntimeBindingStatus;
  projectionIds: string[];
  projectionCount: number;
  highlightMode: InspectorHighlightMode;
  runtimeProjectionCount?: number;
  label: string;
  displayLabel?: string;
  componentName?: string | null;
  kind: InspectorNodeKind;
  tagName: string;
  path: string;
  ownerPath?: string | null;
  sourcePath?: string | null;
  sourceLocation?: string | null;
  sourceCategory?: SourceNodeCategory;
  definitionId?: SourceNodeId | null;
  placementId?: SourceNodeId | null;
  repeatedGroupId?: SourceNodeId | null;
  depth: number;
  parentId?: InspectorNodeId | null;
  children?: InspectorNode[];
  bounds: InspectorNodeBounds | null;
  isVisible: boolean;
  isInteractive: boolean;
  semanticTargetId?: string | null;
  meta?: InspectorNodeMeta;
  sourceBackedParameters?: SourceBackedParameter[];
};

export type InspectorPropertyField = {
  id: string;
  label: string;
  value: string;
};

export type InspectorPropertyAction = {
  id: string;
  label: string;
  disabled?: boolean;
};

export type InspectorPropertiesSection = {
  id: string;
  title: string;
  fields?: InspectorPropertyField[];
  actions?: InspectorPropertyAction[];
};

export type OwnershipRef = {
  id: string;
  label: string;
  kind: "tab" | "group" | "control" | "external";
};

export type InspectorNodeEnrichment = {
  label?: string;
  meta?: InspectorNodeMeta;
  ownershipRefs?: OwnershipRef[];
  propertySections?: InspectorPropertiesSection[];
  authoringNode?: AuthoringNode | null;
};

export type InspectorActivation = {
  enabled: boolean;
  source: "disabled" | "query" | "storage";
  debug?: boolean;
};

export type InspectorHierarchyState = {
  expandedNodeIds: InspectorNodeId[];
  markedNodeIds: InspectorNodeId[];
  query: string;
  focusMode: InspectorFocusMode;
  treeFilterMode: InspectorTreeFilterMode;
  hideInvisible: boolean;
  autoRefreshTree: boolean;
};

export type InspectorState = {
  enabled: boolean;
  hoveredNodeId: InspectorNodeId | null;
  selectedNodeId: InspectorNodeId | null;
  panelOpen: boolean;
  panelPosition: InspectorPanelPosition;
  panelSize: InspectorPanelSize;
  treePaneWidth: number;
  pickMode: InspectorPickMode;
  debug: boolean;
  hierarchy: InspectorHierarchyState;
};

export type InspectorAdapter = {
  isEnabled(): boolean;
  getHostRootElement?(): Element | null;
  getSourceGraphSnapshot?(): SourceGraphSnapshot | null;
  enrichNode?(node: InspectorNode): InspectorNodeEnrichment | null;
  getSourceBackedParameters?(node: InspectorNode): SourceBackedParameter[];
  getParameterDescriptors?(node: InspectorNode): AuthoringParameterDescriptor[];
  getEffectivePreviewValues?(node: InspectorNode, draftChanges: DraftChange[]): EffectivePreviewValue[];
  getPreviewCapabilities?(node?: InspectorNode | null): HostPreviewCapabilities;
  applyDraftChanges?(draftChanges: DraftChange[]): void;
  previewSourceBackedDrafts?(draftChanges: SourceBackedDraftChange[]): void;
  clearSourceBackedDraftPreview?(): void;
  applySourceBackedDrafts?(draftChanges: SourceBackedDraftChange[]): Promise<SourceBackedApplyResult> | SourceBackedApplyResult;
  canOpenNodeInWorkbench?(node: InspectorNode): boolean;
  openNodeInWorkbench?(node: InspectorNode): void;
};

export {
  __wbNextScope,
  __wbNodeId,
  createDefinitionId,
  createDefinitionRootScopeId,
  createPlacementScopeId,
  createSourceNodeId,
  createTemplateNodeToken,
  normalizeRepoRelativeSourceLocation,
  normalizeRepoRelativeSourcePath,
  WORKBENCH_SOURCE_ID_VERSION,
} from "./sourceNodeIds";
export { WorkbenchScopeBoundary, useWorkbenchScope } from "./runtimeIds";
