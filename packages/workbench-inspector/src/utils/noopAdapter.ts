import type { InspectorAdapter } from "../contracts/types";

export const noopInspectorAdapter: InspectorAdapter = {
  isEnabled() {
    return false;
  },
  canOpenNodeInWorkbench() {
    return false;
  },
  openNodeInWorkbench() {
    // foundation no-op
  },
};
