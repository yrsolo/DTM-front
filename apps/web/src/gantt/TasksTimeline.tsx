import { TaskV1 } from "@dtm/schema/snapshot";
import React from "react";
import { computeRange, toRenderTasks } from "./layout";
import { TaskBar } from "./TaskBar";
import { TimelineGrid } from "./TimelineGrid";
import { createTimeScale } from "./TimeScale";
import { RenderTask } from "./types";

export function TasksTimeline(props: {
  tasks: TaskV1[];
  width: number;
  rowH?: number;
  onHover: (e: React.MouseEvent, t: RenderTask) => void;
  onLeave: () => void;
  onClick: (t: RenderTask) => void;
}) {
  const rowH = props.rowH ?? 32;

  const renderTasks = React.useMemo(() => toRenderTasks(props.tasks), [props.tasks]);
  const range = React.useMemo(() => computeRange(renderTasks), [renderTasks]);
  const scale = React.useMemo(() => createTimeScale(range, props.width), [range, props.width]);

  const svgW = props.width;
  const svgH = Math.max(120, props.tasks.length * rowH + 24);

  return (
    <svg width={svgW} height={svgH} style={{ display: "block" }}>
      <rect x={0} y={0} width={svgW} height={svgH} fill="#fff" />
      <g transform="translate(0, 20)">
        <TimelineGrid scale={scale} height={svgH - 20} />
        {renderTasks.map((t, i) => {
          const y = i * rowH;
          return (
            <g key={t.id}>
              <line x1={0} y1={y + rowH} x2={svgW} y2={y + rowH} stroke="#f2f2f2" />
              <TaskBar
                task={t}
                scale={scale}
                y={y}
                rowH={rowH}
                onHover={props.onHover}
                onLeave={props.onLeave}
                onClick={props.onClick}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
