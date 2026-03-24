import React from "react";
import {
  InspectorOverlay,
  InspectorProvider,
  InspectorSidebar,
  type InspectorAdapter,
} from "@dtm/workbench-inspector";

import { getWorkbenchInspectorActivation } from "./activation";
import { getInspectorOwnershipRefs } from "./targetBindings";
import { isInspectorTarget } from "./targetGuards";
import { getInspectorTargetById, listInspectorTargets } from "./targetRegistry";
import { openTargetInWorkbench } from "./openWorkbench";

function createWorkbenchInspectorAdapter(): InspectorAdapter {
  return {
    isEnabled() {
      return true;
    },
    resolveTargetFromElement(element) {
      const targetId = element.dataset.inspectorTargetId?.trim();
      if (!targetId) return null;
      const target = getInspectorTargetById(targetId);
      return isInspectorTarget(target) ? target : null;
    },
    getTargetById(id) {
      const target = getInspectorTargetById(id);
      return isInspectorTarget(target) ? target : null;
    },
    getParentTarget(id) {
      const target = getInspectorTargetById(id);
      if (!target?.parentId) return null;
      return getInspectorTargetById(target.parentId);
    },
    getChildTargets(id) {
      return listInspectorTargets().filter((target) => target.parentId === id);
    },
    getOwnershipRefs(targetId) {
      return getInspectorOwnershipRefs(targetId);
    },
    openTargetInWorkbench(targetId) {
      openTargetInWorkbench(targetId);
    },
  };
}

export function WorkbenchInspectorMount() {
  const activation = React.useMemo(() => getWorkbenchInspectorActivation(), []);
  const adapter = React.useMemo(() => createWorkbenchInspectorAdapter(), []);

  if (!activation.enabled) return null;

  return React.createElement(
    InspectorProvider,
    {
      activation,
      adapter,
      children: React.createElement(
        React.Fragment,
        null,
        React.createElement(InspectorOverlay),
        React.createElement(InspectorSidebar)
      ),
    },
  );
}
