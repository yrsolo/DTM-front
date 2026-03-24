import { type WorkbenchTabId } from "../design/workbenchLayout";

const targetToTabMap: Partial<Record<string, WorkbenchTabId>> = {
  "app.chrome.topbar": "foundation",
  "app.timeline.page-switch": "timeline",
  "app.timeline.filters": "defaults",
  "app.tasks.table": "tasksTable",
  "app.tasks.timeline": "timeline",
  "app.designers.timeline": "timeline",
  "app.designers.surface": "surfaces",
  "app.designers.board": "surfaces",
  "app.task.drawer": "drawer",
  "app.task.attachments": "drawer",
  "app.timeline.controls": "timeline",
  "app.timeline.canvas": "timeline",
  "app.timeline.mode-dock": "timeline",
  "app.workbench.dock": "workbench",
};

export function openTargetInWorkbench(targetId: string): void {
  if (typeof window === "undefined") return;
  const tabId = targetToTabMap[targetId];
  if (!tabId) return;
  window.dispatchEvent(new CustomEvent("dtm:workbench-focus", { detail: { tabId } }));
}
