import React from "react";

import { AuthSessionState } from "../auth/useAuthSession";
import {
  MiniTaskGroupingMode,
  MiniTaskListItem,
  MobileTaskList,
} from "../components/miniapp/MobileTaskList";

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

const GROUPING_LABELS: Record<MiniTaskGroupingMode, string> = {
  designer: "Дизайнер",
  brand: "Бренд",
  show: "Шоу",
};

export function MiniAppTasksPage(props: {
  items: MiniTaskListItem[];
  canViewAllTasks: boolean;
  unresolvedPersonLink: boolean;
  authState: AuthSessionState;
  onOpenTask: (taskId: string) => void;
}) {
  const [groupingMode, setGroupingMode] = React.useState<MiniTaskGroupingMode>("designer");
  const [toggleAllToken, setToggleAllToken] = React.useState(0);

  function handleGroupingClick(mode: MiniTaskGroupingMode) {
    if (groupingMode === mode) {
      setToggleAllToken((value) => value + 1);
      return;
    }
    setGroupingMode(mode);
  }

  return (
    <div className="miniAppSection">
      <div className="miniAppSegmented">
        {(["designer", "brand", "show"] as MiniTaskGroupingMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`miniAppChip ${groupingMode === mode ? "isActive" : ""}`}
            onClick={() => handleGroupingClick(mode)}
          >
            {GROUPING_LABELS[mode]}
          </button>
        ))}
      </div>
      {props.unresolvedPersonLink && !props.canViewAllTasks ? (
        <div className="miniAppNotice">{unresolvedPersonMessage(props.authState)}</div>
      ) : null}
      <MobileTaskList
        items={props.items}
        groupingMode={groupingMode}
        toggleAllToken={toggleAllToken}
        onOpenTask={props.onOpenTask}
      />
    </div>
  );
}
