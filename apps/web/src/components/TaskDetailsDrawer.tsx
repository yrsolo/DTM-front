import React from "react";
import { createPortal } from "react-dom";
import { GroupV1, PersonV1, TaskV1 } from "@dtm/schema/snapshot";
import { InspectorNodeBoundary } from "@dtm/workbench-inspector";
import { fetchRuHolidayAndTransferDaysInRange } from "../calendar/ruNonWorkingDays";
import { fetchPersonNameByOwnerId } from "../data/api";
import { getUiText } from "../i18n/uiText";
import { formatTaskIdForUi } from "../utils/id";
import { resolveDayTone, resolveMilestoneTone } from "../utils/milestoneTone";
import { toShortPersonName } from "../utils/personName";
import { TaskAttachmentsSection } from "./attachments/TaskAttachmentsSection";
import { LayoutContext } from "./Layout";

type DayCell = {
  date: Date;
  iso: string;
  isWeekend: boolean;
  isHoliday: boolean;
  monthIndex: number;
  monthLabel?: string;
  milestones: Array<{ type: string; label: string }>;
};

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.length >= 10 ? value.slice(0, 10) : value;
  const d = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDdMm(value?: string | null): string {
  const d = parseIsoDate(value);
  if (!d) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

function normalizeFormatLabel(input?: string | null): string {
  if (!input || !input.trim()) return "-";
  const value = input.trim();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getWeekStartMonday(d: Date): Date {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy;
}

function getWeekEndSunday(d: Date): Date {
  const start = getWeekStartMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function hasDraggedFiles(event: React.DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export function TaskDetailsDrawer(props: {
  task: TaskV1 | null;
  people: PersonV1[];
  groups?: GroupV1[];
  statusLabels?: Record<string, string>;
  milestoneTypeLabels?: Record<string, string>;
  presentation?: "drawer" | "sheet";
  onClose: () => void;
  onExited?: () => void;
}) {
  const ctx = React.useContext(LayoutContext);
  const ui = ctx?.ui ?? getUiText("ru");
  const locale = ctx?.locale ?? "ru";
  const design = ctx?.effectiveDesign ?? ctx?.design;
  const drawerAnimEnabled = (design?.animEnabled ?? 0) >= 0.5;
  const drawerAnimDurationMs = Math.max(0, Math.round(design?.animDrawerDurationMs ?? 220));
  const [renderedTask, setRenderedTask] = React.useState<TaskV1 | null>(props.task);
  const [animState, setAnimState] = React.useState<"hidden" | "entering" | "open" | "closing">(
    props.task ? (drawerAnimEnabled && drawerAnimDurationMs > 0 ? "entering" : "open") : "hidden"
  );

  React.useEffect(() => {
    if (props.task) {
      setRenderedTask(props.task);
      setAnimState(drawerAnimEnabled && drawerAnimDurationMs > 0 ? "entering" : "open");
      return;
    }

    if (!renderedTask) {
      setAnimState("hidden");
      return;
    }

    if (drawerAnimEnabled && drawerAnimDurationMs > 0) {
      setAnimState("closing");
      return;
    }

    setAnimState("hidden");
    setRenderedTask(null);
    props.onExited?.();
  }, [props.task, renderedTask, drawerAnimEnabled, drawerAnimDurationMs, props.onExited]);

  React.useEffect(() => {
    if (animState !== "entering") return;
    const timeout = window.setTimeout(() => setAnimState("open"), 24);
    return () => window.clearTimeout(timeout);
  }, [animState]);

  React.useEffect(() => {
    if (animState !== "closing") return;
    const timeout = window.setTimeout(() => {
      setAnimState("hidden");
      setRenderedTask(null);
      props.onExited?.();
    }, drawerAnimDurationMs);
    return () => window.clearTimeout(timeout);
  }, [animState, drawerAnimDurationMs, props.onExited]);

  const t = renderedTask;
  const [resolvedOwnerName, setResolvedOwnerName] = React.useState<string | null>(null);
  const [holidays, setHolidays] = React.useState<Set<string>>(new Set());
  const [calendarHint, setCalendarHint] = React.useState<{ x: number; y: number; label: string } | null>(null);
  const drawerRef = React.useRef<HTMLDivElement | null>(null);
  const calendarRef = React.useRef<HTMLDivElement | null>(null);
  const calendarDragRef = React.useRef<{
    x: number;
    y: number;
    top: number;
    left: number;
  } | null>(null);
  const [isCalendarDragging, setIsCalendarDragging] = React.useState(false);
  const [attachmentDragActive, setAttachmentDragActive] = React.useState(false);
  const [pendingAttachmentFile, setPendingAttachmentFile] = React.useState<File | null>(null);
  const attachmentDragDepthRef = React.useRef(0);

  const findPerson = React.useCallback(
    (ref?: string | null) =>
      ref
        ? props.people.find((p) => p.id === ref || p.name === ref) ?? null
        : null,
    [props.people]
  );

  const owner = t ? findPerson(t.ownerId) ?? findPerson(t.ownerName) : null;
  const customerPerson = t ? findPerson(t.customer) : null;
  const group = t ? props.groups?.find((g) => g.id === t.groupId) : null;
  const statusLabel = t ? props.statusLabels?.[t.status] ?? t.status : "-";
  const authState = ctx?.authSession.state;
  const canUploadAttachments = Boolean(
    authState?.authenticated && authState.accessMode === "full" && authState.user?.role === "admin"
  );

  React.useEffect(() => {
    let active = true;
    setResolvedOwnerName(null);

    if (!t) return;
    if ((!t.ownerId && !t.ownerName) || owner) return;

    void (async () => {
      const fromApi = await fetchPersonNameByOwnerId(t.ownerId ?? t.ownerName ?? "");
      if (active && fromApi) {
        setResolvedOwnerName(fromApi);
      }
    })();

    return () => {
      active = false;
    };
  }, [t?.id, t?.ownerId, t?.ownerName, owner]);

  const ownerLabel = !t
    ? ui.common.unassigned
    : owner
    ? toShortPersonName(owner.name)
    : t.ownerName
      ? toShortPersonName(t.ownerName)
    : resolvedOwnerName
      ? `${toShortPersonName(resolvedOwnerName)} (resolved)`
    : t.ownerId
        ? `unresolved (${t.ownerId})`
        : ui.common.unassigned;
  const customerLabel = customerPerson
    ? customerPerson.name
    : t?.customer ?? "-";
  const formatLabel = normalizeFormatLabel(t?.format_ ?? t?.type ?? "-");

  const milestones = React.useMemo(() => {
    if (!t) return [];
    return [...(t.milestones ?? [])]
        .map((m) => ({
          ...m,
          date: m.actual ?? m.planned ?? null,
          label: props.milestoneTypeLabels?.[m.type] ?? m.type,
        }))
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [t, props.milestoneTypeLabels]);

  const rangeStart = React.useMemo(() => {
    if (!t) return new Date();
    const start = parseIsoDate(t.start);
    if (start) return start;
    const m0 = parseIsoDate(milestones[0]?.date);
    return m0 ?? new Date();
  }, [t?.start, milestones]);

  const rangeEnd = React.useMemo(() => {
    if (!t) return rangeStart;
    const end = parseIsoDate(t.end);
    if (end) return end;
    const mLast = parseIsoDate(milestones[milestones.length - 1]?.date);
    return mLast ?? rangeStart;
  }, [t?.end, milestones, rangeStart]);

  const safeStart = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
  const safeEnd = rangeStart <= rangeEnd ? rangeEnd : rangeStart;

  React.useEffect(() => {
    let active = true;

    void (async () => {
      const merged = await fetchRuHolidayAndTransferDaysInRange(
        safeStart.getFullYear(),
        safeEnd.getFullYear()
      );
      if (!active) return;
      setHolidays(merged);
    })();

    return () => {
      active = false;
    };
  }, [safeStart, safeEnd]);

  const calendarWeeks = React.useMemo(() => {
    const dayMap = new Map<string, Array<{ type: string; label: string }>>();
    for (const m of milestones) {
      if (!m.date) continue;
      const d = parseIsoDate(m.date);
      if (!d) continue;
      const key = toIsoDate(d);
      const list = dayMap.get(key) ?? [];
      list.push({ type: m.type, label: m.label });
      dayMap.set(key, list);
    }

    const startWeek = getWeekStartMonday(safeStart);
    const endWeek = getWeekEndSunday(safeEnd);

    const weeks: DayCell[][] = [];
    let cursor = new Date(startWeek);
    let prevMonth: number | null = null;

    while (cursor <= endWeek) {
      const week: DayCell[] = [];
      for (let i = 0; i < 7; i += 1) {
        const current = addDays(cursor, i);
        const iso = toIsoDate(current);
        const weekday = current.getDay();
        const monthIndex = current.getMonth();
        const monthChanged = prevMonth === null || prevMonth !== monthIndex;

        week.push({
          date: current,
          iso,
          isWeekend: weekday === 0 || weekday === 6,
          isHoliday: holidays.has(iso),
          monthIndex,
          monthLabel: monthChanged
            ? current.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { month: "long" })
            : undefined,
          milestones: dayMap.get(iso) ?? [],
        });

        prevMonth = monthIndex;
      }
      weeks.push(week);
      cursor = addDays(cursor, 7);
    }

    return weeks;
  }, [safeStart, safeEnd, milestones, holidays]);

  const milestoneColumns = React.useMemo(() => {
    const half = Math.ceil(milestones.length / 2);
    return {
      left: milestones.slice(0, half),
      right: milestones.slice(half),
    };
  }, [milestones]);
  const bubbleScale = Math.max(0.6, design?.tooltipBubbleScale ?? 1);
  const bubbleStyle: React.CSSProperties = {
    fontSize: `${Math.round(11 * bubbleScale)}px`,
    padding: `${Math.round(3 * bubbleScale)}px ${Math.round(9 * bubbleScale)}px`,
    lineHeight: 1,
  };

  React.useEffect(() => {
    if (!t?.id) return;
    drawerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [t?.id]);

  React.useEffect(() => {
    setAttachmentDragActive(false);
    setPendingAttachmentFile(null);
    attachmentDragDepthRef.current = 0;
  }, [t?.id]);

  React.useEffect(() => {
    if (!isCalendarDragging) return;
    const onMove = (e: MouseEvent) => {
      const drag = calendarDragRef.current;
      const node = calendarRef.current;
      if (!drag || !node) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      node.scrollTop = drag.top - dy;
      node.scrollLeft = drag.left - dx;
    };
    const onUp = () => {
      calendarDragRef.current = null;
      setIsCalendarDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isCalendarDragging]);

  if (!t) return null;
  const presentation = props.presentation ?? "drawer";
  const backdropClassName = presentation === "sheet" ? "drawerBackdrop drawerBackdropSheet" : "drawerBackdrop";
  const drawerClassName = presentation === "sheet" ? "drawer drawerSheet" : "drawer";

  const drawerNode = (
    <div className={`${backdropClassName} drawerAnim-${animState}`} onClick={props.onClose}>
      <InspectorNodeBoundary
        label="Task details drawer"
        kind="content"
        semanticTargetId="app.task.drawer"
        sourcePath="apps/web/src/components/TaskDetailsDrawer.tsx"
      >
      <div
        ref={drawerRef}
        className={`${drawerClassName} drawerAnim-${animState} ${attachmentDragActive ? "attachmentDrawerDropActive" : ""}`}
        data-inspector-target-id="app.task.drawer"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onDragEnter={(e) => {
          if (!canUploadAttachments || !hasDraggedFiles(e)) return;
          e.preventDefault();
          attachmentDragDepthRef.current += 1;
          setAttachmentDragActive(true);
        }}
        onDragOver={(e) => {
          if (!canUploadAttachments || !hasDraggedFiles(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          if (!canUploadAttachments || !hasDraggedFiles(e)) return;
          e.preventDefault();
          attachmentDragDepthRef.current = Math.max(0, attachmentDragDepthRef.current - 1);
          if (attachmentDragDepthRef.current === 0) {
            setAttachmentDragActive(false);
          }
        }}
        onDrop={(e) => {
          if (!canUploadAttachments || !hasDraggedFiles(e)) return;
          e.preventDefault();
          e.stopPropagation();
          attachmentDragDepthRef.current = 0;
          setAttachmentDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            setPendingAttachmentFile(file);
          }
        }}
      >
        <div className="drawerHeaderRow">
          <h2 className="drawerTitle">{t.title}</h2>
          <div className="drawerHeaderRight">
            <div className="drawerMiniDates muted">
              {formatDdMm(t.start)} - {formatDdMm(t.end)}
            </div>
            <button onClick={props.onClose}>{ui.drawer.close}</button>
          </div>
        </div>

        <div className="drawerMetaWrap">
          <span className="badge" title={`ID: ${t.id}`}>ID: {formatTaskIdForUi(t.id)}</span>
          <span className="badge">{statusLabel}</span>
          <span className="badge">{ui.drawer.designer}: {ownerLabel}</span>
          <span className="badge">{ui.drawer.manager}: {customerLabel}</span>
          <span className="badge">{formatLabel}</span>
          <span className="badge">{t.brand ?? "-"}</span>
          {group ? <span className="badge">{group.name}</span> : null}
        </div>
        {!owner && !resolvedOwnerName && t.ownerId ? (
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            {ui.drawer.ownerResolveHint}
          </div>
        ) : null}

        <InspectorNodeBoundary
          label="Drawer attachments block"
          kind="content"
          sourcePath="apps/web/src/components/TaskDetailsDrawer.tsx"
        >
          <TaskAttachmentsSection
            task={t}
            compact={presentation === "sheet"}
            dragActive={attachmentDragActive}
            droppedFile={pendingAttachmentFile}
            onDroppedFileHandled={() => setPendingAttachmentFile(null)}
          />
        </InspectorNodeBoundary>

        <InspectorNodeBoundary
          label="Drawer timing section"
          kind="content"
          sourcePath="apps/web/src/components/TaskDetailsDrawer.tsx"
        >
        <div className="card drawerSection">
          <div className="drawerSectionTitle">{ui.drawer.timing}</div>
          {milestones.length ? (
            <div className="drawerMilestoneColumns">
              <div className="drawerMilestoneList">
                {milestoneColumns.left.map((m, i) => (
                  <div key={`${m.type}-${m.date}-l-${i}`} className="drawerMilestoneRow">
                    <span className="badge drawerDateBadge">{formatDdMm(m.date)}</span>
                    <span className={`drawerMilestoneName msType-${resolveMilestoneTone(m.type, m.label)}`}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="drawerMilestoneList">
                {milestoneColumns.right.map((m, i) => (
                  <div key={`${m.type}-${m.date}-r-${i}`} className="drawerMilestoneRow">
                    <span className="badge drawerDateBadge">{formatDdMm(m.date)}</span>
                    <span className={`drawerMilestoneName msType-${resolveMilestoneTone(m.type, m.label)}`}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="muted">{ui.drawer.noMilestones}</div>
          )}
        </div>
        </InspectorNodeBoundary>

        <InspectorNodeBoundary
          label="Drawer calendar section"
          kind="content"
          sourcePath="apps/web/src/components/TaskDetailsDrawer.tsx"
        >
        <div className="card drawerSection">
          <div className="drawerSectionTitle">{ui.drawer.calendar}</div>
          <div className="drawerCalendarWeekdays">
            {ui.drawer.weekdays.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div
            ref={calendarRef}
            className="drawerCalendarContinuous"
            style={{ cursor: isCalendarDragging ? "grabbing" : "grab", userSelect: isCalendarDragging ? "none" : "auto" }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              const node = calendarRef.current;
              if (!node) return;
              e.preventDefault();
              calendarDragRef.current = {
                x: e.clientX,
                y: e.clientY,
                top: node.scrollTop,
                left: node.scrollLeft,
              };
              setIsCalendarDragging(true);
            }}
          >
            {calendarWeeks.map((week, wi) => (
              <div key={`w-${wi}`}>
                {week.find((d) => d.monthLabel)?.monthLabel ? (
                  <div className="drawerWeekMonthLabel">{week.find((d) => d.monthLabel)?.monthLabel}</div>
                ) : null}
                <div className="drawerCalendarWeekRow">
                  {week.map((day) => (
                    <div
                      key={day.iso}
                      className={[
                        "drawerCalendarCell",
                        day.monthIndex % 2 === 0 ? "monthEven" : "monthOdd",
                        day.isWeekend ? "isWeekend" : "",
                        day.isHoliday ? "isHoliday" : "",
                        day.milestones.length ? "hasMilestone" : "",
                        day.milestones.length ? `msTone-${resolveDayTone(day.milestones)}` : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onMouseMove={(e) => {
                        if (!day.milestones.length) return;
                        setCalendarHint({
                          x: e.clientX + 8,
                          y: e.clientY + 8,
                          label: day.milestones[0]?.label ?? "",
                        });
                      }}
                      onMouseLeave={() => setCalendarHint(null)}
                    >
                      <div className="drawerCalendarDay">{day.date.getDate()}</div>
                      {day.milestones.length ? (
                        <div className="drawerCellMilestones">
                          {day.milestones.slice(0, 2).map((m, idx) => (
                            <span
                              key={`${day.iso}-${m.type}-${idx}`}
                              className={`drawerCellMilestoneName msType-${resolveMilestoneTone(m.type, m.label)}`}
                              onMouseMove={(e) => {
                                setCalendarHint({
                                  x: e.clientX + 8,
                                  y: e.clientY + 8,
                                  label: m.label,
                                });
                              }}
                              onMouseLeave={() => setCalendarHint(null)}
                            >
                              {m.label}
                            </span>
                          ))}
                          {day.milestones.length > 2 ? (
                            <span className="drawerCellMilestoneName">+{day.milestones.length - 2}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        </InspectorNodeBoundary>

        {t.tags?.length ? (
          <InspectorNodeBoundary
            label="Drawer tags section"
            kind="content"
            sourcePath="apps/web/src/components/TaskDetailsDrawer.tsx"
          >
            <div className="card drawerSection">
              <div className="drawerSectionTitle">{ui.drawer.tags}</div>
              <div className="row" style={{ flexWrap: "wrap", marginTop: 8 }}>
                {t.tags.map((tag) => (
                  <span key={tag} className="badge">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </InspectorNodeBoundary>
        ) : null}

        {t.notes ? (
          <InspectorNodeBoundary
            label="Drawer notes section"
            kind="content"
            sourcePath="apps/web/src/components/TaskDetailsDrawer.tsx"
          >
            <div className="card drawerSection">
              <div className="drawerSectionTitle">{ui.drawer.notes}</div>
              <div className="muted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                {t.notes}
              </div>
            </div>
          </InspectorNodeBoundary>
        ) : null}

        {t.links?.sheetRowUrl ? (
          <InspectorNodeBoundary
            label="Drawer links section"
            kind="content"
            sourcePath="apps/web/src/components/TaskDetailsDrawer.tsx"
          >
            <div className="card drawerSection">
              <div className="drawerSectionTitle">{ui.drawer.links}</div>
              <div style={{ marginTop: 8 }}>
                <a href={t.links.sheetRowUrl} target="_blank" rel="noreferrer">
                  {ui.drawer.openSheetRow}
                </a>
              </div>
            </div>
          </InspectorNodeBoundary>
        ) : null}
      </div>
      </InspectorNodeBoundary>
      {calendarHint ? (
        <div className="tooltip" style={{ left: calendarHint.x, top: calendarHint.y, pointerEvents: "none", zIndex: 90 }}>
          <span className="badge" style={bubbleStyle}>{calendarHint.label}</span>
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return drawerNode;
  return createPortal(drawerNode, document.body);
}
