import React from "react";
import {
  InspectorOverlay,
  InspectorProvider,
  InspectorSidebar,
  type InspectorAdapter,
  type InspectorNode,
  type InspectorNodeEnrichment,
  type InspectorPropertiesSection,
} from "@dtm/workbench-inspector";

import { LayoutContext } from "../components/Layout";
import { getWorkbenchInspectorActivation } from "./activation";
import { getInspectorOwnershipRefs } from "./targetBindings";
import { getInspectorTargetById } from "./targetRegistry";
import { openTargetInWorkbench } from "./openWorkbench";

function createWorkbenchInspectorAdapter(canUseWorkbench: boolean): InspectorAdapter {
  return {
    isEnabled() {
      return true;
    },
    enrichNode(node) {
      const semanticTargetId = node.semanticTargetId;
      if (!semanticTargetId) return null;
      const semanticTarget = getInspectorTargetById(semanticTargetId);
      const propertySections: InspectorPropertiesSection[] = semanticTarget
        ? [
            {
              id: "workbench-bridge",
              title: "Workbench bridge",
              fields: [
                { id: "semantic-target", label: "Semantic target", value: semanticTarget.id },
                { id: "workbench-open", label: "Workbench action", value: canUseWorkbench ? "available" : "unavailable" },
              ],
            },
          ]
        : [];

      const enrichment: InspectorNodeEnrichment = {
        label: semanticTarget?.label,
        meta: semanticTarget?.meta,
        ownershipRefs: getInspectorOwnershipRefs(semanticTargetId),
        propertySections,
      };
      return enrichment;
    },
    canOpenNodeInWorkbench(node) {
      return Boolean(canUseWorkbench && node.semanticTargetId);
    },
    openNodeInWorkbench(node) {
      if (!canUseWorkbench || !node.semanticTargetId) return;
      openTargetInWorkbench(node.semanticTargetId);
    },
  };
}

export function WorkbenchInspectorMount() {
  const layout = React.useContext(LayoutContext);
  const activation = React.useMemo(() => getWorkbenchInspectorActivation(), []);
  const adapter = React.useMemo(
    () => createWorkbenchInspectorAdapter(layout?.canUseWorkbench ?? false),
    [layout?.canUseWorkbench]
  );

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
