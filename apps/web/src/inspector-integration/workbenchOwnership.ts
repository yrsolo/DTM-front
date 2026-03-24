import type { OwnershipRef } from "@dtm/workbench-inspector";

import { UI_STYLE_REGISTRY } from "../design/uiRegistry";

const targetToSourcePathsMap: Partial<Record<string, string[]>> = {
  "app.designers.board": [
    "apps/web/src/components/DesignersBoard.tsx",
  ],
  "app.task.drawer": [
    "apps/web/src/components/TaskDetailsDrawer.tsx",
  ],
  "app.task.attachments": [
    "apps/web/src/components/attachments/TaskAttachmentsSection.tsx",
  ],
};

export function getWorkbenchOwnershipRefs(targetId: string): OwnershipRef[] {
  const sourcePaths = targetToSourcePathsMap[targetId] ?? [];
  if (!sourcePaths.length) return [];

  return UI_STYLE_REGISTRY
    .filter((entry) => sourcePaths.includes(entry.sourcePath))
    .map((entry) => ({
      id: `ui:${entry.id}`,
      label: `${entry.group}: ${entry.title}`,
      kind: "group" as const,
    }));
}

export function hasWorkbenchOwnership(targetId: string): boolean {
  return getWorkbenchOwnershipRefs(targetId).length > 0;
}
