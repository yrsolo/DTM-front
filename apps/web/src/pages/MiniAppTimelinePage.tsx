import React from "react";
import { SnapshotV1, TaskV1 } from "@dtm/schema/snapshot";

import { fetchRuHolidayAndTransferDaysInRange } from "../calendar/ruNonWorkingDays";
import { selectMiniMilestoneDays } from "../data/selectors/timelineSelectors";

function milestoneToneClass(tone: string): string {
  if (tone === "storyboard") return "isStoryboard";
  if (tone === "animatic") return "isAnimatic";
  if (tone === "feedback") return "isFeedback";
  if (tone === "prefinal") return "isPrefinal";
  if (tone === "final") return "isFinal";
  if (tone === "master") return "isMaster";
  if (tone === "onair") return "isOnair";
  if (tone === "start") return "isStart";
  return "isDefault";
}

export function MiniAppTimelinePage(props: {
  tasks: TaskV1[];
  snapshot: SnapshotV1 | null;
  onOpenTask: (taskId: string) => void;
}) {
  const [holidays, setHolidays] = React.useState<Set<string>>(new Set());
  const todayRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const milestoneDates = props.tasks
      .flatMap((task) => (task.milestones ?? []).map((milestone) => (milestone.actual ?? milestone.planned ?? "").slice(0, 10)))
      .filter(Boolean);
    if (!milestoneDates.length) {
      setHolidays(new Set());
      return;
    }

    const years = milestoneDates.map((date) => Number(date.slice(0, 4))).filter(Number.isFinite);
    if (!years.length) {
      setHolidays(new Set());
      return;
    }

    let cancelled = false;
    void (async () => {
      const merged = await fetchRuHolidayAndTransferDaysInRange(Math.min(...years), Math.max(...years));
      if (!cancelled) setHolidays(merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [props.tasks]);

  const days = React.useMemo(
    () => selectMiniMilestoneDays(props.tasks, props.snapshot, holidays),
    [holidays, props.snapshot, props.tasks]
  );

  const scrollToToday = React.useCallback(() => {
    const todayNode = todayRef.current;
    if (!todayNode) return;
    todayNode.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    if (!days.length) return;
    const frame = window.requestAnimationFrame(() => {
      scrollToToday();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [days, scrollToToday]);

  if (!days.length) {
    return <div className="miniAppEmpty">Нет активных майлстоунов.</div>;
  }

  return (
    <div className="miniAppSection miniAppTimelineSection">
      <div className="miniAppTimelineToolbar">
        <button type="button" className="miniAppButton miniAppButtonGhost" onClick={scrollToToday}>
          Сегодня
        </button>
      </div>
      <div className="miniAppCalendar">
        {days.map((day) => (
          <section
            key={day.key}
            ref={day.isToday ? todayRef : null}
            className={`miniAppCalendarDay ${day.isToday ? "isToday" : ""} ${day.isWeekend ? "isWeekend" : ""} ${day.isHoliday ? "isHoliday" : ""}`}
          >
            <div className="miniAppCalendarDayHeader">
              <div className="miniAppCalendarDayTitle">{day.label}</div>
              <div className="miniAppCalendarDayCount">{day.items.length}</div>
            </div>
            <div className="miniAppCalendarDayBody">
              {day.items.length ? (
                day.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`miniAppMilestoneRow ${milestoneToneClass(item.tone)}`}
                    onClick={() => props.onOpenTask(item.taskId)}
                  >
                    <span className="miniAppMilestoneTitle">{item.milestoneLabel}</span>
                    <span className="miniAppMilestoneMeta">
                      {[item.brand, item.format, item.showName].filter(Boolean).join(" | ") || "Без метаданных"}
                    </span>
                  </button>
                ))
              ) : (
                <div className="miniAppCalendarDayEmpty" />
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
