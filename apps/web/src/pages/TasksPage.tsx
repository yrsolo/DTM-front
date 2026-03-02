import React from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { LayoutContext } from "../components/Layout";
import { LoadingState } from "../components/LoadingState";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { Tooltip, TooltipState } from "../components/Tooltip";
import { useSnapshot } from "../data/useSnapshot";
import { TasksTimeline } from "../gantt/TasksTimeline";
import { RenderTask } from "../gantt/types";

export function TasksPage() {
  const ctx = React.useContext(LayoutContext);
  const { snapshot, isLoading, error, reload } = useSnapshot();

  const [tooltip, setTooltip] = React.useState<TooltipState>({ visible: false });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorBanner error={error} onRetry={reload} />;
  if (!snapshot) return <EmptyState title="No data" description="Snapshot is empty." />;
  if (!ctx) return null;

  const { filters } = ctx;

  const peopleById = new Map(snapshot.people.map((p) => [p.id, p.name]));
  const statusLabels = snapshot.enums?.status ?? {};

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
            Owner: {t.ownerId ? (peopleById.get(t.ownerId) ?? t.ownerId) : "Unassigned"}
          </div>
          <div style={{ opacity: 0.85, marginTop: 2 }}>
            Status: {statusLabels[t.status] ?? t.status}
          </div>
        </div>
      )
    });
  };

  const onLeave = () => setTooltip({ visible: false });

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>By tasks</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        Tasks: {tasks.length} • Generated: {snapshot.meta.generatedAt}
      </div>

      <div className="grid2">
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr
                  key={t.id}
                  style={{ cursor: "pointer", height: 32 }}
                  onClick={() => setSelectedId(t.id)}
                >
                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                    {t.title}
                  </td>
                  <td className="muted">{t.ownerId ? (peopleById.get(t.ownerId) ?? t.ownerId) : "—"}</td>
                  <td>
                    <span className="badge">{statusLabels[t.status] ?? t.status}</span>
                  </td>
                  <td className="muted" style={{ fontSize: 11 }}>
                    {(t.start ?? "—") + " → " + (t.end ?? "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ overflow: "auto" }}>
          <TasksTimeline
            tasks={tasks}
            width={760}
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
