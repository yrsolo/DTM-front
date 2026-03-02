import React from "react";
import { TimeScale } from "./TimeScale";
import { barXWidth } from "./layout";
import { RenderTask } from "./types";

export function TaskBar(props: {
  task: RenderTask;
  scale: TimeScale;
  y: number;
  rowH: number;
  onHover: (e: React.MouseEvent, t: RenderTask) => void;
  onLeave: () => void;
  onClick: (t: RenderTask) => void;
}) {
  const { task, scale, y, rowH } = props;
  const { x, w } = barXWidth(scale.xForDate, task.start, task.end);

  if (w <= 0) return null;

  const h = Math.max(8, rowH - 8);
  const ry = y + (rowH - h) / 2;

  return (
    <rect
      x={x}
      y={ry}
      width={w}
      height={h}
      rx={8}
      ry={8}
      fill="#111"
      opacity={0.10}
      stroke="#111"
      strokeOpacity={0.25}
      onMouseMove={(e) => props.onHover(e, task)}
      onMouseLeave={props.onLeave}
      onClick={() => props.onClick(task)}
      style={{ cursor: "pointer" }}
    />
  );
}
