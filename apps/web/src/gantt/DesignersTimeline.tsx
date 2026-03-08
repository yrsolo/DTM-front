import { GroupV1, PersonV1, TaskV1 } from "@dtm/schema/snapshot";
import React from "react";
import { computeRange, toRenderTasks } from "./layout";
import { TaskBar } from "./TaskBar";
import { TimelineGrid } from "./TimelineGrid";
import { createTimeScale } from "./TimeScale";
import { RenderTask } from "./types";

type DesignerBlock = {
  id: string;
  name: string;
  tasks: RenderTask[];
};

function normalizeFormatLabel(input?: string | null): string {
  if (!input || !input.trim()) return "-";
  const value = input.trim();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function byDate(a: RenderTask, b: RenderTask): number {
  const at = a.start?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bt = b.start?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return at - bt;
}

export function DesignersTimeline(props: {
  people: PersonV1[];
  groups?: GroupV1[];
  tasks: TaskV1[];
  width: number;
  rowH?: number;
  labelW?: number;
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
  const headerH = 30;
  const blockGap = 14;

  const groupById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const g of props.groups ?? []) {
      map.set(g.id, g.name);
    }
    return map;
  }, [props.groups]);

  const renderTasks = React.useMemo(() => {
    return toRenderTasks(props.tasks).map((t) => ({
      ...t,
      groupName: t.groupId ? groupById.get(t.groupId) ?? t.groupName ?? null : null,
    }));
  }, [props.tasks, groupById]);

  const range = React.useMemo(() => computeRange(renderTasks), [renderTasks]);
  const scale = React.useMemo(() => createTimeScale(range, props.width, { zoom }), [range, props.width, zoom]);

  const byOwner = React.useMemo(() => {
    const map = new Map<string, RenderTask[]>();
    for (const t of renderTasks) {
      const key = t.ownerId ?? t.ownerName ?? "__unassigned__";
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [renderTasks]);

  const blocks: DesignerBlock[] = React.useMemo(() => {
    const rows: DesignerBlock[] = [];
    const used = new Set<string>();

    for (const p of props.people) {
      const tasks = [...(byOwner.get(p.id) ?? byOwner.get(p.name) ?? [])].sort(byDate);
      if (!tasks.length) continue;
      rows.push({ id: p.id, name: p.name, tasks });
      used.add(p.id);
      used.add(p.name);
    }

    for (const [ownerKey, tasks] of byOwner) {
      if (used.has(ownerKey) || !tasks.length) continue;
      rows.push({
        id: ownerKey,
        name: ownerKey === "__unassigned__" ? "Unassigned" : ownerKey,
        tasks: [...tasks].sort(byDate),
      });
    }

    return rows;
  }, [props.people, byOwner]);

  const labelW = Math.max(320, props.labelW ?? 360);
  const timelineW = scale.width - labelW;

  const blockHeights = blocks.map((b) => headerH + b.tasks.length * rowH + 4);
  const totalContentH = blockHeights.reduce((s, h) => s + h, 0) + Math.max(0, blocks.length - 1) * blockGap;
  const svgH = Math.max(180, totalContentH + topOffset + 8);

  return (
    <svg width={scale.width} height={svgH} style={{ display: "block" }}>
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

      <rect x={0} y={0} width={scale.width} height={svgH} fill="url(#timeline-panel-fill)" />
      <rect x={0} y={0} width={scale.width} height={svgH} fill="url(#timeline-panel-glow)" />

      {blocks.map((block, bi) => {
        const yTop = topOffset + blockHeights.slice(0, bi).reduce((s, h) => s + h, 0) + bi * blockGap;
        const rowsY = yTop + headerH;
        return (
          <g key={block.id}>
            <rect x={0} y={yTop - 4} width={labelW - 8} height={blockHeights[bi]} rx={10} fill="rgba(18,22,43,0.5)" stroke="rgba(124,146,205,0.24)" />
            <rect x={labelW} y={yTop - 4} width={timelineW} height={blockHeights[bi]} rx={10} fill="rgba(18,22,43,0.5)" stroke="rgba(124,146,205,0.24)" />

            <text x={12} y={yTop + 16} fontSize={20} fill="#dfe8ff" fontWeight={700}>{block.name}</text>

            <g transform={`translate(${labelW}, ${yTop})`}>
              <TimelineGrid
                scale={scale}
                height={blockHeights[bi]}
                gridOpacity={props.gridOpacity}
                dateLabelY={props.dateLabelY}
                labelEveryDay={props.labelEveryDay}
                weekendFillMode={props.weekendFillMode}
                weekendFillOpacity={props.weekendFillOpacity}
                lineWidth={props.gridLineWidth}
              />
            </g>

            {block.tasks.map((task, ti) => {
              const y = rowsY + ti * rowH;
              return (
                <g key={task.id}>
                  <line x1={8} y1={y + rowH} x2={scale.width - 8} y2={y + rowH} stroke="#2b3554" strokeOpacity={0.8} />

                  <text x={14} y={y + 20} fontSize={12} fill="#d8e4ff">
                    {task.brand ?? "-"}
                  </text>
                  <rect x={108} y={y + 5} width={74} height={20} rx={10} fill="rgba(12,16,30,0.85)" stroke="rgba(124,146,205,0.32)" />
                  <text x={145} y={y + 19} fontSize={10} fill="#ffd0de" textAnchor="middle">{normalizeFormatLabel(task.format_)}</text>
                  <text x={192} y={y + 20} fontSize={12} fill="#d8e4ff">{task.groupName ?? "-"}</text>

                  <g transform={`translate(${labelW}, 0)`}>
                    <TaskBar
                      task={task}
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
                </g>
              );
            })}

            <text x={16} y={yTop + headerH - 6} fontSize={11} fill="#9cb0dd">{"\u041f\u0440\u043e\u0435\u043a\u0442\u044b"}</text>
          </g>
        );
      })}
    </svg>
  );
}

