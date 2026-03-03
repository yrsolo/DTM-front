import { PersonV1, TaskV1 } from "@dtm/schema/snapshot";
import React from "react";
import { computeRange, toRenderTasks } from "./layout";
import { TaskBar } from "./TaskBar";
import { TimelineGrid } from "./TimelineGrid";
import { createTimeScale } from "./TimeScale";
import { RenderTask } from "./types";

export function DesignersTimeline(props: {
  people: PersonV1[];
  tasks: TaskV1[];
  width: number;
  height: number;
  rowH?: number;
  onHover: (e: React.MouseEvent, t: RenderTask) => void;
  onLeave: () => void;
  onClick: (t: RenderTask) => void;
}) {
  const rowH = props.rowH ?? 32;

  const renderTasks = React.useMemo(() => toRenderTasks(props.tasks), [props.tasks]);
  const range = React.useMemo(() => computeRange(renderTasks), [renderTasks]);
  const scale = React.useMemo(() => createTimeScale(range, props.width), [range, props.width]);

  const byOwner = React.useMemo(() => {
    const map = new Map<string, RenderTask[]>();
    for (const t of renderTasks) {
      const key = t.ownerId ?? "__unassigned__";
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [renderTasks]);

  const rows: Array<{ id: string; label: string; tasks: RenderTask[] }> = [];
  for (const p of props.people) {
    rows.push({ id: p.id, label: p.name, tasks: byOwner.get(p.id) ?? [] });
  }
  const unassigned = byOwner.get("__unassigned__");
  if (unassigned?.length) {
    rows.push({ id: "__unassigned__", label: "Unassigned", tasks: unassigned });
  }

  const labelW = 200;
  const svgW = props.width;
  const svgH = Math.max(props.height, rows.length * rowH + 24);

  return (
    <svg width={svgW} height={svgH} style={{ display: "block" }}>
      <rect x={0} y={0} width={svgW} height={svgH} fill="#fff" />

      <g transform={`translate(${labelW}, 20)`}>
        <TimelineGrid scale={scale} height={svgH - 20} />
        {rows.map((r, i) => {
          const y = i * rowH;
          return (
            <g key={r.id}>
              <line x1={0} y1={y + rowH} x2={svgW} y2={y + rowH} stroke="#f2f2f2" />
              {r.tasks.map((t) => (
                <TaskBar
                  key={t.id}
                  task={t}
                  scale={scale}
                  y={y}
                  rowH={rowH}
                  onHover={props.onHover}
                  onLeave={props.onLeave}
                  onClick={props.onClick}
                />
              ))}
            </g>
          );
        })}
      </g>

      {/* labels */}
      <g transform="translate(0, 20)">
        {rows.map((r, i) => (
          <text key={r.id} x={8} y={i * rowH + 20} fontSize={13} fill="#111">
            {r.label}
          </text>
        ))}
      </g>
    </svg>
  );
}
