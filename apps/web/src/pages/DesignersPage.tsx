import React from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { LayoutContext } from "../components/Layout";
import { LoadingState } from "../components/LoadingState";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { Tooltip, TooltipState } from "../components/Tooltip";
import { useSnapshot } from "../data/useSnapshot";
import { DesignersTimeline } from "../gantt/DesignersTimeline";
import { RenderTask } from "../gantt/types";

export function DesignersPage() {
  const ctx = React.useContext(LayoutContext);
  const { snapshot, isLoading, error, reload } = useSnapshot();

  const [tooltip, setTooltip] = React.useState<TooltipState>({ visible: false });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorBanner error={error} onRetry={reload} />;
  if (!snapshot) return <EmptyState title="No data" description="Snapshot is empty." />;
  if (!ctx) return null;

  const { filters } = ctx;

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

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>By designers</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        Tasks: {tasks.length} • Generated: {snapshot.meta.generatedAt}
      </div>

      <div className="grid2">
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Designer</th>
                <th>Tasks</th>
                <th>Load</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.people.map((p) => {
                const pTasks = tasks.filter((t) => t.ownerId === p.id);
                const load = Math.min(100, (pTasks.length / 5) * 100); // 5 tasks = 100% load
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{pTasks.length}</td>
                    <td>
                      <div style={{ width: 60, height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${load}%`,
                            height: "100%",
                            background: load > 80 ? "#ff4d4f" : "#52c41a",
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

        <div className="card" style={{ overflow: "auto" }}>
          <DesignersTimeline
            people={snapshot.people}
            tasks={tasks}
            width={760}
            height={Math.max(260, snapshot.people.length * 40)}
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
