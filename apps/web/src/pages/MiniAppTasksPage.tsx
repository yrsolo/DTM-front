import { TaskV1 } from "@dtm/schema/snapshot";

import { AuthSessionState } from "../auth/useAuthSession";
import { MobileTaskList } from "../components/miniapp/MobileTaskList";

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
  return "Для списка задач пока нет подтверждённой связи с дизайнером.";
}

export function MiniAppTasksPage(props: {
  tasks: TaskV1[];
  canViewAllTasks: boolean;
  unresolvedPersonLink: boolean;
  authState: AuthSessionState;
  onOpenTask: (taskId: string) => void;
}) {
  return (
    <div className="miniAppSection">
      <div className="miniAppNotice">
        {props.canViewAllTasks ? "Показаны все активные задачи." : "Показаны только ваши активные задачи."}
      </div>
      {props.unresolvedPersonLink && !props.canViewAllTasks ? (
        <div className="miniAppNotice">{unresolvedPersonMessage(props.authState)}</div>
      ) : null}
      <MobileTaskList tasks={props.tasks} onOpenTask={props.onOpenTask} />
    </div>
  );
}
