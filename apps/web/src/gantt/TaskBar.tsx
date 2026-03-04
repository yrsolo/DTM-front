import React from "react";
import { TimeScale } from "./TimeScale";
import { barXWidth } from "./layout";
import { RenderTask } from "./types";

function statusPalette(status: string) {
  const s = status.toLowerCase();
  if (/(done|complete|approved|closed)/.test(s)) {
    return {
      fill: "url(#bar-done)",
      stroke: "#58d9d0",
      shadow: "rgba(89, 220, 214, 0.32)"
    };
  }

  if (/(delay|blocked|risk|hold|late|rejected)/.test(s)) {
    return {
      fill: "url(#bar-risk)",
      stroke: "#ff9c94",
      shadow: "rgba(255, 159, 138, 0.36)"
    };
  }

  return {
    fill: "url(#bar-progress)",
    stroke: "#8ba2ff",
    shadow: "rgba(126, 158, 255, 0.34)"
  };
}

export function TaskBar(props: {
  task: RenderTask;
  scale: TimeScale;
  y: number;
  rowH: number;
  insetY?: number;
  radius?: number;
  onHover: (e: React.MouseEvent, t: RenderTask) => void;
  onLeave: () => void;
  onClick: (t: RenderTask) => void;
}) {
  const { task, scale, y, rowH } = props;
  const { x, w } = barXWidth(scale.xForDate, task.start, task.end);

  if (w <= 0) return null;

  const insetY = props.insetY ?? 8;
  const radius = props.radius ?? 8;
  const h = Math.max(8, rowH - insetY);
  const ry = y + (rowH - h) / 2;
  const palette = statusPalette(task.status);

  return (
    <g
      onMouseMove={(e) => props.onHover(e, task)}
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
        strokeOpacity={0.55}
        style={{ filter: `drop-shadow(0 3px 8px ${palette.shadow})` }}
      />
      <rect
        x={x + 2}
        y={ry + 2}
        width={Math.max(0, w - 4)}
        height={Math.max(0, h / 3)}
        rx={Math.max(2, radius - 2)}
        ry={Math.max(2, radius - 2)}
        fill="#ffffff"
        fillOpacity={0.24}
      />
    </g>
  );
}
