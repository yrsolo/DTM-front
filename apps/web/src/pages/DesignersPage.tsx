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
  const { filters, snapshotState, design } = ctx;
  const { snapshot, isLoading, error, reloadLocal } = snapshotState;
  const rowH = design.tableRowHeight;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorBanner error={error} onRetry={reloadLocal} />;
  if (!snapshot) return <EmptyState title="No data" description="Snapshot is empty." />;

  const tasks = snapshot.tasks.filter((t) => {
    if (filters.ownerId && t.ownerId !== filters.ownerId) return false;
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

  return (
    <div className="card">
      <div className="pageHeader">
        <h3 className="pageTitle">Grant chart by designers</h3>
        <div className="muted">Generated: {snapshot.meta.generatedAt}</div>
      </div>

      <div className="grid2">
        <div className="card tablePinnedTop">
          <table className="table tableFixedRows">
            <thead>
              <tr>
                <th style={{ width: `${design.designersNameCol}%` }}>Designer</th>
                <th style={{ width: `${design.designersTasksCol}%` }}>Tasks</th>
                <th style={{ width: `${design.designersLoadCol}%` }}>Load</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.people.map((p) => {
                const pTasks = tasks.filter((t) => t.ownerId === p.id);
                const load = Math.min(100, (pTasks.length / 5) * 100); // 5 tasks = 100% load
                return (
                  <tr key={p.id}>
                    <td className="nowrap">{p.name}</td>
                    <td>{pTasks.length}</td>
                    <td>
                      <div
                        style={{
                          width: 92,
                          height: 8,
                          background: "rgba(146, 165, 228, 0.22)",
                          borderRadius: 8,
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            width: `${load}%`,
                            height: "100%",
                            background:
                              load > 80
                                ? "linear-gradient(90deg, #ff9a8b 0%, #f062e4 100%)"
                                : "linear-gradient(90deg, #6bb6ff 0%, #5be2ce 100%)"
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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
            tasks={tasks}
            width={timelineWidth}
            rowH={rowH}
            height={Math.max(design.timelineMinHeight, snapshot.people.length * rowH)}
            labelW={design.timelineLabelWidth}
            topOffset={design.timelineTopOffset}
            dateLabelY={design.timelineDateLabelY}
            zoom={zoom}
            stripeOpacity={design.timelineStripeOpacity}
            gridOpacity={design.timelineGridOpacity}
            barInsetY={design.barInsetY}
            barRadius={design.barRadius}
            milestoneSizeScale={design.milestoneSizeScale}
            milestoneOpacity={design.milestoneOpacity}
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
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
