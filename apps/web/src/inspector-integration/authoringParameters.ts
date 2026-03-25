import type {
  AuthoringParameterDescriptor,
  AuthoringValueState,
  DraftChange,
  EffectivePreviewValue,
  InspectorNode,
} from "@dtm/workbench-inspector";
import { resolveAuthoringInput } from "@dtm/workbench-inspector";

import { KEY_COLOR_ITEMS, TASK_PALETTE_ITEMS, type KeyColors } from "../design/colors";
import { ALL_DESIGN_CONTROL_ITEMS, type DesignControls } from "../design/controls";
import { type WorkbenchTabId, WORKBENCH_LAYOUT } from "../design/workbenchLayout";
import { getInspectorOwnershipRefs } from "./targetBindings";

type ControlDescriptorSource = {
  key: string;
  label: string;
  group: string;
  valueKind: AuthoringParameterDescriptor["valueKind"];
  min?: number;
  max?: number;
  step?: number;
  editorHint?: AuthoringParameterDescriptor["editorHint"];
};

function collectTabIds(node: InspectorNode): WorkbenchTabId[] {
  const refs = node.semanticTargetId ? getInspectorOwnershipRefs(node.semanticTargetId) : [];
  return refs
    .filter((ref) => ref.kind === "tab" && ref.id.startsWith("tab:"))
    .map((ref) => ref.id.slice(4) as WorkbenchTabId);
}

function buildControlSourceIndex(): Map<string, ControlDescriptorSource> {
  const rangeIndex = new Map(ALL_DESIGN_CONTROL_ITEMS.map((item) => [String(item.key), item]));
  const colorIndex = new Map([...KEY_COLOR_ITEMS, ...TASK_PALETTE_ITEMS].map((item) => [String(item.key), item]));
  const output = new Map<string, ControlDescriptorSource>();

  for (const section of WORKBENCH_LAYOUT) {
    for (const group of section.groups) {
      for (const control of group.controls) {
        const key = String(control.key);
        if (output.has(key)) continue;
        if (control.kind === "range") {
          const item = rangeIndex.get(key);
          if (!item) continue;
          output.set(key, {
            key,
            label: item.label,
            group: group.title,
            valueKind: "number",
            min: item.min,
            max: item.max,
            step: item.step,
            editorHint: "number",
          });
          continue;
        }
        const item = colorIndex.get(key);
        if (!item) continue;
        output.set(key, {
          key,
          label: item.label,
          group: group.title,
          valueKind: "color",
          editorHint: "color",
        });
      }
    }
  }

  return output;
}

const CONTROL_SOURCE_INDEX = buildControlSourceIndex();

function getKeysForTabs(tabIds: WorkbenchTabId[]): string[] {
  const unique = new Set<string>();
  for (const section of WORKBENCH_LAYOUT) {
    if (!tabIds.includes(section.id)) continue;
    for (const group of section.groups) {
      for (const control of group.controls) {
        unique.add(String(control.key));
      }
    }
  }
  return [...unique];
}

function resolveBaseValue(key: string, design: DesignControls, keyColors: KeyColors): string | null {
  if (key in design) {
    return String(design[key as keyof DesignControls]);
  }
  if (key in keyColors) {
    return String(keyColors[key as keyof KeyColors]);
  }
  return null;
}

export function getAuthoringParameterDescriptorsForNode(node: InspectorNode): AuthoringParameterDescriptor[] {
  const sourceNodeId = node.sourceNodeId ?? node.id;
  const tabIds = collectTabIds(node);
  if (!tabIds.length) return [];

  const output: AuthoringParameterDescriptor[] = [];
  for (const key of getKeysForTabs(tabIds)) {
    const source = CONTROL_SOURCE_INDEX.get(key);
    if (!source) continue;
    output.push({
      id: `${sourceNodeId}::${key}`,
      sourceNodeId,
      label: source.label,
      group: source.group,
      valueKind: source.valueKind,
      supportedScopes: ["token", "component", "placement"],
      min: source.min,
      max: source.max,
      step: source.step,
      editorHint: source.editorHint,
      meta: {
        controlKey: key,
        ownerTabs: tabIds.join(", "),
      },
    });
  }
  return output;
}

function inferDraftState(status: DraftChange["status"]): AuthoringValueState {
  if (status === "invalid") return "invalid";
  if (status === "unresolved") return "unresolved";
  return "valid";
}

export function getEffectivePreviewValuesForNode(
  node: InspectorNode,
  draftChanges: DraftChange[],
  design: DesignControls,
  keyColors: KeyColors
): EffectivePreviewValue[] {
  const sourceNodeId = node.sourceNodeId ?? node.id;
  const descriptors = getAuthoringParameterDescriptorsForNode(node);

  return descriptors.map((descriptor) => {
    const controlKey = String(descriptor.meta?.controlKey ?? "");
    const relevantDrafts = draftChanges
      .filter((entry) => entry.sourceNodeId === sourceNodeId && entry.key === controlKey && entry.status === "active")
      .sort((left, right) => {
        const priority: Record<DraftChange["scope"], number> = {
          token: 0,
          component: 1,
          placement: 2,
          "instance-preview": 3,
        };
        return priority[right.scope] - priority[left.scope];
    });
    const topDraft = relevantDrafts[0];
    const baseValue = resolveBaseValue(controlKey, design, keyColors);
    const draftResolution = topDraft ? resolveAuthoringInput(descriptor, topDraft.value) : null;
    const baseResolution = resolveAuthoringInput(descriptor, baseValue ?? "");

    return {
      parameterId: descriptor.id,
      sourceNodeId,
      valueKind: descriptor.valueKind,
      value: draftResolution?.normalizedValue ?? baseResolution.normalizedValue ?? baseValue ?? "-",
      normalizedValue: draftResolution?.normalizedValue ?? baseResolution.normalizedValue ?? null,
      state: topDraft ? draftResolution?.state ?? inferDraftState(topDraft.status) : baseResolution.state,
      resolvedFrom: topDraft?.scope ?? "base",
      trace: topDraft ? `${topDraft.scope}:${topDraft.group}.${topDraft.key}` : `base:${controlKey}`,
      message: draftResolution?.message ?? baseResolution.message ?? null,
    } satisfies EffectivePreviewValue;
  });
}
