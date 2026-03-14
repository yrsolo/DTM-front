import { SnapshotV1, TaskV1 } from "@dtm/schema/snapshot";

import { resolveMilestoneTone, type MilestoneTone } from "../../utils/milestoneTone";

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

export type MiniMilestoneItem = {
  id: string;
  taskId: string;
  milestoneLabel: string;
  brand: string | null;
  format: string | null;
  showName: string | null;
  date: string;
  tone: MilestoneTone;
};

export type MiniMilestoneDay = {
  key: string;
  isoDate: string;
  label: string;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  items: MiniMilestoneItem[];
};

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isoDateToDay(value: string): Date | null {
  const normalized = value.slice(0, 10);
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
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

function resolveAgendaDate(task: TaskV1): string | null {
  return task.nextDue ?? task.end ?? task.start ?? null;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatCalendarDayLabel(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export function selectMiniMilestoneDays(
  tasks: TaskV1[],
  snapshot: SnapshotV1 | null,
  holidays: Set<string>,
  now = new Date()
): MiniMilestoneDay[] {
  const milestoneTypeLabels = snapshot?.enums?.milestoneType ?? {};
  const groupsById = new Map((snapshot?.groups ?? []).map((group) => [group.id, group.name] as const));
  const items: MiniMilestoneItem[] = [];

  for (const task of tasks) {
    for (const milestone of task.milestones ?? []) {
      const date = (milestone.actual ?? milestone.planned ?? "").slice(0, 10);
      if (!date) continue;
      const parsed = isoDateToDay(date);
      if (!parsed) continue;
      const milestoneLabel = milestoneTypeLabels[milestone.type] ?? milestone.type;
      items.push({
        id: `${task.id}:${milestone.type}:${date}`,
        taskId: task.id,
        milestoneLabel,
        brand: task.brand?.trim() || null,
        format: task.format_?.trim() || task.type?.trim() || null,
        showName: (task.groupId ? groupsById.get(task.groupId) : null) ?? null,
        date,
        tone: resolveMilestoneTone(milestone.type, milestoneLabel),
      });
    }
  }

  items.sort((left, right) => {
    if (left.date !== right.date) return left.date.localeCompare(right.date);
    if (left.milestoneLabel !== right.milestoneLabel) return left.milestoneLabel.localeCompare(right.milestoneLabel, "ru");
    return left.taskId.localeCompare(right.taskId);
  });

  const today = startOfDay(now);
  const itemDates = items.map((item) => isoDateToDay(item.date)).filter((date): date is Date => Boolean(date));
  const rangeStart = itemDates.length
    ? itemDates.reduce((min, current) => (current.getTime() < min.getTime() ? current : min), itemDates[0])
    : today;
  const rangeEnd = itemDates.length
    ? itemDates.reduce((max, current) => (current.getTime() > max.getTime() ? current : max), itemDates[0])
    : addDays(today, 14);

  const effectiveStart = rangeStart.getTime() <= today.getTime() ? rangeStart : today;
  const effectiveEnd = rangeEnd.getTime() >= today.getTime() ? rangeEnd : today;
  const itemsByDate = new Map<string, MiniMilestoneItem[]>();
  for (const item of items) {
    const existing = itemsByDate.get(item.date) ?? [];
    existing.push(item);
    itemsByDate.set(item.date, existing);
  }

  const days: MiniMilestoneDay[] = [];
  for (let cursor = new Date(effectiveStart); cursor.getTime() <= effectiveEnd.getTime(); cursor = addDays(cursor, 1)) {
    const isoDate = toIsoDate(cursor);
    const dayItems = itemsByDate.get(isoDate) ?? [];
    const weekday = cursor.getDay();
    days.push({
      key: isoDate,
      isoDate,
      label: formatCalendarDayLabel(cursor),
      isToday: isoDate === toIsoDate(today),
      isWeekend: weekday === 0 || weekday === 6,
      isHoliday: holidays.has(isoDate),
      items: dayItems,
    });
  }

  return days;
}
