import type { OwnershipRef } from "@dtm/workbench-inspector";
import { getWorkbenchOwnershipRefs } from "./workbenchOwnership";

const ownershipMap: Record<string, OwnershipRef[]> = {
  "app.chrome.topbar": [
    { id: "tab:foundation", label: "Foundation tab", kind: "tab" },
    { id: "tab:surfaces", label: "Surfaces tab", kind: "tab" },
  ],
  "app.timeline.controls": [
    { id: "tab:timeline", label: "Timeline tab", kind: "tab" },
    { id: "tab:motion", label: "Motion tab", kind: "tab" },
  ],
  "app.timeline.page-switch": [
    { id: "tab:timeline", label: "Timeline tab", kind: "tab" },
    { id: "tab:surfaces", label: "Surfaces tab", kind: "tab" },
  ],
  "app.timeline.filters": [
    { id: "tab:timeline", label: "Timeline tab", kind: "tab" },
    { id: "tab:defaults", label: "Defaults tab", kind: "tab" },
  ],
  "app.timeline.canvas": [
    { id: "tab:timeline", label: "Timeline tab", kind: "tab" },
  ],
  "app.timeline.mode-dock": [
    { id: "tab:timeline", label: "Timeline tab", kind: "tab" },
    { id: "tab:motion", label: "Motion tab", kind: "tab" },
  ],
  "app.tasks.table": [
    { id: "tab:tasksTable", label: "Tasks table tab", kind: "tab" },
    { id: "tab:surfaces", label: "Surfaces tab", kind: "tab" },
  ],
  "app.tasks.timeline": [
    { id: "tab:timeline", label: "Timeline tab", kind: "tab" },
    { id: "tab:tasksTable", label: "Tasks table tab", kind: "tab" },
  ],
  "app.designers.timeline": [
    { id: "tab:timeline", label: "Timeline tab", kind: "tab" },
    { id: "tab:surfaces", label: "Surfaces tab", kind: "tab" },
  ],
  "app.designers.surface": [
    { id: "tab:surfaces", label: "Surfaces tab", kind: "tab" },
    { id: "tab:timeline", label: "Timeline tab", kind: "tab" },
  ],
  "app.designers.board": [
    { id: "tab:surfaces", label: "Surfaces tab", kind: "tab" },
    { id: "tab:tasksTable", label: "Tasks table tab", kind: "tab" },
  ],
  "app.task.drawer": [
    { id: "tab:drawer", label: "Drawer tab", kind: "tab" },
    { id: "tab:milestones", label: "Milestones tab", kind: "tab" },
  ],
  "app.task.attachments": [
    { id: "tab:drawer", label: "Drawer tab", kind: "tab" },
  ],
  "app.workbench.dock": [
    { id: "tab:workbench", label: "Workbench tab", kind: "tab" },
  ],
};

export function getInspectorOwnershipRefs(targetId: string): OwnershipRef[] {
  return [...(ownershipMap[targetId] ?? []), ...getWorkbenchOwnershipRefs(targetId)];
}
