import { SnapshotV1, TaskV1 } from "@dtm/schema/snapshot";

import { toShortPersonName } from "../../utils/personName";

export type TaskScopeMode = "mine" | "all";
export type TaskQuickFilter = "all" | "today" | "overdue" | "week";

export type TaskListStats = {
  all: number;
  today: number;
  overdue: number;
  week: number;
};

function isCompletedTask(task: TaskV1): boolean {
  return (task.status ?? "").trim().toLowerCase() === "done";
}

function resolveTaskDate(task: TaskV1): string | null {
  return task.nextDue ?? task.end ?? task.start ?? null;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

export function taskMatchesCurrentPerson(task: TaskV1, currentPerson: { personId: string | null; personName: string | null }): boolean {
  if (currentPerson.personId && task.ownerId === currentPerson.personId) {
    return true;
  }
  if (currentPerson.personName && task.ownerName) {
    return normalizeIdentity(task.ownerName) === normalizeIdentity(currentPerson.personName);
  }
  return false;
}

export function taskMatchesCurrentPersonWithResolvedOwners(
  task: TaskV1,
  currentPerson: { personId: string | null; personName: string | null },
  resolvedOwnerNames: Record<string, string>,
  peopleById: Map<string, string> = new Map()
): boolean {
  if (taskMatchesCurrentPerson(task, currentPerson)) {
    return true;
  }
  if (currentPerson.personName) {
    const currentFull = normalizeIdentity(currentPerson.personName);
    const currentShort = normalizeIdentity(toShortPersonName(currentPerson.personName));
    const taskVisibleOwner =
      task.ownerName?.trim() ||
      (task.ownerId ? peopleById.get(task.ownerId) ?? resolvedOwnerNames[task.ownerId] ?? "" : "");
    if (taskVisibleOwner) {
      const visibleFull = normalizeIdentity(taskVisibleOwner);
      const visibleShort = normalizeIdentity(toShortPersonName(taskVisibleOwner));
      if (
        visibleFull === currentFull ||
        visibleFull === currentShort ||
        visibleShort === currentFull ||
        visibleShort === currentShort
      ) {
        return true;
      }
    }
  }
  if (!currentPerson.personName || !task.ownerId) {
    return false;
  }
  const resolvedOwnerName = resolvedOwnerNames[task.ownerId];
  if (!resolvedOwnerName) {
    return false;
  }
  return normalizeIdentity(resolvedOwnerName) === normalizeIdentity(currentPerson.personName);
}

export function selectAllTasks(snapshot: SnapshotV1 | null): TaskV1[] {
  return (snapshot?.tasks ?? []).filter((task) => !isCompletedTask(task));
}

export function selectMyTasks(
  snapshot: SnapshotV1 | null,
  currentPerson: { personId: string | null; personName: string | null },
  resolvedOwnerNames: Record<string, string> = {},
  peopleById: Map<string, string> = new Map()
): TaskV1[] {
  if (!snapshot || (!currentPerson.personId && !currentPerson.personName)) return [];
  return snapshot.tasks.filter(
    (task) =>
      taskMatchesCurrentPersonWithResolvedOwners(task, currentPerson, resolvedOwnerNames, peopleById) &&
      !isCompletedTask(task)
  );
}

export function selectTaskById(snapshot: SnapshotV1 | null, taskId: string | null): TaskV1 | null {
  if (!snapshot || !taskId) return null;
  return snapshot.tasks.find((task) => task.id === taskId) ?? null;
}

export function sortTasksForMobile(tasks: TaskV1[]): TaskV1[] {
  return [...tasks].sort((left, right) => {
    const leftDate = resolveTaskDate(left) ?? "9999-99-99";
    const rightDate = resolveTaskDate(right) ?? "9999-99-99";
    if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);
    return left.title.localeCompare(right.title);
  });
}

export function filterTasksByQuickFilter(tasks: TaskV1[], quickFilter: TaskQuickFilter, now = new Date()): TaskV1[] {
  if (quickFilter === "all") return tasks;
  const today = startOfDay(now);
  const weekEnd = addDays(today, 7);
  return tasks.filter((task) => {
    const due = resolveTaskDate(task);
    if (!due) return false;
    const dueDate = startOfDay(new Date(`${due.slice(0, 10)}T00:00:00`));
    if (Number.isNaN(dueDate.getTime())) return false;
    if (quickFilter === "today") return dueDate.getTime() === today.getTime();
    if (quickFilter === "overdue") return dueDate.getTime() < today.getTime();
    return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= weekEnd.getTime();
  });
}

export function selectTaskListStats(tasks: TaskV1[], now = new Date()): TaskListStats {
  return {
    all: tasks.length,
    today: filterTasksByQuickFilter(tasks, "today", now).length,
    overdue: filterTasksByQuickFilter(tasks, "overdue", now).length,
    week: filterTasksByQuickFilter(tasks, "week", now).length,
  };
}
