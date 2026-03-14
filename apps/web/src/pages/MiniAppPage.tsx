import React from "react";

import { LayoutContext } from "../components/Layout";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { MiniAppShell, MiniAppTab } from "../components/miniapp/MiniAppShell";
import { initTelegramMiniApp } from "../config/telegramRuntime";
import { selectCurrentPersonLink } from "../data/selectors/sessionSelectors";
import {
  selectAllTasks,
  selectMyTasks,
  selectTaskById,
  sortTasksForMobile,
} from "../data/selectors/taskSelectors";
import { groupAgendaItemsByDay, selectAgendaItemsFromTasks } from "../data/selectors/timelineSelectors";
import { MiniAppProfilePage } from "./MiniAppProfilePage";
import { MiniAppTasksPage } from "./MiniAppTasksPage";
import { MiniAppTimelinePage } from "./MiniAppTimelinePage";

const MINI_APP_ADMIN_RETURN_KEY = "dtm-miniapp-admin-return-to";

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
  const canViewAllTasks = authSession.state.user?.role === "admin";
  const scopedTasks = canViewAllTasks
    ? sortTasksForMobile(selectAllTasks(snapshot))
    : sortTasksForMobile(selectMyTasks(snapshot, currentPerson.personId));
  const agendaGroups = groupAgendaItemsByDay(selectAgendaItemsFromTasks(scopedTasks, snapshot));
  const selectedTask = selectTaskById(snapshot, selectedTaskId);

  let body: React.ReactNode;
  if (snapshotState.isLoading && !snapshot) {
    body = <div className="miniAppEmpty">Загружаем snapshot...</div>;
  } else if (!snapshot && snapshotState.error) {
    body = <div className="miniAppNotice">Не удалось загрузить данные: {String(snapshotState.error)}</div>;
  } else if (currentTab === "tasks") {
    body = (
      <MiniAppTasksPage
        tasks={scopedTasks}
        canViewAllTasks={canViewAllTasks}
        unresolvedPersonLink={!currentPerson.personId}
        authState={authSession.state}
        onOpenTask={setSelectedTaskId}
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
