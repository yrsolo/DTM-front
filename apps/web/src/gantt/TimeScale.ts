import { TimeRange } from "./types";

export type TimeScale = {
  range: TimeRange;
  pxPerDay: number;
  leftPadding: number;
  width: number;
  xForDate: (d: Date) => number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function createTimeScale(range: TimeRange, width: number): TimeScale {
  const leftPadding = 8;
  const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS));
  const pxPerDay = Math.max(8, Math.floor((width - leftPadding * 2) / days));

  const xForDate = (d: Date) => {
    const deltaDays = (d.getTime() - range.start.getTime()) / DAY_MS;
    return leftPadding + deltaDays * pxPerDay;
  };

  return { range, pxPerDay, leftPadding, width, xForDate };
}
