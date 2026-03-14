import React from "react";

import { LayoutContext } from "../components/Layout";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { MiniAppShell, MiniAppTab } from "../components/miniapp/MiniAppShell";
import { initTelegramMiniApp } from "../config/telegramRuntime";
import { selectCurrentPersonLink } from "../data/selectors/sessionSelectors";
import {
  filterTasksByQuickFilter,
  selectAllTasks,
  selectMyTasks,
  selectTaskById,
  selectTaskListStats,
  sortTasksForMobile,
  TaskQuickFilter,
  TaskScopeMode,
} from "../data/selectors/taskSelectors";
import { groupAgendaItemsByDay, selectAgendaItemsFromTasks } from "../data/selectors/timelineSelectors";
import { MiniAppProfilePage } from "./MiniAppProfilePage";
import { MiniAppTasksPage } from "./MiniAppTasksPage";
import { MiniAppTimelinePage } from "./MiniAppTimelinePage";

export function MiniAppPage() {
  const ctx = React.useContext(LayoutContext);
  const [currentTab, setCurrentTab] = React.useState<MiniAppTab>("tasks");
  const [scopeMode, setScopeMode] = React.useState<TaskScopeMode>("mine");
  const [quickFilter, setQuickFilter] = React.useState<TaskQuickFilter>("all");
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
  const canViewAllTasks = authSession.state.user?.role === "admin";
  const allTasks = sortTasksForMobile(selectAllTasks(snapshot));
  const myTasks = sortTasksForMobile(selectMyTasks(snapshot, currentPerson.personId));

  React.useEffect(() => {
    if (canViewAllTasks) return;
    setScopeMode("mine");
  }, [canViewAllTasks]);

  const scopedTasks = scopeMode === "all" && canViewAllTasks ? allTasks : myTasks;
  const filteredTasks = filterTasksByQuickFilter(scopedTasks, quickFilter);
  const statsBase = scopeMode === "all" && canViewAllTasks ? allTasks : myTasks;
  const stats = selectTaskListStats(statsBase);
  const statsMap: Record<TaskQuickFilter, number> = {
    all: stats.all,
    today: stats.today,
    overdue: stats.overdue,
    week: stats.week,
  };
  const agendaGroups = groupAgendaItemsByDay(selectAgendaItemsFromTasks(filteredTasks, snapshot));
  const selectedTask = selectTaskById(snapshot, selectedTaskId);

  let body: React.ReactNode;
  if (snapshotState.isLoading && !snapshot) {
    body = <div className="miniAppEmpty">Загружаем snapshot...</div>;
  } else if (!snapshot && snapshotState.error) {
    body = <div className="miniAppNotice">Не удалось загрузить данные: {String(snapshotState.error)}</div>;
  } else if (currentTab === "tasks") {
    body = (
      <MiniAppTasksPage
        tasks={filteredTasks}
        scopeMode={scopeMode}
        quickFilter={quickFilter}
        stats={statsMap}
        canViewAllTasks={canViewAllTasks}
        onChangeScope={setScopeMode}
        onChangeQuickFilter={setQuickFilter}
        onOpenTask={setSelectedTaskId}
        unresolvedPersonLink={!currentPerson.personId}
        authState={authSession.state}
      />
    );
  } else if (currentTab === "timeline") {
    body = <MiniAppTimelinePage groups={agendaGroups} onOpenTask={setSelectedTaskId} />;
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
            window.location.assign(authSession.adminHref);
          }
        }}
      />
    );
  }

  return (
    <>
      <MiniAppShell
        title="DTM"
        subtitle={
          currentPerson.personName
            ? `Рабочий кабинет: ${currentPerson.personName}`
            : "Mobile-first режим текущего frontend"
        }
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      >
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
