import React from "react";
import { ErrorBanner } from "../components/ErrorBanner";
import { FiltersBar } from "../components/FiltersBar";
import { LayoutContext } from "../components/Layout";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { Tooltip, TooltipState } from "../components/Tooltip";
import { UnifiedTimeline } from "../gantt/UnifiedTimeline";
import { RenderTask } from "../gantt/types";
import { useElementWidth } from "../utils/useElementWidth";

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatDdMm(value: Date): string {
  const dd = String(value.getUTCDate()).padStart(2, "0");
  const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}:${mm}`;
}

function makeDefaultWindowMs(): { from: number; to: number } {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 2);
  const to = new Date(now);
  to.setMonth(to.getMonth() + 2);
  return { from: from.getTime(), to: to.getTime() };
}

function dateWindowMs(dateFilter: { enabled: boolean; start: string; end: string }): {
  from: number;
  to: number;
} {
  if (!dateFilter.enabled) return makeDefaultWindowMs();
  const from = Date.parse(dateFilter.start);
  const to = Date.parse(dateFilter.end);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return makeDefaultWindowMs();
  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
  };
}

export function TimelinePage() {
  const ctx = React.useContext(LayoutContext);
  const [tooltip, setTooltip] = React.useState<TooltipState>({ visible: false });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [timelineScrollLeft, setTimelineScrollLeft] = React.useState(0);
  const [isDraggingTimeline, setIsDraggingTimeline] = React.useState(false);
  const [isRefreshPanelOpen, setIsRefreshPanelOpen] = React.useState(false);
  const [isDateFilterPanelOpen, setIsDateFilterPanelOpen] = React.useState(false);
  const dateFromInputRef = React.useRef<HTMLInputElement | null>(null);
  const dateToInputRef = React.useRef<HTMLInputElement | null>(null);
  const dragStartRef = React.useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const timelineHost = useElementWidth<HTMLDivElement>();

  if (!ctx) return null;
  const { viewMode, setViewMode, sortMode, setSortMode, filters, setFilters, snapshotState, design, ui, locale, setLocale } = ctx;
  const {
    snapshot,
    isLoading,
    status,
    error,
    reloadLocal,
    syncFromApi,
    demoMode,
    toggleDemoMode,
    loadLimit,
    setLoadLimit,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
  } = snapshotState;
  const rowH = design.tableRowHeight;

  if (!snapshot) {
    return (
      <div className="card" style={{ minHeight: 160 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>
          {isLoading ? ui.common.loadingTitle : ui.common.noDataTitle}
        </h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {isLoading ? ui.common.loadingHint : ui.common.noDataHint}
        </p>
        {error ? (
          <div className="muted" style={{ color: "#ffb8c8", marginBottom: 8 }}>
            {String(error)}
          </div>
        ) : null}
        <div className="row" style={{ marginTop: 10 }}>
          <button onClick={() => { void syncFromApi(); }}>{ui.filters.updateFromApi}</button>
          <button onClick={() => { void reloadLocal(); }}>{ui.filters.updateFromLocal}</button>
        </div>
      </div>
    );
  }

  const statusLabels = snapshot.enums?.status ?? {};

  const tasks = snapshot.tasks.filter((t) => {
    if (filters.ownerId && t.ownerId !== filters.ownerId) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
  const tasksForRender = (() => {
    const allowedStatuses = new Set<string>([
      ...(statusFilter.work ? ["work"] : []),
      ...(statusFilter.preDone ? ["pre_done"] : []),
      ...(statusFilter.done ? ["done"] : []),
      ...(statusFilter.wait ? ["wait"] : []),
    ]);
    const hasStatusFilter = allowedStatuses.size > 0;
    const { from, to } = dateWindowMs(dateFilter);

    return tasks.filter((t) => {
      if (hasStatusFilter && !allowedStatuses.has(t.status)) return false;
      const startMs = t.start ? Date.parse(t.start) : Number.NaN;
      const endMs = t.end ? Date.parse(t.end) : Number.NaN;
      const safeStart = Number.isFinite(startMs)
        ? startMs
        : Number.isFinite(endMs)
          ? endMs
          : Number.NaN;
      const safeEnd = Number.isFinite(endMs)
        ? endMs
        : Number.isFinite(startMs)
          ? startMs
          : Number.NaN;
      if (!Number.isFinite(safeStart) || !Number.isFinite(safeEnd)) return true;
      return safeEnd >= from && safeStart <= to;
    });
  })();
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(filters.displayLimit || 30)));
  const safeLoadLimit = Math.max(1, Math.min(1000, Math.floor(loadLimit || 30)));
  const tasksByFreshEnd = [...tasksForRender].sort((a, b) => {
    const aEnd = a.end ? Date.parse(a.end) : Number.NEGATIVE_INFINITY;
    const bEnd = b.end ? Date.parse(b.end) : Number.NEGATIVE_INFINITY;
    if (aEnd === bEnd) return String(a.id).localeCompare(String(b.id));
    return bEnd - aEnd;
  });
  const limitedTasks = tasksByFreshEnd.slice(0, safeLimit);

  const selectedTask = selectedId ? snapshot.tasks.find((t) => t.id === selectedId) ?? null : null;

  const onHover = (
    e: React.MouseEvent,
    t: RenderTask,
    meta?: { date: Date; milestoneLabel?: string }
  ) => {
    const manager = t.customer ?? "-";
    const history = (t.history ?? "").trim();
    const dateLabel = meta?.date ? formatDdMm(meta.date) : "-";

    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div style={{ minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="badge">{dateLabel}</span>
            {meta?.milestoneLabel ? <span>{meta.milestoneLabel}</span> : null}
          </div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>##{t.title}</div>
          <div style={{ opacity: 0.9 }}>{manager}</div>
          <div style={{ margin: "6px 0", borderTop: "1px solid rgba(144,166,223,0.34)" }} />
          <div style={{ whiteSpace: "pre-wrap", opacity: 0.92 }}>
            {history || "-"}
          </div>
        </div>
      ),
    });
  };
  const onLeave = () => setTooltip({ visible: false });

  const timelineWidth = Math.max(timelineHost.width, design.timelineWidth);
  const showMilestoneLabels = design.timelineShowMilestoneLabels >= 0.5;
  const labelEveryDay = design.timelineLabelEveryDay >= 0.5;
  const weekendFillMode = design.timelineWeekendFullDay >= 0.5 ? "full-day" : "legacy";
  const exactZoomPreset = ZOOM_PRESETS.find((z) => Math.abs(z - zoom) < 0.001);
  const zoomPresetValue = String(exactZoomPreset ?? 1);

  return (
    <div className="card">
      {status === "stale_error" && error ? (
        <ErrorBanner
          compact
          title={ui.timeline.staleTitle}
          error={error}
          onRetry={reloadLocal}
        />
      ) : null}

      <div className="timelineFrame">
        <div className="timelineModeDock">
          <button
            type="button"
            className={`modeMiniBtn ${viewMode === "designer_brand_show" ? "active" : ""}`}
            onClick={() => setViewMode("designer_brand_show")}
          >
            {ui.modeByDesignerBrandShow}
          </button>
          <button
            type="button"
            className={`modeMiniBtn ${viewMode === "brand_designer_show" ? "active" : ""}`}
            onClick={() => setViewMode("brand_designer_show")}
          >
            {ui.modeByBrandDesignerShow}
          </button>
          <button
            type="button"
            className={`modeMiniBtn ${viewMode === "format_brand_show" ? "active" : ""}`}
            onClick={() => setViewMode("format_brand_show")}
          >
            {ui.modeByFormatBrandShow}
          </button>
          <button
            type="button"
            className={`modeMiniBtn ${viewMode === "show_brand_designer" ? "active" : ""}`}
            onClick={() => setViewMode("show_brand_designer")}
          >
            {ui.modeByShowBrandDesigner}
          </button>
          <button
            type="button"
            className={`modeMiniBtn ${viewMode === "flat_brand_show" ? "active" : ""}`}
            onClick={() => setViewMode("flat_brand_show")}
          >
            {ui.modeFlatBrandShow}
          </button>
        </div>

        <div className="timelineTopControlDock">
          <div className="timelineTopControlRow">
            <div className="timelineZoomCtl">
              <button
                type="button"
                onClick={() => {
                  const idx = ZOOM_PRESETS.findIndex((v) => Math.abs(v - zoom) < 0.001);
                  const nextIdx = idx <= 0 ? 0 : idx - 1;
                  setZoom(ZOOM_PRESETS[nextIdx]);
                }}
              >
                -
              </button>
              <select
                value={zoomPresetValue}
                onChange={(e) => setZoom(clamp(Number(e.target.value), 0.4, 5))}
                aria-label={ui.timeline.zoomAria}
              >
                {ZOOM_PRESETS.map((z) => (
                  <option key={z} value={String(z)}>
                    {Math.round(z * 100)}%
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const idx = ZOOM_PRESETS.findIndex((v) => Math.abs(v - zoom) < 0.001);
                  const nextIdx = idx < 0 ? 2 : Math.min(ZOOM_PRESETS.length - 1, idx + 1);
                  setZoom(ZOOM_PRESETS[nextIdx]);
                }}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className={`iconCtlBtn ${demoMode ? "active" : ""}`}
              onClick={() => {
                void toggleDemoMode();
              }}
              title={ui.filters.demoMode}
              aria-label={ui.filters.demoMode}
            >
              {ui.filters.demoMode}
            </button>
            <button
              type="button"
              className="iconCtlBtn"
              onClick={() =>
                setSortMode((prev) =>
                  prev === "last_milestone_desc" ? "last_milestone_asc" : "last_milestone_desc"
                )
              }
              title={
                sortMode === "last_milestone_desc"
                  ? ui.filters.sortByLastMilestoneDesc
                  : ui.filters.sortByLastMilestoneAsc
              }
              aria-label={
                sortMode === "last_milestone_desc"
                  ? ui.filters.sortByLastMilestoneDesc
                  : ui.filters.sortByLastMilestoneAsc
              }
            >
              {sortMode === "last_milestone_desc" ? "↑" : "↓"}
            </button>
            <button
              type="button"
              className={`iconCtlBtn ${isRefreshPanelOpen ? "active" : ""}`}
              onClick={() => setIsRefreshPanelOpen((s) => !s)}
              title={ui.filters.updateFromApi}
              aria-label={ui.filters.updateFromApi}
            >
              ⟳
            </button>
            <button
              type="button"
              className={`iconCtlBtn filterCtlBtn ${isDateFilterPanelOpen || dateFilter.enabled ? "active" : ""}`}
              onClick={() => setIsDateFilterPanelOpen((s) => !s)}
              title={ui.filters.dateFilterTitle}
              aria-label={ui.filters.dateFilterTitle}
            >
              Ф
            </button>
            <label className="langCtl">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as typeof locale)}
                aria-label={ui.localeLabel}
              >
                <option value="ru">{ui.localeRu}</option>
                <option value="en">{ui.localeEn}</option>
              </select>
            </label>
          </div>
          {isRefreshPanelOpen ? <FiltersBar /> : null}
          {isDateFilterPanelOpen ? (
            <div className="timelineDateFilterPanel">
              <div className="timelineDateFilterLayout">
                <div className="timelineDateFilterLeft">
                  <div className="timelineDateFilterRow">
                    {dateFilter.enabled ? (
                      <>
                        <label>
                          <span>{ui.filters.dateFrom}</span>
                          <div className="datePickerField">
                            <input
                              ref={dateFromInputRef}
                              type="date"
                              value={dateFilter.start}
                              onChange={(e) =>
                                setDateFilter({
                                  ...dateFilter,
                                  start: e.target.value,
                                })
                              }
                            />
                            <button
                              type="button"
                              className="datePickerBtn"
                              onClick={() => {
                                const input = dateFromInputRef.current;
                                if (!input) return;
                                const maybeShowPicker = (input as HTMLInputElement & {
                                  showPicker?: () => void;
                                }).showPicker;
                                if (typeof maybeShowPicker === "function") {
                                  maybeShowPicker.call(input);
                                } else {
                                  input.focus();
                                }
                              }}
                              aria-label={`${ui.filters.dateFrom} calendar`}
                            >
                              📅
                            </button>
                          </div>
                        </label>
                        <label>
                          <span>{ui.filters.dateTo}</span>
                          <div className="datePickerField">
                            <input
                              ref={dateToInputRef}
                              type="date"
                              value={dateFilter.end}
                              onChange={(e) =>
                                setDateFilter({
                                  ...dateFilter,
                                  end: e.target.value,
                                })
                              }
                            />
                            <button
                              type="button"
                              className="datePickerBtn"
                              onClick={() => {
                                const input = dateToInputRef.current;
                                if (!input) return;
                                const maybeShowPicker = (input as HTMLInputElement & {
                                  showPicker?: () => void;
                                }).showPicker;
                                if (typeof maybeShowPicker === "function") {
                                  maybeShowPicker.call(input);
                                } else {
                                  input.focus();
                                }
                              }}
                              aria-label={`${ui.filters.dateTo} calendar`}
                            >
                              📅
                            </button>
                          </div>
                        </label>
                      </>
                    ) : null}
                    <label className="timelineLimitCtl">
                      <span>
                        {ui.filters.displayLimitLabel}: {safeLimit}
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={200}
                        step={1}
                        value={safeLimit}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setFilters((prev) => ({
                            ...prev,
                            displayLimit: Number.isFinite(next) && next > 0 ? next : 30,
                          }));
                        }}
                      />
                    </label>
                    <label className="timelineLimitCtl">
                      <span>
                        {ui.filters.loadLimitLabel}: {safeLoadLimit}
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={200}
                        step={1}
                        value={safeLoadLimit}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          const normalized = Number.isFinite(next) && next > 0 ? next : 30;
                          setLoadLimit(normalized);
                          setFilters((prev) => ({ ...prev, loadLimit: normalized }));
                        }}
                      />
                    </label>
                    <div className="limitMeta muted">
                      {snapshot.tasks.length} / {limitedTasks.length}
                    </div>
                  </div>
                </div>

                <div className="timelineStatusButtons">
                  <button
                    type="button"
                    className={`toggleBtn ${dateFilter.enabled ? "active" : ""}`}
                    onClick={() =>
                      setDateFilter({
                        ...dateFilter,
                        enabled: !dateFilter.enabled,
                      })
                    }
                  >
                    Дата
                  </button>
                  <button
                    type="button"
                    className={`toggleBtn ${statusFilter.work ? "active" : ""}`}
                    onClick={() => setStatusFilter({ ...statusFilter, work: !statusFilter.work })}
                  >
                    В работе
                  </button>
                  <button
                    type="button"
                    className={`toggleBtn ${statusFilter.preDone ? "active" : ""}`}
                    onClick={() =>
                      setStatusFilter({ ...statusFilter, preDone: !statusFilter.preDone })
                    }
                  >
                    Почти готово
                  </button>
                  <button
                    type="button"
                    className={`toggleBtn ${statusFilter.done ? "active" : ""}`}
                    onClick={() => setStatusFilter({ ...statusFilter, done: !statusFilter.done })}
                  >
                    Готово
                  </button>
                  <button
                    type="button"
                    className={`toggleBtn ${statusFilter.wait ? "active" : ""}`}
                    onClick={() => setStatusFilter({ ...statusFilter, wait: !statusFilter.wait })}
                  >
                    Ждёт
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="card timelineScroll"
          ref={timelineHost.ref}
          style={{
            overflow: "auto",
            cursor: isDraggingTimeline ? "grabbing" : "grab",
            userSelect: isDraggingTimeline ? "none" : "auto",
          }}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            const el = e.currentTarget;
            dragStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              left: el.scrollLeft,
              top: el.scrollTop,
            };
            setIsDraggingTimeline(true);
          }}
          onMouseMove={(e) => {
            const drag = dragStartRef.current;
            if (!drag) return;
            const el = e.currentTarget;
            const dx = e.clientX - drag.x;
            const dy = e.clientY - drag.y;
            el.scrollLeft = drag.left - dx;
            el.scrollTop = drag.top - dy;
          }}
          onMouseUp={() => {
            dragStartRef.current = null;
            setIsDraggingTimeline(false);
          }}
          onMouseLeave={() => {
            dragStartRef.current = null;
            setIsDraggingTimeline(false);
          }}
          onScroll={(e) => setTimelineScrollLeft(e.currentTarget.scrollLeft)}
        >
          <UnifiedTimeline
            mode={viewMode}
            sortMode={sortMode}
            locale={locale}
            people={snapshot.people}
            groups={snapshot.groups}
            tasks={limitedTasks}
            statusLabels={statusLabels}
            unassignedLabel={ui.common.unassigned}
            width={timelineWidth}
            viewportWidth={timelineHost.width}
            leftPinOffset={timelineScrollLeft}
            rowH={rowH}
            labelW={Math.max(320, design.desktopLeftColWidth)}
            topOffset={design.timelineTopOffset}
            dateLabelY={design.timelineDateLabelY}
            dateFontSize={design.timelineDateFontSize}
            dateIdleOpacity={design.timelineDateIdleOpacity}
            dateHoverOpacity={design.timelineDateHoverOpacity}
            monthFontSize={design.timelineMonthFontSize}
            monthOffsetY={design.timelineMonthOffsetY}
            monthOffsetX={design.timelineMonthOffsetX}
            todayLineOpacity={design.timelineTodayLineOpacity}
            todayLineWidth={design.timelineTodayLineWidth}
            cursorTrailDays={design.timelineCursorTrailDays}
            cursorTrailOpacity={design.timelineCursorTrailOpacity}
            holidayFillOpacity={design.timelineHolidayFillOpacity}
            leftOwnerFontSize={design.timelineLeftOwnerFontSize}
            leftOwnerXOffset={design.timelineLeftOwnerXOffset}
            leftOwnerTextOffsetY={design.timelineLeftOwnerTextOffsetY}
            leftOwnerCropLeft={design.timelineLeftOwnerCropLeft}
            leftTaskFontSize={design.timelineLeftTaskFontSize}
            leftTaskXOffset={design.timelineLeftTaskXOffset}
            leftTaskTextOffsetY={design.timelineLeftTaskTextOffsetY}
            leftTaskCropLeft={design.timelineLeftTaskCropLeft}
            leftMetaFontSize={design.timelineLeftMetaFontSize}
            leftMetaTextOffsetY={design.timelineLeftMetaTextOffsetY}
            leftPillOffsetY={design.timelineLeftPillOffsetY}
            leftPillXOffset={design.timelineLeftPillXOffset}
            leftPillWidth={design.timelineLeftPillWidth}
            leftPillSizeScale={design.timelineLeftPillSizeScale}
            leftGroupOffsetY={design.timelineLeftGroupOffsetY}
            leftGroupXOffset={design.timelineLeftGroupXOffset}
            leftGroupCropLeft={design.timelineLeftGroupCropLeft}
            leftGroupFontSize={design.timelineLeftGroupFontSize}
            badgeHeight={design.badgeHeight}
            badgeFontSize={design.badgeFontSize}
            textRenderingMode={design.textRenderingMode}
            zoom={zoom}
            stripeOpacity={design.timelineStripeOpacity}
            gridOpacity={design.timelineGridOpacity}
            gridLineWidth={design.timelineGridLineWidth}
            barInsetY={design.barInsetY}
            barRadius={design.barRadius}
            labelEveryDay={labelEveryDay}
            weekendFillMode={weekendFillMode}
            weekendFillOpacity={design.timelineWeekendFillOpacity}
            milestoneSizeScale={design.milestoneSizeScale}
            milestoneOpacity={design.milestoneOpacity}
            showMilestoneLabels={showMilestoneLabels}
            taskColorMixPercent={design.taskColorMixPercent}
            onHover={onHover}
            onLeave={onLeave}
            onClick={(t) => setSelectedId(t.id)}
          />
        </div>
      </div>

      <Tooltip state={tooltip} />
      <TaskDetailsDrawer
        task={selectedTask}
        people={snapshot.people}
        groups={snapshot.groups}
        statusLabels={snapshot.enums?.status}
        milestoneTypeLabels={snapshot.enums?.milestoneType}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
