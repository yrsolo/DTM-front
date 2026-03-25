type SemanticInspectorTarget = {
  id: string;
  label: string;
  parentId?: string | null;
  childIds?: string[];
  meta?: Record<string, string | number | boolean | null>;
};

const appTargets: SemanticInspectorTarget[] = [
  {
    id: "app.chrome.topbar",
    label: "App topbar",
    childIds: ["app.workbench.dock"],
    meta: { scope: "shell", availability: "live", designArea: "navigation", tuningPriority: "medium" },
  },
  {
    id: "app.timeline.controls",
    label: "Timeline controls dock",
    childIds: ["app.timeline.page-switch", "app.timeline.filters"],
    meta: { scope: "timeline", availability: "live", designArea: "controls", tuningPriority: "high" },
  },
  {
    id: "app.timeline.page-switch",
    label: "Timeline page switch",
    parentId: "app.timeline.controls",
    meta: { scope: "timeline", availability: "live", designArea: "controls", ownerTab: "timeline", tuningPriority: "high" },
  },
  {
    id: "app.timeline.filters",
    label: "Timeline filters panel",
    parentId: "app.timeline.controls",
    meta: { scope: "timeline", availability: "conditional", designArea: "controls", ownerTab: "surfaces", tuningPriority: "high" },
  },
  {
    id: "app.timeline.canvas",
    label: "Timeline canvas",
    childIds: ["app.timeline.mode-dock"],
    meta: { scope: "timeline", availability: "live", mode: "tasks", designArea: "canvas", tuningPriority: "high" },
  },
  {
    id: "app.timeline.mode-dock",
    label: "Timeline mode dock",
    parentId: "app.timeline.canvas",
    meta: { scope: "timeline", availability: "live", mode: "tasks", designArea: "navigation", tuningPriority: "medium" },
  },
  {
    id: "app.tasks.table",
    label: "Tasks table",
    meta: { scope: "tasks", availability: "unmounted", designArea: "content", tuningPriority: "medium" },
  },
  {
    id: "app.tasks.timeline",
    label: "Tasks timeline",
    meta: { scope: "tasks", availability: "unmounted", designArea: "content", tuningPriority: "medium" },
  },
  {
    id: "app.designers.timeline",
    label: "Designers timeline",
    meta: { scope: "designers", availability: "mode-gated", designArea: "content", tuningPriority: "medium" },
  },
  {
    id: "app.designers.surface",
    label: "Designers surface",
    childIds: ["app.designers.board"],
    meta: { scope: "designers", availability: "mode-gated", designArea: "content", tuningPriority: "medium" },
  },
  {
    id: "app.designers.board",
    label: "Designers board",
    parentId: "app.designers.surface",
    meta: { scope: "designers", availability: "mode-gated", designArea: "board", tuningPriority: "high" },
  },
  {
    id: "app.task.drawer",
    label: "Task details drawer",
    childIds: ["app.task.attachments"],
    meta: { scope: "drawer", availability: "conditional", designArea: "drawer", ownerTab: "surfaces", tuningPriority: "high" },
  },
  {
    id: "app.task.attachments",
    label: "Task attachments section",
    parentId: "app.task.drawer",
    meta: { scope: "drawer", availability: "conditional", designArea: "attachments", ownerTab: "surfaces", tuningPriority: "medium" },
  },
  {
    id: "app.workbench.dock",
    label: "Workbench dock",
    parentId: "app.chrome.topbar",
    meta: { scope: "shell", availability: "live", designArea: "workbench", tuningPriority: "high" },
  },
];

export function getInspectorTargetById(id: string): SemanticInspectorTarget | null {
  return appTargets.find((target) => target.id === id) ?? null;
}
