import React from "react";

import { LayoutContext } from "../components/Layout";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { MiniAppShell, MiniAppTab } from "../components/miniapp/MiniAppShell";
import { MiniTaskListItem } from "../components/miniapp/MobileTaskList";
import { initTelegramMiniApp } from "../config/telegramRuntime";
import { selectCurrentPersonLink } from "../data/selectors/sessionSelectors";
import {
  selectAllTasks,
  selectMyTasks,
  selectTaskById,
  sortTasksForMobile,
} from "../data/selectors/taskSelectors";
import { MiniAppProfilePage } from "./MiniAppProfilePage";
import { MiniAppTasksPage } from "./MiniAppTasksPage";
import { MiniAppTimelinePage } from "./MiniAppTimelinePage";
import { resolveMilestoneTone } from "../utils/milestoneTone";

const MINI_APP_ADMIN_RETURN_KEY = "dtm-miniapp-admin-return-to";

function formatDueLabel(rawDate: string | null): string {
  if (!rawDate) return "Без даты";
  const parsed = new Date(`${rawDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Без даты";
  return parsed.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

function resolveFinalMilestoneDate(task: {
  milestones?: Array<{ type?: string | null; planned?: string; actual?: string | null }> | null;
  nextDue?: string | null;
  end?: string;
  start?: string;
}): string | null {
  const finalMilestone = (task.milestones ?? []).find((milestone) =>
    resolveMilestoneTone(milestone.type ?? null, milestone.type ?? null) === "final"
  );
  return finalMilestone?.actual ?? finalMilestone?.planned ?? task.nextDue ?? task.end ?? task.start ?? null;
}

export function MiniAppPage() {
  const ctx = React.useContext(LayoutContext);
  const [currentTab, setCurrentTab] = React.useState<MiniAppTab>("tasks");
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);

  React.useEffect(() => {
    initTelegramMiniApp();
  }, []);

  if (!ctx) return null;

  const { snapshotState, authSession } = ctx;
  const snapshot = snapshotState.snapshot;
  const currentPerson = selectCurrentPersonLink({
    authSession: authSession.state,
    snapshot,
  });
  const groupsById = React.useMemo(
    () => new Map((snapshot?.groups ?? []).map((group) => [group.id, group.name] as const)),
    [snapshot?.groups]
  );
  const peopleById = React.useMemo(
    () => new Map((snapshot?.people ?? []).map((person) => [person.id, person.name] as const)),
    [snapshot?.people]
  );
  const canViewAllTasks = authSession.state.user?.role === "admin";
  const scopedTasks = canViewAllTasks
    ? sortTasksForMobile(selectAllTasks(snapshot))
    : sortTasksForMobile(selectMyTasks(snapshot, currentPerson.personId));
  const taskItems = React.useMemo<MiniTaskListItem[]>(
    () =>
      scopedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        ownerName: ((task.ownerId ? peopleById.get(task.ownerId) : null) ?? task.ownerName?.trim()) || null,
        brand: task.brand?.trim() || null,
        format: task.format_?.trim() || task.type?.trim() || null,
        showName: (task.groupId ? groupsById.get(task.groupId) : null) ?? null,
        dueLabel: formatDueLabel(resolveFinalMilestoneDate(task)),
      })),
    [groupsById, peopleById, scopedTasks]
  );
  const selectedTask = selectTaskById(snapshot, selectedTaskId);

  let body: React.ReactNode;
  if (snapshotState.isLoading && !snapshot) {
    body = <div className="miniAppEmpty">Загружаем snapshot...</div>;
  } else if (!snapshot && snapshotState.error) {
    body = <div className="miniAppNotice">Не удалось загрузить данные: {String(snapshotState.error)}</div>;
  } else if (currentTab === "tasks") {
    body = (
      <MiniAppTasksPage
        items={taskItems}
        canViewAllTasks={canViewAllTasks}
        unresolvedPersonLink={!currentPerson.personId}
        authState={authSession.state}
        onOpenTask={setSelectedTaskId}
      />
    );
  } else if (currentTab === "timeline") {
    body = <MiniAppTimelinePage tasks={scopedTasks} snapshot={snapshot} onOpenTask={setSelectedTaskId} />;
  } else {
    body = (
      <MiniAppProfilePage
        authState={authSession.state}
        onLogin={() => { void authSession.startLogin(); }}
        onLogout={() => { void authSession.logout(); }}
        onReload={() => {
          void (async () => {
            await authSession.reload();
            await authSession.startTelegramSession();
          })();
        }}
        onOpenAdmin={() => {
          if (typeof window !== "undefined") {
            const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            window.sessionStorage.setItem(MINI_APP_ADMIN_RETURN_KEY, returnTo);
            window.localStorage.setItem(MINI_APP_ADMIN_RETURN_KEY, returnTo);
            window.location.assign(`${authSession.adminHref}?mini_app=1`);
          }
        }}
      />
    );
  }

  return (
    <>
      <MiniAppShell currentTab={currentTab} onTabChange={setCurrentTab}>
        {body}
      </MiniAppShell>

      <TaskDetailsDrawer
        task={selectedTask}
        people={snapshot?.people ?? []}
        groups={snapshot?.groups}
        statusLabels={snapshot?.enums?.status}
        milestoneTypeLabels={snapshot?.enums?.milestoneType}
        presentation="sheet"
        onClose={() => setSelectedTaskId(null)}
      />
    </>
  );
}
