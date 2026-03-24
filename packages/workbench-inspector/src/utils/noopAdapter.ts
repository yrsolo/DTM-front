import type { InspectorAdapter } from "../contracts/types";

export const noopInspectorAdapter: InspectorAdapter = {
  isEnabled() {
    return false;
  },
  resolveTargetFromElement() {
    return null;
  },
  getTargetById() {
    return null;
  },
  getParentTarget() {
    return null;
  },
  getChildTargets() {
    return [];
  },
  openTargetInWorkbench() {
    // foundation no-op
  },
};
