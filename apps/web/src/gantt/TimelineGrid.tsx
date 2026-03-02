import { addDays, dateToYmd } from "../utils/date";
import { TimeScale } from "./TimeScale";

const DAY_MS = 24 * 60 * 60 * 1000;

export function TimelineGrid(props: { scale: TimeScale; height: number }) {
  const { scale, height } = props;
  const days = Math.round((scale.range.end.getTime() - scale.range.start.getTime()) / DAY_MS);

  const ticks = [];
  for (let i = 0; i <= days; i++) {
    const d = addDays(scale.range.start, i);
    const x = scale.xForDate(d);
    const isWeek = d.getUTCDay() === 1; // Monday
    ticks.push({ x, label: isWeek ? dateToYmd(d) : "" , isWeek });
  }

  return (
    <g>
      {ticks.map((t, idx) => (
        <g key={idx}>
          <line
            x1={t.x} y1={0} x2={t.x} y2={height}
            stroke={t.isWeek ? "#e2e2e2" : "#f2f2f2"}
          />
          {t.label ? (
            <text x={t.x + 2} y={12} fontSize={10} fill="#666">{t.label}</text>
          ) : null}
        </g>
      ))}
    </g>
  );
}
