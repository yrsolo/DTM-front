import { GroupV1, PersonV1, TaskV1 } from "@dtm/schema/snapshot";
import React from "react";
import { fetchRuHolidayAndTransferDaysInRange } from "../calendar/ruNonWorkingDays";
import { addDays } from "../utils/date";
import { toShortPersonName } from "../utils/personName";
import { computeRange, toRenderTasks } from "./layout";
import { TaskBar } from "./TaskBar";
import { createTimeScale } from "./TimeScale";
import { RenderTask } from "./types";

type Mode =
  | "brand_designer_show"
  | "format_brand_show"
  | "designer_brand_show"
  | "flat_brand_show"
  | "show_brand_designer";

type SortMode = "last_milestone_desc" | "last_milestone_asc";

type TaskLeftView = {
  primary: string;
  pill?: string;
  secondary?: string;
};

type RowUnit =
  | { kind: "group"; key: string; blockKey: string; header: string }
  | { kind: "task"; key: string; blockKey: string; task: RenderTask; left: TaskLeftView };

function safeId(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function capitalizeFirst(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function normalizeFormatLabel(input?: string | null): string {
  if (!input || !input.trim()) return "-";
  return capitalizeFirst(input.trim());
}

function dateKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function isUnassignedDesignerTask(task: RenderTask): boolean {
  const ownerName = (task.ownerName ?? "").toLowerCase();
  const ownerId = (task.ownerId ?? "").toLowerCase();
  return ownerName.includes("????????") || ownerId.includes("????????");
}

function taskEndTs(task: RenderTask): number | null {
  return task.end ? task.end.getTime() : null;
}

function compareTaskByEnd(a: RenderTask, b: RenderTask, sortMode: SortMode): number {
  const aPinned = isUnassignedDesignerTask(a);
  const bPinned = isUnassignedDesignerTask(b);
  if (aPinned !== bPinned) return aPinned ? -1 : 1;

  const at = taskEndTs(a);
  const bt = taskEndTs(b);

  if (at === null && bt === null) return a.id.localeCompare(b.id);
  if (at === null) return 1;
  if (bt === null) return -1;

  if (at === bt) return a.id.localeCompare(b.id);
  return sortMode === "last_milestone_desc" ? bt - at : at - bt;
}

function sortedTasks(tasks: RenderTask[], sortMode: SortMode): RenderTask[] {
  return [...tasks].sort((a, b) => compareTaskByEnd(a, b, sortMode));
}

function groupMetric(tasks: RenderTask[]): number | null {
  let out: number | null = null;
  for (const t of tasks) {
    const ts = taskEndTs(t);
    if (ts === null) continue;
    out = out === null ? ts : Math.max(out, ts);
  }
  return out;
}

function compareGroupByMetric(
  a: { key: string; tasks: RenderTask[] },
  b: { key: string; tasks: RenderTask[] },
  sortMode: SortMode
): number {
  const aPinned = a.tasks.some(isUnassignedDesignerTask);
  const bPinned = b.tasks.some(isUnassignedDesignerTask);
  if (aPinned !== bPinned) return aPinned ? -1 : 1;

  const am = groupMetric(a.tasks);
  const bm = groupMetric(b.tasks);

  if (am === null && bm === null) return a.key.localeCompare(b.key);
  if (am === null) return 1;
  if (bm === null) return -1;

  if (am === bm) return a.key.localeCompare(b.key);
  return sortMode === "last_milestone_desc" ? bm - am : am - bm;
}

function resolveOwnerShort(task: RenderTask, peopleById: Map<string, string>, unassignedLabel: string): string {
  if (task.ownerName) return toShortPersonName(task.ownerName);
  if (task.ownerId && peopleById.has(task.ownerId)) return peopleById.get(task.ownerId) ?? unassignedLabel;
  if (task.ownerId) return toShortPersonName(task.ownerId);
  return unassignedLabel;
}

function buildLeftView(
  mode: Mode,
  task: RenderTask,
  peopleById: Map<string, string>,
  unassignedLabel: string
): TaskLeftView {
  const owner = resolveOwnerShort(task, peopleById, unassignedLabel);
  const brand = task.brand ?? "-";
  const format = normalizeFormatLabel(task.format_);
  const show = task.groupName ?? "-";

  if (mode === "brand_designer_show") {
    return { primary: owner, pill: format, secondary: show };
  }

  if (mode === "format_brand_show") {
    return { primary: brand, pill: owner, secondary: show };
  }

  if (mode === "designer_brand_show") {
    return { primary: brand, pill: format, secondary: show };
  }
  if (mode === "show_brand_designer") {
    return { primary: brand, pill: format, secondary: owner };
  }

  return { primary: brand, pill: format, secondary: show };
}

function makeRows(
  mode: Mode,
  sortMode: SortMode,
  tasks: RenderTask[],
  people: PersonV1[],
  unassignedLabel: string
): RowUnit[] {
  const peopleById = new Map<string, string>();
  for (const p of people) peopleById.set(p.id, toShortPersonName(p.name));

  if (mode === "flat_brand_show") {
    return sortedTasks(tasks, sortMode).map((task) => ({
      kind: "task",
      key: task.id,
      blockKey: task.id,
      task,
      left: buildLeftView(mode, task, peopleById, unassignedLabel),
    }));
  }

  const keyOf = (task: RenderTask): string => {
    if (mode === "brand_designer_show") return task.brand ?? "-";
    if (mode === "format_brand_show") return normalizeFormatLabel(task.format_);
    if (mode === "show_brand_designer") return task.groupName ?? "-";
    return resolveOwnerShort(task, peopleById, unassignedLabel);
  };

  const byGroup = new Map<string, RenderTask[]>();
  for (const task of tasks) {
    const k = keyOf(task);
    const arr = byGroup.get(k) ?? [];
    arr.push(task);
    byGroup.set(k, arr);
  }

  const groups = [...byGroup.entries()].map(([key, groupTasks]) => ({
    key,
    tasks: sortedTasks(groupTasks, sortMode),
  }));

  groups.sort((a, b) => compareGroupByMetric(a, b, sortMode));

  const rows: RowUnit[] = [];
  for (const group of groups) {
    const blockKey = `group-${group.key}`;
    rows.push({ kind: "group", key: `group-row-${group.key}`, blockKey, header: group.key });
    for (const task of group.tasks) {
      rows.push({
        kind: "task",
        key: task.id,
        blockKey,
        task,
        left: buildLeftView(mode, task, peopleById, unassignedLabel),
      });
    }
  }

  return rows;
}

export function UnifiedTimeline(props: {
  mode: Mode;
  sortMode: SortMode;
  locale: "ru" | "en";
  people: PersonV1[];
  groups?: GroupV1[];
  tasks: TaskV1[];
  statusLabels: Record<string, string>;
  unassignedLabel?: string;
  width: number;
  viewportWidth?: number;
  leftPinOffset?: number;
  rowH: number;
  labelW: number;
  topOffset?: number;
  stripeOpacity?: number;
  gridOpacity?: number;
  gridLineWidth?: number;
  dateLabelY?: number;
  dateFontSize?: number;
  dateIdleOpacity?: number;
  dateHoverOpacity?: number;
  monthFontSize?: number;
  monthOffsetY?: number;
  monthOffsetX?: number;
  todayLineOpacity?: number;
  todayLineWidth?: number;
  cursorTrailDays?: number;
  cursorTrailOpacity?: number;
  holidayFillOpacity?: number;
  perfMinWeekPxDetailedX10?: number;
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
  leftOwnerFontSize?: number;
  leftOwnerXOffset?: number;
  leftOwnerTextOffsetY?: number;
  leftOwnerCropLeft?: number;
  leftTaskFontSize?: number;
  leftTaskXOffset?: number;
  leftTaskTextOffsetY?: number;
  leftTaskCropLeft?: number;
  leftMetaFontSize?: number;
  leftMetaTextOffsetY?: number;
  leftPillOffsetY?: number;
  leftPillXOffset?: number;
  leftPillWidth?: number;
  leftPillSizeScale?: number;
  leftGroupOffsetY?: number;
  leftGroupXOffset?: number;
  leftGroupCropLeft?: number;
  leftGroupFontSize?: number;
  badgeHeight?: number;
  badgeFontSize?: number;
  textRenderingMode?: number;
  onHover: (
    e: React.MouseEvent,
    t: RenderTask,
    meta?: { date: Date; milestoneLabel?: string }
  ) => void;
  onLeave: () => void;
  onClick: (t: RenderTask) => void;
}) {
  const textRenderingMode = Math.round(props.textRenderingMode ?? 0);
  const svgTextRendering =
    textRenderingMode === 1
      ? "optimizeLegibility"
      : textRenderingMode === 2
        ? "geometricPrecision"
        : textRenderingMode === 3
          ? "optimizeSpeed"
          : "auto";
  const svgShapeRendering = textRenderingMode === 3 ? "crispEdges" : "geometricPrecision";

  const baseTopOffset = props.topOffset ?? 20;
  const labelsTopSafePad = 8;
  const topHeaderHeight = 24;
  const topOffset = baseTopOffset + labelsTopSafePad + topHeaderHeight;
  const labelW = Math.max(280, props.labelW);
  const rightWidth = Math.max(320, props.width - labelW);
  const rowH = props.rowH;
  const leftPinOffset = props.leftPinOffset ?? 0;
  const viewportWidth = Math.max(320, props.viewportWidth ?? props.width);
  const [hoveredRowKey, setHoveredRowKey] = React.useState<string | null>(null);
  const [hoveredBlockKey, setHoveredBlockKey] = React.useState<string | null>(null);
  const [holidaySet, setHolidaySet] = React.useState<Set<string>>(new Set());
  const [cursorSnapX, setCursorSnapX] = React.useState<number | null>(null);
  const [isTableHovered, setIsTableHovered] = React.useState(false);

  const groupById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const g of props.groups ?? []) m.set(g.id, g.name);
    return m;
  }, [props.groups]);

  const renderTasks = React.useMemo(() => {
    return toRenderTasks(props.tasks).map((t) => ({
      ...t,
      groupName: t.groupId ? groupById.get(t.groupId) ?? t.groupName ?? null : null,
    }));
  }, [props.tasks, groupById]);

  const range = React.useMemo(() => computeRange(renderTasks), [renderTasks]);
  const rangeDays = React.useMemo(
    () => Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000))),
    [range.end, range.start]
  );
  // Zoom semantics: 100% (zoom=1) means one month fits the visible timeline width.
  const monthFitZoomBase = React.useMemo(() => Math.max(0.01, rangeDays / 30.44), [rangeDays]);
  const zoom = (props.zoom ?? 1) * monthFitZoomBase;
  const scale = React.useMemo(
    () => createTimeScale(range, rightWidth, { zoom }),
    [range, rightWidth, zoom]
  );
  const rows = React.useMemo(
    () => makeRows(props.mode, props.sortMode, renderTasks, props.people, props.unassignedLabel ?? "Unassigned"),
    [props.mode, props.sortMode, renderTasks, props.people, props.unassignedLabel]
  );

  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round((scale.range.end.getTime() - scale.range.start.getTime()) / dayMs);

  const monthFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(props.locale === "ru" ? "ru-RU" : "en-US", {
        month: "long",
      }),
    [props.locale]
  );

  React.useEffect(() => {
    let active = true;
    void (async () => {
      const merged = await fetchRuHolidayAndTransferDaysInRange(
        scale.range.start.getUTCFullYear(),
        scale.range.end.getUTCFullYear()
      );
      if (!active) return;
      setHolidaySet(merged);
    })();

    return () => {
      active = false;
    };
  }, [scale.range.end, scale.range.start]);

  const ticks = React.useMemo(() => {
    const out: Array<{
      x: number;
      label: string;
      monthLabel: string;
      isWeekend: boolean;
      isHoliday: boolean;
      isWeek: boolean;
    }> = [];

    for (let i = 0; i <= days; i += 1) {
      const d = addDays(scale.range.start, i);
      const wd = d.getUTCDay();
      const isWeek = wd === 1;
      const monthLabel = isWeek ? capitalizeFirst(monthFormatter.format(d)) : "";
      const isHoliday = holidaySet.has(dateKeyUtc(d));
      out.push({
        x: scale.xForDate(d),
        label:
          props.labelEveryDay || i % 2 === 0
            ? String(d.getUTCDate()).padStart(2, "0")
            : "",
        monthLabel,
        isWeekend: wd === 0 || wd === 6,
        isHoliday,
        isWeek,
      });
    }
    return out;
  }, [days, holidaySet, monthFormatter, props.labelEveryDay, scale]);
  const visibleBufferPx = 120;
  const timelineViewportPx = viewportWidth - labelW;
  const hasVisibleWindow = Number.isFinite(timelineViewportPx) && timelineViewportPx > 24;
  const visibleTimelineStart = hasVisibleWindow
    ? Math.max(0, leftPinOffset - labelW - visibleBufferPx)
    : 0;
  const visibleTimelineEnd = hasVisibleWindow
    ? Math.min(scale.width, leftPinOffset + viewportWidth - labelW + visibleBufferPx)
    : scale.width;
  const visibleTicks = React.useMemo(
    () =>
      hasVisibleWindow
        ? ticks.filter((t) => {
            const x = t.x + scale.pxPerDay * 0.5;
            return x >= visibleTimelineStart && x <= visibleTimelineEnd;
          })
        : ticks,
    [ticks, scale.pxPerDay, visibleTimelineStart, visibleTimelineEnd, hasVisibleWindow]
  );
  const weekPxInViewport = Math.max(1, scale.pxPerDay * 7);
  const perfMinWeekPxDetailed = Math.max(1, (props.perfMinWeekPxDetailedX10 ?? 40) * 10);
  const perfSimplified = weekPxInViewport < perfMinWeekPxDetailed;
  const showDateLabels = !perfSimplified;
  const showWeekendHolidayOverlays = !perfSimplified;
  const showDailyGridLines = !perfSimplified;
  const showPerRowDateLabels = !perfSimplified;
  const showMilestones = true;
  const showMilestoneLabels = !perfSimplified && (props.showMilestoneLabels ?? true);

  const todayX = React.useMemo(() => {
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (todayUtc < scale.range.start || todayUtc > scale.range.end) return null;
    return labelW + scale.xForDate(todayUtc) + scale.pxPerDay / 2;
  }, [labelW, scale]);

  const svgW = labelW + scale.width;
  const svgH = Math.max(200, topOffset + rows.length * rowH + 8);
  const cursorTrailWidth = Math.max(0, scale.pxPerDay * (props.cursorTrailDays ?? 5));

  const dateY = Math.max(props.dateLabelY ?? 12, 15);
  const monthY = Math.max(8, dateY + (props.monthOffsetY ?? -2) - 10);

  return (
    <svg
      width={svgW}
      height={svgH}
      style={{ display: "block" }}
      textRendering={svgTextRendering}
      shapeRendering={svgShapeRendering}
      onMouseEnter={() => setIsTableHovered(true)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const timelineX = Math.max(0, Math.min(scale.width, rawX - labelW));
        const dayIndex = Math.max(
          0,
          Math.min(days, Math.round((timelineX - scale.leftPadding) / scale.pxPerDay))
        );
        const snapped =
          labelW + scale.leftPadding + dayIndex * scale.pxPerDay + scale.pxPerDay * 0.5;
        setCursorSnapX(snapped);
      }}
      onMouseLeave={() => {
        setCursorSnapX(null);
        setIsTableHovered(false);
      }}
    >
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
        <linearGradient id="timeline-pill-fill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(45, 59, 100, 0.95)" />
          <stop offset="100%" stopColor="rgba(39, 33, 72, 0.95)" />
        </linearGradient>
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
        <linearGradient id="timeline-cursor-trail" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--key-cursor-trail, #ffd46b)" stopOpacity={0} />
          <stop
            offset="100%"
            stopColor="var(--key-cursor-trail, #ffd46b)"
            stopOpacity={props.cursorTrailOpacity ?? 0.22}
          />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={svgW} height={svgH} fill="url(#timeline-panel-fill)" />
      <rect x={0} y={0} width={svgW} height={svgH} fill="url(#timeline-panel-glow)" />
      <rect
        x={leftPinOffset}
        y={0}
        width={labelW}
        height={svgH}
        fill="url(#timeline-panel-fill)"
        fillOpacity={0.98}
      />
      <line
        x1={leftPinOffset + labelW}
        y1={0}
        x2={leftPinOffset + labelW}
        y2={svgH}
        stroke="rgba(124,146,205,0.36)"
      />
      <g opacity={isTableHovered ? 1 : 0}>
        <rect
          x={labelW}
          y={0}
          width={scale.width}
          height={topHeaderHeight}
          fill="rgba(14, 21, 41, 0.94)"
        />
        <line
          x1={labelW}
          y1={topHeaderHeight}
          x2={svgW}
          y2={topHeaderHeight}
          stroke="rgba(124,146,205,0.32)"
        />
        {visibleTicks.map((t, idx) => (
          <g key={`top-header-${idx}`}>
            {t.monthLabel
              ? (() => {
                  const monthFontSize = props.monthFontSize ?? 10;
                  const approxTextWidth = t.monthLabel.length * monthFontSize * 0.56;
                  const fitsCell = approxTextWidth <= Math.max(0, scale.pxPerDay - 4);
                  const textX = fitsCell
                    ? labelW + t.x + scale.pxPerDay / 2 + (props.monthOffsetX ?? 0)
                    : labelW + t.x + (props.monthOffsetX ?? 0);
                  return (
                    <text
                      x={textX}
                      y={Math.max(8, monthY - 2)}
                      textAnchor={fitsCell ? "middle" : "start"}
                      fontSize={monthFontSize}
                      fill="#9fb4e6"
                      opacity={props.dateHoverOpacity ?? 1}
                    >
                      {t.monthLabel}
                    </text>
                  );
                })()
              : null}
            {showDateLabels && t.label ? (
              <text
                x={labelW + t.x + scale.pxPerDay / 2}
                y={Math.max(16, dateY + 2)}
                textAnchor="middle"
                fontSize={props.dateFontSize ?? 10}
                fill="#8f9fca"
                opacity={props.dateHoverOpacity ?? 1}
              >
                {t.label}
              </text>
            ) : null}
          </g>
        ))}
      </g>

      {todayX !== null ? (
        <line
          x1={todayX}
          y1={0}
          x2={todayX}
          y2={svgH}
          stroke="var(--key-milestone, #ffd46b)"
          strokeOpacity={props.todayLineOpacity ?? 0.65}
          strokeWidth={props.todayLineWidth ?? 1.2}
        />
      ) : null}
      {cursorSnapX !== null ? (
        <rect
          x={Math.max(0, cursorSnapX + scale.pxPerDay * 0.5 - cursorTrailWidth)}
          y={0}
          width={Math.max(
            0,
            Math.min(cursorTrailWidth, cursorSnapX + scale.pxPerDay * 0.5)
          )}
          height={svgH}
          fill="url(#timeline-cursor-trail)"
        />
      ) : null}

      {rows.map((row, i) => {
        const y = topOffset + i * rowH;
        const ownerX = 12 + (props.leftOwnerXOffset ?? 0);
        const taskX = 14 + (props.leftTaskXOffset ?? 0);
        const pillScale = props.leftPillSizeScale ?? 1;
        const pillW = Math.max(24, (props.leftPillWidth ?? 74) * pillScale);
        const pillH = Math.max(12, (props.badgeHeight ?? Math.max(16, rowH - 10)) * pillScale);
        const pillY = y + (props.leftPillOffsetY ?? 5);
        const groupX = 192 + (props.leftGroupXOffset ?? 0);
        const ownerClipId = `owner-clip-${safeId(row.key)}-${i}`;
        const taskClipId = `task-clip-${safeId(row.key)}-${i}`;
        const groupClipId = `group-clip-${safeId(row.key)}-${i}`;

        const isGroup = row.kind === "group";
        const isRowHovered = hoveredRowKey === row.key;
        const isBlockHovered = hoveredBlockKey === row.blockKey;
        const leftFill = isGroup
          ? "rgba(24,32,61,0.98)"
          : isRowHovered
            ? "#000000"
            : "rgba(14,21,41,0.98)";
        const rowFill = isGroup
          ? "rgba(41,50,86,0.32)"
          : isRowHovered
            ? "#000000"
            : `rgba(159,183,255,${i % 2 === 0 ? props.stripeOpacity ?? 0.08 : 0})`;

        return (
          <g
            key={row.key}
            onMouseEnter={() => {
              setHoveredRowKey(row.key);
              setHoveredBlockKey(row.blockKey);
            }}
            onMouseLeave={() => {
              setHoveredRowKey((prev) => (prev === row.key ? null : prev));
              setHoveredBlockKey((prev) => (prev === row.blockKey ? null : prev));
            }}
          >
            <rect x={labelW} y={y} width={scale.width} height={rowH} rx={8} fill={rowFill} />
            <line
              x1={0}
              y1={y + rowH}
              x2={svgW}
              y2={y + rowH}
              stroke="#2b3554"
              strokeOpacity={0.9}
            />

            {visibleTicks.map((t, idx) => (
              <g key={`${row.key}-tick-${idx}`}>
                {showWeekendHolidayOverlays && t.isWeekend ? (
                  <rect
                    x={labelW + t.x}
                    y={y}
                    width={
                      props.weekendFillMode === "full-day"
                        ? Math.max(1, scale.pxPerDay)
                        : 12
                    }
                    height={rowH}
                    fill="#ff9fd2"
                    fillOpacity={props.weekendFillOpacity ?? 0.12}
                  />
                ) : null}
                {showWeekendHolidayOverlays && t.isHoliday ? (
                  <rect
                    x={labelW + t.x}
                    y={y}
                    width={Math.max(1, scale.pxPerDay)}
                    height={rowH}
                    fill="#ff7aa9"
                    fillOpacity={props.holidayFillOpacity ?? 0.2}
                  />
                ) : null}
                {showDailyGridLines || t.isWeek ? (
                  <line
                    x1={labelW + t.x}
                    y1={y}
                    x2={labelW + t.x}
                    y2={y + rowH}
                    stroke={t.isWeek ? "#4a5a88" : "#283252"}
                    strokeOpacity={props.gridOpacity ?? 1}
                    strokeWidth={props.gridLineWidth ?? 0.8}
                  />
                ) : null}
              </g>
            ))}

            {isGroup && showPerRowDateLabels && (
              <>
                {visibleTicks.map((t, idx) =>
                  t.monthLabel ? (
                    (() => {
                      const monthFontSize = props.monthFontSize ?? 10;
                      const approxTextWidth = t.monthLabel.length * monthFontSize * 0.56;
                      const fitsCell = approxTextWidth <= Math.max(0, scale.pxPerDay - 4);
                      const textX = fitsCell
                        ? labelW + t.x + scale.pxPerDay / 2 + (props.monthOffsetX ?? 0)
                        : labelW + t.x + (props.monthOffsetX ?? 0);
                      return (
                        <text
                          key={`${row.key}-month-${idx}`}
                          x={textX}
                          y={y + monthY}
                          textAnchor={fitsCell ? "middle" : "start"}
                          fontSize={monthFontSize}
                          fill="#9fb4e6"
                          opacity={
                              isBlockHovered
                                ? props.dateHoverOpacity ?? 1
                                : props.dateIdleOpacity ?? 0.52
                          }
                        >
                          {t.monthLabel}
                        </text>
                      );
                    })()
                  ) : null
                )}
                {visibleTicks.map((t, idx) =>
                  t.label ? (
                    <text
                      key={`${row.key}-label-${idx}`}
                      x={labelW + t.x + scale.pxPerDay / 2}
                      y={y + dateY}
                      textAnchor="middle"
                      fontSize={props.dateFontSize ?? 10}
                      fill="#8f9fca"
                      opacity={
                        isBlockHovered ? props.dateHoverOpacity ?? 1 : props.dateIdleOpacity ?? 0.52
                      }
                    >
                      {t.label}
                    </text>
                  ) : null
                )}
              </>
            )}

            {row.kind === "task" ? (
              <g transform={`translate(${labelW}, 0)`}>
                <TaskBar
                  task={row.task}
                  scale={scale}
                  y={y}
                  rowH={rowH}
                  insetY={props.barInsetY}
                  radius={props.barRadius}
                  visibleStartX={hasVisibleWindow ? visibleTimelineStart : undefined}
                  visibleEndX={hasVisibleWindow ? visibleTimelineEnd : undefined}
                  milestoneSizeScale={props.milestoneSizeScale}
                  milestoneOpacity={props.milestoneOpacity}
                  taskColorMixPercent={props.taskColorMixPercent}
                  showMilestones={showMilestones}
                  showMilestoneLabels={showMilestoneLabels}
                  highlighted={isRowHovered}
                  onHover={props.onHover}
                  onLeave={props.onLeave}
                  onClick={props.onClick}
                />
              </g>
            ) : null}

            <g transform={`translate(${leftPinOffset}, 0)`}>
              <rect x={0} y={y} width={labelW - 8} height={rowH} rx={8} fill={leftFill} />
              {row.kind === "group" ? (
                <>
                  <defs>
                    <clipPath id={ownerClipId} clipPathUnits="userSpaceOnUse">
                      <rect
                        x={ownerX}
                        y={y + 2}
                        width={Math.max(0, labelW - 14 - ownerX - (props.leftOwnerCropLeft ?? 0))}
                        height={Math.max(8, rowH - 4)}
                      />
                    </clipPath>
                  </defs>
                  <text
                    x={ownerX}
                    y={y + (props.leftOwnerTextOffsetY ?? 20)}
                    fontSize={props.leftOwnerFontSize ?? 20}
                    fill="#dfe8ff"
                    fontWeight={700}
                    clipPath={`url(#${ownerClipId})`}
                  >
                    {row.header}
                  </text>
                </>
              ) : (
                <>
                  <defs>
                    <clipPath id={taskClipId} clipPathUnits="userSpaceOnUse">
                      <rect
                        x={taskX}
                        y={y + 2}
                        width={Math.max(0, labelW - 18 - taskX - (props.leftTaskCropLeft ?? 0))}
                        height={Math.max(8, rowH - 4)}
                      />
                    </clipPath>
                    <clipPath id={groupClipId} clipPathUnits="userSpaceOnUse">
                      <rect
                        x={groupX}
                        y={y + 2}
                        width={Math.max(0, labelW - 12 - groupX - (props.leftGroupCropLeft ?? 0))}
                        height={Math.max(8, rowH - 4)}
                      />
                    </clipPath>
                  </defs>

                  <text
                    x={taskX}
                    y={y + (props.leftTaskTextOffsetY ?? 20)}
                    fontSize={props.leftTaskFontSize ?? 12}
                    fill="#d8e4ff"
                    clipPath={`url(#${taskClipId})`}
                  >
                    {row.left.primary}
                  </text>

                  {row.left.pill ? (
                    <>
                      <rect
                        x={108 + (props.leftPillXOffset ?? 0)}
                        y={pillY}
                        width={pillW}
                        height={pillH}
                        rx={pillH / 2}
                        fill="url(#timeline-pill-fill)"
                        stroke="rgba(167, 186, 246, 0.45)"
                        style={{
                          filter:
                            "drop-shadow(0 6px 14px rgb(0 0 0 / var(--mat-badge-glow-a, 0.22)))",
                        }}
                      />
                      <text
                        x={108 + (props.leftPillXOffset ?? 0) + pillW / 2}
                        y={y + (props.leftMetaTextOffsetY ?? 19)}
                        textAnchor="middle"
                        fontSize={props.badgeFontSize ?? props.leftMetaFontSize ?? 10}
                        fill="var(--key-left-pill-text, #ffd0de)"
                      >
                        {row.left.pill}
                      </text>
                    </>
                  ) : null}

                  {row.left.secondary ? (
                    <text
                      x={groupX}
                      y={y + (props.leftGroupOffsetY ?? 20)}
                      fontSize={props.leftGroupFontSize ?? props.leftTaskFontSize ?? 12}
                      fill="#d8e4ff"
                      clipPath={`url(#${groupClipId})`}
                    >
                      {row.left.secondary}
                    </text>
                  ) : null}
                </>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
