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
  labelW?: number;
  topOffset?: number;
  stripeOpacity?: number;
  gridOpacity?: number;
  dateLabelY?: number;
  zoom?: number;
  barInsetY?: number;
  barRadius?: number;
  milestoneSizeScale?: number;
  milestoneOpacity?: number;
  taskColorMixPercent?: number;
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

  const labelW = props.labelW ?? 200;
  const svgW = scale.width;
  const svgH = Math.max(props.height, rows.length * rowH + topOffset + 4);

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

      <g transform={`translate(${labelW}, ${topOffset})`}>
        <TimelineGrid
          scale={scale}
          height={svgH - topOffset}
          gridOpacity={props.gridOpacity}
          dateLabelY={props.dateLabelY}
        />
        {rows.map((r, i) => {
          const y = i * rowH;
          return (
            <g key={r.id}>
              {i % 2 === 0 ? (
                <rect
                  x={0}
                  y={y}
                  width={svgW - labelW}
                  height={rowH}
                  fill="#9fb7ff"
                  fillOpacity={props.stripeOpacity ?? 0.08}
                />
              ) : null}
              <line x1={0} y1={y + rowH} x2={svgW} y2={y + rowH} stroke="#2b3554" />
              {r.tasks.map((t) => (
                <TaskBar
                  key={t.id}
                  task={t}
                  scale={scale}
                  y={y}
                  rowH={rowH}
                  insetY={props.barInsetY}
                  radius={props.barRadius}
                  milestoneSizeScale={props.milestoneSizeScale}
                  milestoneOpacity={props.milestoneOpacity}
                  taskColorMixPercent={props.taskColorMixPercent}
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
      <g transform={`translate(0, ${topOffset})`}>
        {rows.map((r, i) => (
          <text key={r.id} x={8} y={i * rowH + 20} fontSize={13} fill="#d5def7">
            {r.label}
          </text>
        ))}
      </g>
    </svg>
  );
}
