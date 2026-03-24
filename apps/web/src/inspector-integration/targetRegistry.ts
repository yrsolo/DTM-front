import type { InspectorTarget } from "@dtm/workbench-inspector";

const appTargets: InspectorTarget[] = [];

export function listInspectorTargets(): InspectorTarget[] {
  return appTargets;
}

export function getInspectorTargetById(id: string): InspectorTarget | null {
  return appTargets.find((target) => target.id === id) ?? null;
}
