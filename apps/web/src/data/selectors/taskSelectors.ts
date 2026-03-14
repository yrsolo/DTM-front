import { SnapshotV1, TaskV1 } from "@dtm/schema/snapshot";

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

export function selectAllTasks(snapshot: SnapshotV1 | null): TaskV1[] {
  return (snapshot?.tasks ?? []).filter((task) => !isCompletedTask(task));
}

export function selectMyTasks(snapshot: SnapshotV1 | null, personId: string | null): TaskV1[] {
  if (!snapshot || !personId) return [];
  return snapshot.tasks.filter((task) => task.ownerId === personId && !isCompletedTask(task));
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
