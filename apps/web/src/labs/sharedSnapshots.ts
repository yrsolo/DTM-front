import type { AnalyticsSourceDataset } from "../analytics/types";
import type { TaskFormatSourceSnapshot } from "../formatSort/types";

function normalizeTaskDate(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function toTaskFormatSourceSnapshot(dataset: AnalyticsSourceDataset | null): TaskFormatSourceSnapshot | null {
  if (!dataset) return null;
  return {
    generatedAt: dataset.generatedAt,
    contour: dataset.contour,
    tasksTotalExpected: dataset.tasksTotalExpected,
    tasksTotalCollected: dataset.tasksTotalCollected,
    sourceMeta: dataset.sourceMeta,
    people: dataset.snapshot.people.map((person) => ({
      id: person.id,
      name: person.name,
      position: person.position ?? null,
    })),
    tasks: dataset.snapshot.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      format_: typeof task.format_ === "string" ? task.format_ : null,
      type: typeof task.type === "string" ? task.type : null,
      ownerId: typeof task.ownerId === "string" ? task.ownerId : null,
      ownerName: typeof task.ownerName === "string" ? task.ownerName : null,
      brand: typeof task.brand === "string" ? task.brand : null,
      groupId: typeof task.groupId === "string" ? task.groupId : null,
      status: task.status,
      start: normalizeTaskDate(task.start),
      end: normalizeTaskDate(task.end),
      nextDue: normalizeTaskDate(task.nextDue),
    })),
  };
}
