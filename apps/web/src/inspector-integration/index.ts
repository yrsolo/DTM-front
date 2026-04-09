import React from "react";
import {
  InspectorOverlay,
  InspectorProvider,
  InspectorSidebar,
  type AuthoringNode,
  type DraftChange,
  type HostPreviewCapabilities,
  type InspectorAdapter,
  type InspectorNode,
  type InspectorNodeEnrichment,
  type InspectorPropertiesSection,
  type SourceBackedDraftChange,
  type SourceGraphSnapshot,
} from "@dtm/workbench-inspector";

import { LayoutContext, type LayoutContextValue } from "../components/Layout";
import { getWorkbenchInspectorActivation } from "./activation";
import { getAuthoringParameterDescriptorsForNode, getEffectivePreviewValuesForNode } from "./authoringParameters";
import { getInspectorOwnershipRefs } from "./targetBindings";
import { getInspectorTargetById } from "./targetRegistry";
import { openTargetInWorkbench } from "./openWorkbench";
import { createSourceBackedEditingController } from "./sourceBackedEditing";
import {
  getMatchedWorkbenchSnapshots,
  getMatchingWorkbenchSourceSurfaces,
} from "./surfaceRegistry";

function shallowEqualRecord(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!Object.is(left[key], right[key])) return false;
  }
  return true;
}

function mergeSourceGraphSnapshots(
  snapshots: Array<SourceGraphSnapshot | null | undefined>
): SourceGraphSnapshot | null {
  const availableSnapshots = snapshots.filter(Boolean) as SourceGraphSnapshot[];
  if (!availableSnapshots.length) return null;
  if (availableSnapshots.length === 1) return availableSnapshots[0];

  const seenRootNodeIds = new Set<string>();
  const rootNodes = [];

  for (const snapshot of availableSnapshots) {
    for (const node of snapshot.rootNodes ?? []) {
      if (seenRootNodeIds.has(node.id)) continue;
      seenRootNodeIds.add(node.id);
      rootNodes.push(node);
    }
  }

  return {
    id: `merged:${availableSnapshots.map((snapshot) => snapshot.id).join("+")}`,
    version: availableSnapshots[0].version,
    entry: availableSnapshots.map((snapshot) => snapshot.entry).join(" + "),
    generatedAt: availableSnapshots[0].generatedAt,
    rootNodes,
  };
}

function createWorkbenchInspectorAdapter(
  canUseWorkbench: boolean,
  sourceGraphSnapshot: SourceGraphSnapshot | null,
  sourceBackedEditingController: ReturnType<typeof createSourceBackedEditingController>,
  layoutState: {
    design: LayoutContextValue["design"];
    keyColors: LayoutContextValue["keyColors"];
    setDesignPreviewOverlay: LayoutContextValue["setDesignPreviewOverlay"];
    setKeyColorPreviewOverlay: LayoutContextValue["setKeyColorPreviewOverlay"];
    previewCapabilities: LayoutContextValue["previewCapabilities"];
  }
): InspectorAdapter {
  const previewCapabilities = layoutState.previewCapabilities;

  const applyGlobalPreviewOverlay = (draftChanges: DraftChange[]) => {
    const designOverlay: Partial<LayoutContextValue["design"]> = {};
    const keyColorOverlay: Partial<LayoutContextValue["keyColors"]> = {};

    const activeDrafts = draftChanges
      .filter((entry) => entry.status === "active")
      .sort((left, right) => {
        const priority: Record<DraftChange["scope"], number> = {
          token: 0,
          component: 1,
          placement: 2,
          "instance-preview": 3,
        };
        return priority[left.scope] - priority[right.scope];
      });

    for (const entry of activeDrafts) {
      if (!previewCapabilities[entry.scope]) continue;
      if (!(entry.scope === "token" || entry.scope === "component")) continue;
      const key = entry.key;
      if (key in layoutState.design) {
        const nextNumber = Number(entry.value);
        if (!Number.isNaN(nextNumber)) {
          designOverlay[key as keyof LayoutContextValue["design"]] = nextNumber as never;
        }
      } else if (key in layoutState.keyColors) {
        keyColorOverlay[key as keyof LayoutContextValue["keyColors"]] = entry.value as never;
      }
    }

    layoutState.setDesignPreviewOverlay((current) =>
      shallowEqualRecord(current as Record<string, unknown>, designOverlay as Record<string, unknown>)
        ? current
        : designOverlay
    );
    layoutState.setKeyColorPreviewOverlay((current) =>
      shallowEqualRecord(current as Record<string, unknown>, keyColorOverlay as Record<string, unknown>)
        ? current
        : keyColorOverlay
    );
  };

  return {
    isEnabled() {
      return true;
    },
    getHostRootElement() {
      if (typeof document === "undefined") return null;
      return (
        document.querySelector("[data-inspector-host-root='true']") ??
        document.getElementById("root")
      );
    },
    getSourceGraphSnapshot() {
      return sourceGraphSnapshot;
    },
    enrichNode(node) {
      const semanticTargetId = node.semanticTargetId;
      const authoringNode: AuthoringNode = {
        id: node.sourceNodeId ?? node.id,
        sourceNodeId: node.sourceNodeId ?? node.id,
        label: node.label,
        scopes:
          node.sourceCategory === "component-definition"
            ? ["component"]
            : semanticTargetId
              ? ["component", "instance"]
              : ["instance"],
        parameterGroups:
          node.repeatedGroupId
            ? ["appearance", "layout", "repeated-pattern"]
            : semanticTargetId
              ? ["appearance", "layout", "semantic"]
              : ["appearance", "layout"],
        hasEditableSurface: Boolean(semanticTargetId || node.sourceCategory === "placement"),
        targetCategory: node.sourceCategory,
      };
      if (!semanticTargetId) {
        return { authoringNode };
      }
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
        authoringNode,
      };
      return enrichment;
    },
    getSourceBackedParameters(node) {
      return node.sourceBackedParameters ?? [];
    },
    getParameterDescriptors(node) {
      return getAuthoringParameterDescriptorsForNode(node);
    },
    getEffectivePreviewValues(node, draftChanges) {
      return getEffectivePreviewValuesForNode(node, draftChanges, layoutState.design, layoutState.keyColors);
    },
    getPreviewCapabilities(): HostPreviewCapabilities {
      return previewCapabilities;
    },
    applyDraftChanges(draftChanges) {
      applyGlobalPreviewOverlay(draftChanges);
    },
    previewSourceBackedDrafts(draftChanges: SourceBackedDraftChange[]) {
      sourceBackedEditingController.previewSourceBackedDrafts(draftChanges);
    },
    clearSourceBackedDraftPreview() {
      sourceBackedEditingController.clearSourceBackedDraftPreview();
    },
    async applySourceBackedDrafts(draftChanges: SourceBackedDraftChange[]) {
      return sourceBackedEditingController.applySourceBackedDrafts(draftChanges);
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
  if (!layout) return null;
  const sourceGraphSnapshot = React.useMemo<SourceGraphSnapshot | null>(() => {
    if (typeof window === "undefined") return null;
    const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
    const matchedSnapshots = getMatchedWorkbenchSnapshots(pathname).map((entry) => entry.snapshot);
    return mergeSourceGraphSnapshots(matchedSnapshots);
  }, []);
  const matchedSurfaceLabels = React.useMemo(() => {
    if (typeof window === "undefined") return [] as string[];
    const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
    return getMatchingWorkbenchSourceSurfaces(pathname).map((surface) => surface.label);
  }, []);
  const sourceBackedEditingController = React.useMemo(() => createSourceBackedEditingController(), []);
  const adapter = React.useMemo(
    () =>
      createWorkbenchInspectorAdapter(layout.canUseWorkbench, sourceGraphSnapshot, sourceBackedEditingController, {
        design: layout.design,
        keyColors: layout.keyColors,
        setDesignPreviewOverlay: layout.setDesignPreviewOverlay,
        setKeyColorPreviewOverlay: layout.setKeyColorPreviewOverlay,
        previewCapabilities: layout.previewCapabilities,
      }),
    [
      layout.canUseWorkbench,
      layout.design,
      layout.keyColors,
      layout.previewCapabilities,
      layout.setDesignPreviewOverlay,
      layout.setKeyColorPreviewOverlay,
      sourceBackedEditingController,
      sourceGraphSnapshot,
    ]
  );

  React.useEffect(() => {
    if (!activation.debug || typeof window === "undefined") return;
    console.info("[workbench-inspector] source surfaces matched", {
      pathname: window.location.pathname,
      surfaces: matchedSurfaceLabels,
      snapshotId: sourceGraphSnapshot?.id ?? null,
      snapshotEntry: sourceGraphSnapshot?.entry ?? null,
    });
  }, [activation.debug, matchedSurfaceLabels, sourceGraphSnapshot]);

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
