import React from "react";

import { AuthSessionState } from "../auth/useAuthSession";
import {
  MiniTaskGroupingMode,
  MiniTaskListItem,
  MobileTaskList,
} from "../components/miniapp/MobileTaskList";
import type { MobileSurfaceMode } from "./MiniAppPage";

function unresolvedPersonMessage(authState: AuthSessionState, surfaceMode: MobileSurfaceMode): string {
  if (surfaceMode === "telegram") {
    if (authState.telegramBootstrapReason === "telegram_person_not_found") {
      return "Не нашли ваш Telegram-аккаунт в базе дизайнеров. Обратитесь к администратору.";
    }
    if (authState.telegramBootstrapReason === "telegram_person_missing_email") {
      return "В базе дизайнеров для вашего Telegram-аккаунта не заполнен yandexEmail.";
    }
    if (authState.telegramBootstrapReason === "telegram_user_not_found_by_email") {
      return "По yandexEmail из базы дизайнеров не найден пользователь в auth. Сначала войдите в DTM через веб.";
    }
    if (authState.telegramBootstrapReason === "telegram_user_not_linked") {
      return "Telegram-аккаунт ещё не связан с пользователем DTM.";
    }
    if (authState.telegramBootstrap === "linking") {
      return "Проверяем Telegram-вход и связь с дизайнером...";
    }
    return "Для списка задач пока нет подтверждённой связи с дизайнером.";
  }

  if (!authState.authenticated) {
    return "Войдите через Яндекс, чтобы увидеть свои задачи в мобильной версии.";
  }
  return "Эта учётная запись пока не связана с дизайнером DTM. Обратитесь к администратору.";
}

const GROUPING_LABELS: Record<MiniTaskGroupingMode, string> = {
  designer: "Дизайнер",
  brand: "Бренд",
  show: "Шоу",
};

export function MiniAppTasksPage(props: {
  items: MiniTaskListItem[];
  surfaceMode: MobileSurfaceMode;
  canViewAllTasks: boolean;
  unresolvedPersonLink: boolean;
  authState: AuthSessionState;
  onOpenTask: (taskId: string) => void;
}) {
  const groupingOptions: MiniTaskGroupingMode[] = props.canViewAllTasks ? ["designer", "brand", "show"] : ["brand", "show"];
  const [groupingMode, setGroupingMode] = React.useState<MiniTaskGroupingMode>(
    props.canViewAllTasks ? "designer" : "brand"
  );
  const [toggleAllToken, setToggleAllToken] = React.useState(0);

  React.useEffect(() => {
    if (props.canViewAllTasks) return;
    if (groupingMode === "designer") {
      setGroupingMode("brand");
    }
  }, [props.canViewAllTasks, groupingMode]);

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
        {groupingOptions.map((mode) => (
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
        <div className="miniAppNotice">{unresolvedPersonMessage(props.authState, props.surfaceMode)}</div>
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
