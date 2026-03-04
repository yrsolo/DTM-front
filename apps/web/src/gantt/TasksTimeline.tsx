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
  minHeight?: number;
  topOffset?: number;
  stripeOpacity?: number;
  gridOpacity?: number;
  dateLabelY?: number;
  zoom?: number;
  barInsetY?: number;
  barRadius?: number;
  onHover: (e: React.MouseEvent, t: RenderTask) => void;
  onLeave: () => void;
  onClick: (t: RenderTask) => void;
}) {
  const rowH = props.rowH ?? 32;
  const topOffset = props.topOffset ?? 20;
  const zoom = props.zoom ?? 1;

  const renderTasks = React.useMemo(() => toRenderTasks(props.tasks), [props.tasks]);
  const range = React.useMemo(() => computeRange(renderTasks), [renderTasks]);
  const scale = React.useMemo(() => createTimeScale(range, props.width, { zoom }), [range, props.width, zoom]);

  const svgW = scale.width;
  const svgH = Math.max(props.minHeight ?? 120, props.tasks.length * rowH + topOffset + 4);

  return (
    <svg width={svgW} height={svgH} style={{ display: "block" }}>
      <defs>
        <linearGradient id="bar-progress" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6eb4ff" />
          <stop offset="52%" stopColor="#7f88ff" />
          <stop offset="100%" stopColor="#53e1d2" />
        </linearGradient>
        <linearGradient id="bar-done" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#5fe6d8" />
          <stop offset="100%" stopColor="#53a8ff" />
        </linearGradient>
        <linearGradient id="bar-risk" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#ffb597" />
          <stop offset="48%" stopColor="#ff82ba" />
          <stop offset="100%" stopColor="#b573ff" />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={svgW} height={svgH} fill="#0f152a" />
      <g transform={`translate(0, ${topOffset})`}>
        <TimelineGrid
          scale={scale}
          height={svgH - topOffset}
          gridOpacity={props.gridOpacity}
          dateLabelY={props.dateLabelY}
        />
        {renderTasks.map((t, i) => {
          const y = i * rowH;
          return (
            <g key={t.id}>
              {i % 2 === 0 ? (
                <rect x={0} y={y} width={svgW} height={rowH} fill="#9fb7ff" fillOpacity={props.stripeOpacity ?? 0.08} />
              ) : null}
              <line x1={0} y1={y + rowH} x2={svgW} y2={y + rowH} stroke="#2b3554" />
              <TaskBar
                task={t}
                scale={scale}
                y={y}
                rowH={rowH}
                insetY={props.barInsetY}
                radius={props.barRadius}
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
