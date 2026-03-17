import React from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { LayoutContext } from "../components/Layout";
import { LoadingState } from "../components/LoadingState";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { Tooltip, TooltipState } from "../components/Tooltip";
import { DesignersTimeline } from "../gantt/DesignersTimeline";
import { RenderTask } from "../gantt/types";
import { useElementWidth } from "../utils/useElementWidth";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function DesignersPage() {
  const ctx = React.useContext(LayoutContext);

  const [tooltip, setTooltip] = React.useState<TooltipState>({ visible: false });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const timelineHost = useElementWidth<HTMLDivElement>();

  if (!ctx) return null;
  const { filters, snapshotState, design, authSession } = ctx;
  const { snapshot, isLoading, status, error, reloadLocal } = snapshotState;
  const rowH = design.tableRowHeight;
  const canViewAllTasks =
    authSession.state.user?.role === "admin" || Boolean(authSession.state.user?.canViewAllTasks);
  const forcedOwnerId =
    !canViewAllTasks && authSession.state.authenticated ? authSession.state.user?.personId ?? "" : "";

  if (isLoading && !snapshot) return <LoadingState />;
  if (!snapshot && error) return <ErrorBanner error={error} onRetry={reloadLocal} />;
  if (!snapshot) return <EmptyState title="No data" description="Snapshot is empty." />;

  const tasks = snapshot.tasks.filter((t) => {
    const effectiveOwnerId = forcedOwnerId || filters.ownerId;
    if (effectiveOwnerId && t.ownerId !== effectiveOwnerId) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const selectedTask = selectedId ? snapshot.tasks.find((t) => t.id === selectedId) ?? null : null;
  const onHover = (e: React.MouseEvent, t: RenderTask) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <div style={{ fontWeight: 600 }}>{t.title}</div>
          <div style={{ opacity: 0.85, marginTop: 4 }}>
            Status: {snapshot.enums?.status?.[t.status] ?? t.status}
          </div>
        </div>
      )
    });
  };

  const onLeave = () => setTooltip({ visible: false });
  const timelineWidth = Math.max(timelineHost.width, design.timelineWidth);
  const showMilestoneLabels = design.timelineShowMilestoneLabels >= 0.5;
  const labelEveryDay = design.timelineLabelEveryDay >= 0.5;
  const weekendFillMode = design.timelineWeekendFullDay >= 0.5 ? "full-day" : "legacy";

  return (
    <div className="card">
      <div className="pageHeader">
        <h3 className="pageTitle">Grant chart by designers</h3>
      </div>

      {status === "stale_error" && error ? (
        <ErrorBanner
          compact
          title="Stale data: refresh failed"
          error={error}
          onRetry={reloadLocal}
        />
      ) : null}

      <div>
        <div
          className="card timelineScroll"
          ref={timelineHost.ref}
          onWheel={(e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.08 : 0.92;
            setZoom((z) => clamp(z * factor, 0.4, 5));
          }}
          style={{ overflow: "auto" }}
        >
          <DesignersTimeline
            people={snapshot.people}
            groups={snapshot.groups}
            tasks={tasks}
            width={timelineWidth}
            rowH={rowH}
            labelW={Math.max(320, design.desktopLeftColWidth)}
            topOffset={design.timelineTopOffset}
            dateLabelY={design.timelineDateLabelY}
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
