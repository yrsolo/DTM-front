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
  gridLineWidth?: number;
  dateLabelY?: number;
  labelEveryDay?: boolean;
  weekendFillMode?: "full-day" | "legacy";
  weekendFillOpacity?: number;
  zoom?: number;
  barInsetY?: number;
  barRadius?: number;
  milestoneSizeScale?: number;
  milestoneOpacity?: number;
  taskColorMixPercent?: number;
  showMilestoneLabels?: boolean;
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
        <linearGradient id="timeline-panel-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--key-surface-top, #18203b)" />
          <stop offset="55%" stopColor="var(--key-surface-bottom, #121a32)" />
          <stop offset="100%" stopColor="var(--key-surface-alt, #1f1736)" />
        </linearGradient>
        <radialGradient id="timeline-panel-glow" cx="0.9" cy="0.05" r="1">
          <stop offset="0%" stopColor="rgba(255,160,220,0.22)" />
          <stop offset="45%" stopColor="rgba(162,146,255,0.08)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id="bar-progress" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--key-blue, #6897ff)" />
          <stop offset="52%" stopColor="var(--key-violet, #9a93ff)" />
          <stop offset="100%" stopColor="var(--key-mint, #66f0d6)" />
        </linearGradient>
        <linearGradient id="bar-done" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--key-mint, #66f0d6)" />
          <stop offset="100%" stopColor="var(--key-blue, #6897ff)" />
        </linearGradient>
        <linearGradient id="bar-risk" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#ffc6b1" />
          <stop offset="48%" stopColor="var(--key-pink, #ff8ec9)" />
          <stop offset="100%" stopColor="var(--key-violet, #9a93ff)" />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={svgW} height={svgH} fill="url(#timeline-panel-fill)" />
      <rect x={0} y={0} width={svgW} height={svgH} fill="url(#timeline-panel-glow)" />
      <g transform={`translate(0, ${topOffset})`}>
        <TimelineGrid
          scale={scale}
          height={svgH - topOffset}
          gridOpacity={props.gridOpacity}
          dateLabelY={props.dateLabelY}
          labelEveryDay={props.labelEveryDay}
          weekendFillMode={props.weekendFillMode}
          weekendFillOpacity={props.weekendFillOpacity}
          lineWidth={props.gridLineWidth}
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
                milestoneSizeScale={props.milestoneSizeScale}
                milestoneOpacity={props.milestoneOpacity}
                taskColorMixPercent={props.taskColorMixPercent}
                showMilestoneLabels={props.showMilestoneLabels}
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
