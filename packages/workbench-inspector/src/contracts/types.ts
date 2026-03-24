export type InspectorTargetMeta = Record<string, string | number | boolean | null>;

export type InspectorTarget = {
  id: string;
  label: string;
  parentId?: string | null;
  childIds?: string[];
  meta?: InspectorTargetMeta;
};

export type OwnershipRef = {
  id: string;
  label: string;
  kind: "tab" | "group" | "control" | "external";
};

export type InspectorActivation = {
  enabled: boolean;
  source: "disabled" | "query" | "storage";
  debug?: boolean;
};

export type InspectorState = {
  enabled: boolean;
  hoveredTargetId: string | null;
  selectedTargetId: string | null;
  panelOpen: boolean;
  debug: boolean;
};

export type InspectorAdapter = {
  isEnabled(): boolean;
  resolveTargetFromElement(element: HTMLElement): InspectorTarget | null;
  getTargetById(id: string): InspectorTarget | null;
  getParentTarget(id: string): InspectorTarget | null;
  getChildTargets(id: string): InspectorTarget[];
  getOwnershipRefs?(targetId: string): OwnershipRef[];
  openTargetInWorkbench(targetId: string): void;
};
