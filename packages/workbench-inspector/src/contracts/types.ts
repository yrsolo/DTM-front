export type InspectorValue = string | number | boolean | null;
export type InspectorNodeId = string;
export type InspectorPickMode = "off" | "on";
export type InspectorFocusMode = "all" | "marked";
export type InspectorTreeFilterMode = "smart" | "all";

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

export type InspectorNodeKind = "semantic" | "control" | "content" | "text" | "image" | "container" | "unknown";

export type InspectorNode = {
  id: InspectorNodeId;
  label: string;
  kind: InspectorNodeKind;
  tagName: string;
  path: string;
  depth: number;
  parentId?: InspectorNodeId | null;
  children?: InspectorNode[];
  bounds: InspectorNodeBounds | null;
  isVisible: boolean;
  isInteractive: boolean;
  semanticTargetId?: string | null;
  meta?: InspectorNodeMeta;
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
};

export type InspectorState = {
  enabled: boolean;
  hoveredNodeId: InspectorNodeId | null;
  selectedNodeId: InspectorNodeId | null;
  panelOpen: boolean;
  panelPosition: InspectorPanelPosition;
  pickMode: InspectorPickMode;
  debug: boolean;
  hierarchy: InspectorHierarchyState;
};

export type InspectorAdapter = {
  isEnabled(): boolean;
  enrichNode?(node: InspectorNode): InspectorNodeEnrichment | null;
  canOpenNodeInWorkbench?(node: InspectorNode): boolean;
  openNodeInWorkbench?(node: InspectorNode): void;
};
