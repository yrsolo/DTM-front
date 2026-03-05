import { addDays, maxDate, minDate, parseIsoDateOrDateTime, startOfDayUtc } from "../utils/date";
import { RenderTask, TimeRange } from "./types";

import { TaskV1 } from "@dtm/schema/snapshot";

export function toRenderTasks(tasks: TaskV1[]): RenderTask[] {
  return tasks.map((t) => {
    const milestones = (t.milestones ?? [])
      .map((m) => ({
        type: m.type,
        status: m.status,
        date: parseIsoDateOrDateTime(m.actual ?? m.planned),
      }))
      .filter((m): m is { type: string; status: string; date: Date } => Boolean(m.date));

    const explicitStart = parseIsoDateOrDateTime(t.start);
    const explicitEnd = parseIsoDateOrDateTime(t.end);
    const nextDue = parseIsoDateOrDateTime(t.nextDue ?? undefined);

    const milestoneMin =
      milestones.length > 0
        ? milestones.reduce((acc, item) => (item.date < acc ? item.date : acc), milestones[0].date)
        : null;
    const milestoneMax =
      milestones.length > 0
        ? milestones.reduce((acc, item) => (item.date > acc ? item.date : acc), milestones[0].date)
        : null;

    // Tolerant range recovery for evolving API payloads:
    // prefer explicit dates, then nextDue/milestones to avoid collapsed bars.
    const start = explicitStart ?? milestoneMin ?? nextDue;
    let end = explicitEnd ?? nextDue ?? milestoneMax ?? start;

    if (start && milestoneMax && end && milestoneMax > end) {
      end = milestoneMax;
    }
    if (start && end && end < start) {
      end = start;
    }

    return {
      id: t.id,
      title: t.title,
      ownerId: t.ownerId,
      ownerName: t.ownerName ?? null,
      brand: t.brand ?? null,
      customer: t.customer ?? null,
      format_: t.format_ ?? t.type ?? null,
      history: t.history ?? t.notes ?? null,
      status: t.status,
      start,
      end,
      groupId: t.groupId,
      groupName: null,
      milestones,
    };
  });
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
