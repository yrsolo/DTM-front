import { SnapshotV1, TaskV1 } from "@dtm/schema/snapshot";

export type AgendaItem = {
  id: string;
  taskId: string;
  title: string;
  date: string;
  subtitle: string | null;
  personLabel: string | null;
  isOverdue: boolean;
  isToday: boolean;
  isUpcoming: boolean;
};

export type AgendaDayGroup = {
  key: string;
  label: string;
  items: AgendaItem[];
};

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isoDateToDay(value: string): Date | null {
  const normalized = value.slice(0, 10);
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveAgendaDate(task: TaskV1): string | null {
  return task.nextDue ?? task.end ?? task.start ?? null;
}

function buildAgendaLabel(date: Date, now: Date): string {
  const today = startOfDay(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((date.getTime() - today.getTime()) / dayMs);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Завтра";
  if (diffDays === -1) return "Вчера";
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    weekday: "short",
  });
}

export function selectAgendaItemsFromTasks(
  tasks: TaskV1[],
  snapshot: SnapshotV1 | null,
  now = new Date()
): AgendaItem[] {
  const today = startOfDay(now);
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const peopleById = new Map((snapshot?.people ?? []).map((person) => [person.id, person.name] as const));

  return tasks
    .map((task) => {
      const date = resolveAgendaDate(task);
      if (!date) return null;
      const parsed = isoDateToDay(date);
      if (!parsed) return null;
      return {
        id: `${task.id}:${date}`,
        taskId: task.id,
        title: task.title,
        date: date.slice(0, 10),
        subtitle: [task.brand, task.format_].filter(Boolean).join(" • ") || null,
        personLabel: task.ownerId ? peopleById.get(task.ownerId) ?? task.ownerName ?? null : task.ownerName ?? null,
        isOverdue: parsed.getTime() < today.getTime(),
        isToday: parsed.getTime() === today.getTime(),
        isUpcoming: parsed.getTime() > today.getTime() && parsed.getTime() <= weekAhead.getTime(),
      } satisfies AgendaItem;
    })
    .filter((item): item is AgendaItem => Boolean(item))
    .sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
}

export function groupAgendaItemsByDay(items: AgendaItem[], now = new Date()): AgendaDayGroup[] {
  const groups = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const existing = groups.get(item.date) ?? [];
    existing.push(item);
    groups.set(item.date, existing);
  }

  return [...groups.entries()].map(([key, dayItems]) => {
    const date = isoDateToDay(key) ?? now;
    return {
      key,
      label: buildAgendaLabel(date, now),
      items: dayItems,
    };
  });
}
