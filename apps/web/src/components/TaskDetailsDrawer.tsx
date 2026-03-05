import React from "react";
import { createPortal } from "react-dom";
import { GroupV1, PersonV1, TaskV1 } from "@dtm/schema/snapshot";
import { fetchRuHolidayAndTransferDaysInRange } from "../calendar/ruNonWorkingDays";
import { fetchPersonNameByOwnerId } from "../data/api";
import { getUiText } from "../i18n/uiText";
import { formatTaskIdForUi } from "../utils/id";
import { toShortPersonName } from "../utils/personName";
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

export function TaskDetailsDrawer(props: {
  task: TaskV1 | null;
  people: PersonV1[];
  groups?: GroupV1[];
  statusLabels?: Record<string, string>;
  milestoneTypeLabels?: Record<string, string>;
  onClose: () => void;
}) {
  const ctx = React.useContext(LayoutContext);
  const ui = ctx?.ui ?? getUiText("ru");
  const locale = ctx?.locale ?? "ru";
  const t = props.task;
  if (!t) return null;

  const [resolvedOwnerName, setResolvedOwnerName] = React.useState<string | null>(null);
  const [holidays, setHolidays] = React.useState<Set<string>>(new Set());
  const drawerRef = React.useRef<HTMLDivElement | null>(null);

  const findPerson = React.useCallback(
    (ref?: string | null) =>
      ref
        ? props.people.find((p) => p.id === ref || p.name === ref) ?? null
        : null,
    [props.people]
  );

  const owner = findPerson(t.ownerId) ?? findPerson(t.ownerName);
  const customerPerson = findPerson(t.customer);
  const group = props.groups?.find((g) => g.id === t.groupId);
  const statusLabel = props.statusLabels?.[t.status] ?? t.status;

  React.useEffect(() => {
    let active = true;
    setResolvedOwnerName(null);

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
  }, [t.id, t.ownerId, t.ownerName, owner]);

  const ownerLabel = owner
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
    : t.customer ?? "-";
  const formatLabel = normalizeFormatLabel(t.format_ ?? t.type ?? "-");

  const milestones = React.useMemo(
    () =>
      [...(t.milestones ?? [])]
        .map((m) => ({
          ...m,
          date: m.actual ?? m.planned ?? null,
          label: props.milestoneTypeLabels?.[m.type] ?? m.type,
        }))
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    [t.milestones, props.milestoneTypeLabels]
  );

  const rangeStart = React.useMemo(() => {
    const start = parseIsoDate(t.start);
    if (start) return start;
    const m0 = parseIsoDate(milestones[0]?.date);
    return m0 ?? new Date();
  }, [t.start, milestones]);

  const rangeEnd = React.useMemo(() => {
    const end = parseIsoDate(t.end);
    if (end) return end;
    const mLast = parseIsoDate(milestones[milestones.length - 1]?.date);
    return mLast ?? rangeStart;
  }, [t.end, milestones, rangeStart]);

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

  React.useEffect(() => {
    if (!t?.id) return;
    drawerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [t?.id]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const drawerNode = (
    <div className="drawerBackdrop" onClick={props.onClose}>
      <div
        ref={drawerRef}
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
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

        <div className="card drawerSection">
          <div className="drawerSectionTitle">{ui.drawer.timing}</div>
          {milestones.length ? (
            <div className="drawerMilestoneColumns">
              <div className="drawerMilestoneList">
                {milestoneColumns.left.map((m, i) => (
                  <div key={`${m.type}-${m.date}-l-${i}`} className="drawerMilestoneRow">
                    <span className="badge drawerDateBadge">{formatDdMm(m.date)}</span>
                    <span className={`drawerMilestoneName ${m.type === "feedback" ? "isFeedback" : ""}`}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="drawerMilestoneList">
                {milestoneColumns.right.map((m, i) => (
                  <div key={`${m.type}-${m.date}-r-${i}`} className="drawerMilestoneRow">
                    <span className="badge drawerDateBadge">{formatDdMm(m.date)}</span>
                    <span className={`drawerMilestoneName ${m.type === "feedback" ? "isFeedback" : ""}`}>
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

        <div className="card drawerSection">
          <div className="drawerSectionTitle">{ui.drawer.calendar}</div>
          <div className="drawerCalendarWeekdays">
            {ui.drawer.weekdays.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="drawerCalendarContinuous">
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
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="drawerCalendarDay">{day.date.getDate()}</div>
                      {day.milestones.length ? (
                        <div className="drawerCellMilestones">
                          {day.milestones.slice(0, 2).map((m, idx) => (
                            <span
                              key={`${day.iso}-${m.type}-${idx}`}
                              className={`drawerCellMilestoneName ${m.type === "feedback" ? "isFeedback" : ""}`}
                              title={m.label}
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

        {t.tags?.length ? (
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
        ) : null}

        {t.notes ? (
          <div className="card drawerSection">
            <div className="drawerSectionTitle">{ui.drawer.notes}</div>
            <div className="muted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {t.notes}
            </div>
          </div>
        ) : null}

        {t.links?.sheetRowUrl ? (
          <div className="card drawerSection">
            <div className="drawerSectionTitle">{ui.drawer.links}</div>
            <div style={{ marginTop: 8 }}>
              <a href={t.links.sheetRowUrl} target="_blank" rel="noreferrer">
                {ui.drawer.openSheetRow}
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") return drawerNode;
  return createPortal(drawerNode, document.body);
}
