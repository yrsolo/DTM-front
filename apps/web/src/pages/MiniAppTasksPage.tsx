import { TaskV1 } from "@dtm/schema/snapshot";

import { AuthSessionState } from "../auth/useAuthSession";
import { MobileTaskList } from "../components/miniapp/MobileTaskList";
import { TaskQuickFilter, TaskScopeMode } from "../data/selectors/taskSelectors";

function filterLabel(filter: TaskQuickFilter): string {
  if (filter === "today") return "Сегодня";
  if (filter === "overdue") return "Просрочено";
  if (filter === "week") return "Неделя";
  return "Все";
}

function unresolvedPersonMessage(authState: AuthSessionState): string {
  if (authState.telegramBootstrapReason === "telegram_person_not_found") {
    return "Не нашли ваш Telegram аккаунт в базе дизайнеров. Обратитесь к администратору.";
  }
  if (authState.telegramBootstrapReason === "telegram_person_missing_email") {
    return "В базе дизайнеров для вашего Telegram аккаунта не заполнен yandexEmail.";
  }
  if (authState.telegramBootstrapReason === "telegram_user_not_found_by_email") {
    return "По yandexEmail из базы дизайнеров не найден пользователь в auth. Сначала войдите в DTM через веб.";
  }
  if (authState.telegramBootstrapReason === "telegram_user_not_linked") {
    return "Telegram аккаунт ещё не связан с пользователем DTM.";
  }
  if (authState.telegramBootstrap === "linking") {
    return "Проверяем Telegram-вход и связь с дизайнером...";
  }
  return "Для режима “Мои” пока нет подтверждённой связи с дизайнером.";
}

export function MiniAppTasksPage(props: {
  tasks: TaskV1[];
  scopeMode: TaskScopeMode;
  quickFilter: TaskQuickFilter;
  stats: Record<TaskQuickFilter, number>;
  canViewAllTasks: boolean;
  onChangeScope: (mode: TaskScopeMode) => void;
  onChangeQuickFilter: (filter: TaskQuickFilter) => void;
  onOpenTask: (taskId: string) => void;
  unresolvedPersonLink: boolean;
  authState: AuthSessionState;
}) {
  return (
    <div className="miniAppSection">
      <div className="miniAppControls">
        <div className="miniAppSegmented">
          <button
            type="button"
            className={`miniAppChip ${props.scopeMode === "mine" ? "isActive" : ""}`}
            onClick={() => props.onChangeScope("mine")}
          >
            Мои
          </button>
          {props.canViewAllTasks ? (
            <button
              type="button"
              className={`miniAppChip ${props.scopeMode === "all" ? "isActive" : ""}`}
              onClick={() => props.onChangeScope("all")}
            >
              Все
            </button>
          ) : null}
        </div>
        <div className="miniAppQuickFilters">
          {(["all", "today", "overdue", "week"] as TaskQuickFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`miniAppChip ${props.quickFilter === filter ? "isActive" : ""}`}
              onClick={() => props.onChangeQuickFilter(filter)}
            >
              {filterLabel(filter)} {props.stats[filter]}
            </button>
          ))}
        </div>
      </div>
      {props.unresolvedPersonLink && props.scopeMode === "mine" ? (
        <div className="miniAppNotice">{unresolvedPersonMessage(props.authState)}</div>
      ) : null}
      <MobileTaskList tasks={props.tasks} onOpenTask={props.onOpenTask} />
    </div>
  );
}
