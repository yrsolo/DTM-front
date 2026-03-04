import { addDays, maxDate, minDate, parseIsoDateOrDateTime, startOfDayUtc } from "../utils/date";
import { RenderTask, TimeRange } from "./types";

import { TaskV1 } from "@dtm/schema/snapshot";

export function toRenderTasks(tasks: TaskV1[]): RenderTask[] {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    ownerId: t.ownerId,
    status: t.status,
    start: parseIsoDateOrDateTime(t.start),
    end: parseIsoDateOrDateTime(t.end),
    groupId: t.groupId,
    milestones: (t.milestones ?? [])
      .map((m) => ({
        type: m.type,
        status: m.status,
        date: parseIsoDateOrDateTime(m.actual ?? m.planned),
      }))
      .filter((m): m is { type: string; status: string; date: Date } => Boolean(m.date)),
  }));
}

export function computeRange(tasks: RenderTask[]): TimeRange {
  const now = startOfDayUtc(new Date());
  let start = now;
  let end = addDays(now, 14);

  for (const t of tasks) {
    if (t.start) start = minDate(start, startOfDayUtc(t.start));
    if (t.end) end = maxDate(end, startOfDayUtc(t.end));
    for (const m of t.milestones ?? []) {
      start = minDate(start, startOfDayUtc(m.date));
      end = maxDate(end, startOfDayUtc(m.date));
    }
  }

  // pad
  start = addDays(start, -2);
  end = addDays(end, 2);

  if (end.getTime() <= start.getTime()) {
    end = addDays(start, 14);
  }

  return { start, end };
}

export function barXWidth(xForDate: (d: Date) => number, start: Date | null, end: Date | null): { x: number; w: number } {
  if (!start && !end) return { x: 0, w: 0 };
  const s = start ?? end!;
  const e = end ?? start!;
  
  const x1 = xForDate(s);
  const x2 = xForDate(addDays(e, 1)); // include end day
  
  return { x: x1, w: Math.max(2, x2 - x1) };
}
