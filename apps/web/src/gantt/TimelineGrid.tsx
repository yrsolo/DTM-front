import { addDays } from "../utils/date";
import { TimeScale } from "./TimeScale";

const DAY_MS = 24 * 60 * 60 * 1000;

export function TimelineGrid(props: {
  scale: TimeScale;
  height: number;
  gridOpacity?: number;
  dateLabelY?: number;
  labelEveryDay?: boolean;
  weekendFillMode?: "full-day" | "legacy";
  weekendFillOpacity?: number;
  lineWidth?: number;
}) {
  const { scale, height } = props;
  const gridOpacity = props.gridOpacity ?? 1;
  const dateLabelY = props.dateLabelY ?? 12;
  const labelEveryDay = props.labelEveryDay ?? false;
  const weekendFillMode = props.weekendFillMode ?? "legacy";
  const weekendFillOpacity = props.weekendFillOpacity ?? 0.08;
  const lineWidth = props.lineWidth ?? 1;
  const days = Math.round((scale.range.end.getTime() - scale.range.start.getTime()) / DAY_MS);

  const ticks = [];
  for (let i = 0; i <= days; i++) {
    const d = addDays(scale.range.start, i);
    const x = scale.xForDate(d);
    const day = d.getUTCDay();
    const isWeek = day === 1; // Monday
    const isWeekend = day === 0 || day === 6;
    const label = labelEveryDay || i % 2 === 0 ? String(d.getUTCDate()).padStart(2, "0") : "";
    ticks.push({ x, label, isWeek, isWeekend });
  }

  return (
    <g>
      {ticks.map((t, idx) => (
        <g key={idx}>
          {t.isWeekend ? (
            <rect
              x={t.x}
              y={0}
              width={weekendFillMode === "full-day" ? Math.max(1, scale.pxPerDay) : 12}
              height={height}
              fill="#ff9fd2"
              fillOpacity={weekendFillOpacity}
            />
          ) : null}
          <line
            x1={t.x} y1={0} x2={t.x} y2={height}
            stroke={t.isWeek ? "#4a5a88" : "#283252"}
            strokeOpacity={gridOpacity}
            strokeWidth={lineWidth}
          />
          {t.label ? (
            <text x={t.x + 2} y={dateLabelY} fontSize={10} fill="#8f9fca">{t.label}</text>
          ) : null}
        </g>
      ))}
    </g>
  );
}
