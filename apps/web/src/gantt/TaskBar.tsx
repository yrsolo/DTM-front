import React from "react";
import { TimeScale } from "./TimeScale";
import { addDays } from "../utils/date";
import { barXWidth } from "./layout";
import { RenderTask } from "./types";

function statusPalette(status: string) {
  const s = status.toLowerCase();
  if (/(done|complete|approved|closed)/.test(s)) {
    return {
      fill: "url(#bar-done)",
      stroke: "var(--key-mint, #66f0d6)",
      shadow: "color-mix(in srgb, var(--key-mint, #66f0d6) 60%, transparent)"
    };
  }

  if (/(delay|blocked|risk|hold|late|rejected)/.test(s)) {
    return {
      fill: "url(#bar-risk)",
      stroke: "var(--key-pink, #ff8ec9)",
      shadow: "color-mix(in srgb, var(--key-pink, #ff8ec9) 60%, transparent)"
    };
  }

  return {
    fill: "url(#bar-progress)",
    stroke: "var(--key-blue, #6897ff)",
    shadow: "color-mix(in srgb, var(--key-blue, #6897ff) 62%, transparent)"
  };
}

function milestoneFill(status: string): string {
  const base = "var(--key-milestone, #ffd46b)";
  const s = status.toLowerCase();
  if (s === "done") return `color-mix(in srgb, ${base} 70%, var(--key-mint, #66f0d6) 30%)`;
  if (s === "skipped") return `color-mix(in srgb, ${base} 70%, #ffb997 30%)`;
  if (s === "planned") return `color-mix(in srgb, ${base} 70%, var(--key-violet, #9a93ff) 30%)`;
  return base;
}

function milestoneLabel(type: string): string {
  if (!type) return "";
  if (type.startsWith("stage_")) return "stage";
  const normalized = type.replace(/[_-]+/g, " ").trim();
  if (normalized.length <= 9) return normalized;
  return `${normalized.slice(0, 9)}...`;
}

function milestoneFullLabel(type: string): string {
  if (!type) return "";
  if (type.startsWith("stage_")) return "stage";
  return type.replace(/[_-]+/g, " ").trim();
}

function hashToHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 8;
}

export function TaskBar(props: {
  task: RenderTask;
  scale: TimeScale;
  y: number;
  rowH: number;
  visibleStartX?: number;
  visibleEndX?: number;
  insetY?: number;
  radius?: number;
  milestoneSizeScale?: number;
  milestoneOpacity?: number;
  taskColorMixPercent?: number;
  showMilestones?: boolean;
  showMilestoneLabels?: boolean;
  highlighted?: boolean;
  onHover: (
    e: React.MouseEvent,
    t: RenderTask,
    meta?: { date: Date; milestoneLabel?: string }
  ) => void;
  onLeave: () => void;
  onClick: (t: RenderTask) => void;
}) {
  const { task, scale, y, rowH } = props;
  const { x, w } = barXWidth(scale.xForDate, task.start, task.end);

  if (w <= 0) return null;
  if (
    Number.isFinite(props.visibleStartX) &&
    Number.isFinite(props.visibleEndX) &&
    (x + w < (props.visibleStartX as number) || x > (props.visibleEndX as number))
  ) {
    return null;
  }

  const insetY = props.insetY ?? 8;
  const radius = props.radius ?? 8;
  const h = Math.max(8, rowH - insetY);
  const ry = y + (rowH - h) / 2;
  const palette = statusPalette(task.status);
  const milestoneSizeScale = props.milestoneSizeScale ?? 1;
  const milestoneSize = Math.max(2, h * 0.62 * milestoneSizeScale);
  const milestoneOpacity = Math.max(0.05, Math.min(1, props.milestoneOpacity ?? 0.95));
  const milestoneY = ry + h / 2;
  const milestoneFontSize = Math.max(9, Math.min(11, rowH * 0.24));
  const mix = Math.max(0, Math.min(100, props.taskColorMixPercent ?? 0)) / 100;
  const showMilestones = props.showMilestones ?? true;
  const showMilestoneLabels = props.showMilestoneLabels ?? true;
  const paletteIndex = hashToHue(task.id) + 1;
  const taskColor = `var(--task-color-${paletteIndex}, var(--key-blue, #6897ff))`;
  const barFilter = props.highlighted
    ? `drop-shadow(0 0 12px ${palette.stroke}) drop-shadow(0 0 22px ${palette.shadow})`
    : `drop-shadow(0 5px 10px ${palette.shadow})`;

  const pointerDate = (e: React.MouseEvent): Date => {
    const target = e.currentTarget as SVGGElement;
    const ctm = target.getScreenCTM();
    if (!ctm) return scale.range.start;
    const svg = target.ownerSVGElement;
    if (!svg) return scale.range.start;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const local = point.matrixTransform(ctm.inverse());
    const dayIndex = Math.max(
      0,
      Math.round((local.x - scale.leftPadding) / scale.pxPerDay)
    );
    return addDays(scale.range.start, dayIndex);
  };

  return (
    <g
      onMouseMove={(e) => props.onHover(e, task, { date: pointerDate(e) })}
      onMouseLeave={props.onLeave}
      onClick={() => props.onClick(task)}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={x}
        y={ry}
        width={w}
        height={h}
        rx={radius}
        ry={radius}
        fill={palette.fill}
        stroke={palette.stroke}
        strokeOpacity={0.7}
        style={{ filter: barFilter }}
      />
      {mix > 0 ? (
        <rect
          x={x}
          y={ry}
          width={w}
          height={h}
          rx={radius}
          ry={radius}
          fill={taskColor}
          fillOpacity={mix}
        />
      ) : null}
      <rect
        x={x + 2}
        y={ry + 2}
        width={Math.max(0, w - 4)}
        height={Math.max(0, h / 3)}
        rx={Math.max(2, radius - 2)}
        ry={Math.max(2, radius - 2)}
        fill="#ffffff"
        fillOpacity={0.3}
      />
      <rect
        x={x + 1}
        y={ry + h - Math.max(2, h / 6)}
        width={Math.max(0, w - 2)}
        height={Math.max(2, h / 7)}
        rx={Math.max(2, radius - 2)}
        ry={Math.max(2, radius - 2)}
        fill="#0d1633"
        fillOpacity={0.2}
      />

      {showMilestones ? (task.milestones ?? []).map((m, idx) => {
        const mx = scale.xForDate(m.date) + scale.pxPerDay * 0.5;
        const labelY = milestoneY - milestoneSize - 4;
        return (
          <g
            key={`${task.id}-m-${idx}`}
            onMouseMove={(e) => {
              e.stopPropagation();
              props.onHover(e, task, {
                date: m.date,
                milestoneLabel: milestoneFullLabel(m.type),
              });
            }}
            onMouseLeave={props.onLeave}
          >
            <rect
              x={mx - milestoneSize}
              y={milestoneY - milestoneSize}
              width={milestoneSize * 2}
              height={milestoneSize * 2}
              fill={milestoneFill(m.status)}
              fillOpacity={milestoneOpacity}
              stroke="#0f1428"
              strokeOpacity={0.65}
              strokeWidth={1}
              transform={`rotate(45 ${mx} ${milestoneY})`}
            />
            {showMilestoneLabels ? (
              <text
                x={mx}
                y={labelY}
                textAnchor="middle"
                fontSize={milestoneFontSize}
                fill="#dfe8ff"
                opacity={0.95}
                style={{ pointerEvents: "none" }}
              >
                {milestoneLabel(m.type)}
              </text>
            ) : null}
          </g>
        );
      }) : null}
    </g>
  );
}
