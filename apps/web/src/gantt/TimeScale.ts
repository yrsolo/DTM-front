import { TimeRange } from "./types";

export type TimeScale = {
  range: TimeRange;
  pxPerDay: number;
  leftPadding: number;
  width: number;
  xForDate: (d: Date) => number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function createTimeScale(
  range: TimeRange,
  viewportWidth: number,
  options?: { zoom?: number; leftPadding?: number; minPxPerDay?: number }
): TimeScale {
  const leftPadding = options?.leftPadding ?? 8;
  const zoom = options?.zoom ?? 1;
  const minPxPerDay = options?.minPxPerDay ?? 8;
  const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS));
  const basePxPerDay = Math.max(minPxPerDay, (viewportWidth - leftPadding * 2) / days);
  const pxPerDay = Math.max(minPxPerDay, basePxPerDay * zoom);
  const width = Math.max(viewportWidth, Math.ceil(leftPadding * 2 + pxPerDay * days));

  const xForDate = (d: Date) => {
    const deltaDays = (d.getTime() - range.start.getTime()) / DAY_MS;
    return leftPadding + deltaDays * pxPerDay;
  };

  return { range, pxPerDay, leftPadding, width, xForDate };
}
