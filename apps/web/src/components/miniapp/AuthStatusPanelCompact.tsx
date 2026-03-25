import { AuthSessionState } from "../../auth/useAuthSession";
import { getTelegramRuntimeInfo } from "../../config/telegramRuntime";
import type { MobileSurfaceMode } from "../../pages/MiniAppPage";

function telegramBootstrapMessage(state: AuthSessionState): string | null {
  if (state.telegramBootstrap === "linking") {
    return "Проверяем Telegram-вход и связь с пользователем DTM...";
  }
  if (state.telegramBootstrapReason === "telegram_person_not_found") {
    return "Telegram-аккаунт не найден в базе дизайнеров.";
  }
  if (state.telegramBootstrapReason === "telegram_person_missing_email") {
    return "Для этого Telegram-аккаунта в базе дизайнеров не заполнен yandexEmail.";
  }
  if (state.telegramBootstrapReason === "telegram_user_not_found_by_email") {
    return "По yandexEmail из базы дизайнеров не найден пользователь в auth.";
  }
  if (state.telegramBootstrapReason === "telegram_user_not_linked") {
    return "Telegram-аккаунт пока не связан с пользователем DTM.";
  }
  if (state.telegramBootstrapReason === "invalid_init_data") {
    return "Telegram WebApp передал невалидные данные входа.";
  }
  if (state.telegramBootstrap === "error") {
    return "Не удалось проверить Telegram-вход. Попробуйте повторить проверку.";
  }
  return null;
}

function formatSessionCountdown(value: string | null): string | null {
  if (!value) return null;
  const expiresAt = new Date(value);
  if (!Number.isFinite(expiresAt.getTime())) return null;
  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) return "Истекла";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} д ${hours} ч`;
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  return `${Math.max(1, minutes)} мин`;
}

function statusLabel(state: AuthSessionState): string {
  const user = state.user;
  if (!state.authenticated || !user) return "Гость";
  if (state.sessionKind === "temp_link") return "Временный доступ";
  if (user.role === "admin") return "Администратор";
  if (user.status === "pending") return "Ожидает одобрения";
  if (user.status === "blocked") return "Заблокирован";
  return "Пользователь";
}

export function AuthStatusPanelCompact(props: {
  surfaceMode: MobileSurfaceMode;
  authState: AuthSessionState;
  onLogin: () => void;
  onLogout: () => void;
  onReload: () => void;
  onOpenAdmin: () => void;
}) {
  const user = props.authState.user;
  const telegramMessage = props.surfaceMode === "telegram" ? telegramBootstrapMessage(props.authState) : null;
  const runtimeInfo = getTelegramRuntimeInfo();
  const countdown = props.authState.sessionKind === "temp_link"
    ? formatSessionCountdown(props.authState.expiresAt)
    : null;

  return (
    <div className="miniAppProfileCard">
      <div className="miniAppProfileName">{user?.displayName || user?.email || "Гость"}</div>
      <div className="miniAppProfileMeta">
        Статус: {statusLabel(props.authState)} • Доступ: {props.authState.accessMode}
      </div>
      {user?.personName ? <div className="miniAppProfileMeta">Дизайнер: {user.personName}</div> : null}
      {props.authState.sessionKind ? (
        <div className="miniAppProfileMeta">Сессия: {props.authState.sessionKind}</div>
      ) : null}
      {props.authState.temporaryAccessLabel ? (
        <div className="miniAppProfileMeta">Метка ссылки: {props.authState.temporaryAccessLabel}</div>
      ) : null}
      {countdown ? <div className="miniAppProfileMeta">До окончания: {countdown}</div> : null}
      {props.surfaceMode === "telegram" ? (
        <>
          <div className="miniAppProfileMeta">Telegram runtime: {runtimeInfo.runtimeDetected ? "detected" : "not detected"}</div>
          <div className="miniAppProfileMeta">Telegram initData: {runtimeInfo.initDataPresent ? "present" : "missing"}</div>
          <div className="miniAppProfileMeta">Telegram WebApp ID: {runtimeInfo.telegramUserId ?? "not detected"}</div>
          {user?.telegramId ? <div className="miniAppProfileMeta">Telegram ID в auth: {user.telegramId}</div> : null}
          {user?.telegramUsername ? <div className="miniAppProfileMeta">Telegram: @{user.telegramUsername}</div> : null}
        </>
      ) : (
        <div className="miniAppProfileMeta">Режим: мобильный веб с авторизацией через Яндекс</div>
      )}
      {telegramMessage ? <div className="miniAppNotice">{telegramMessage}</div> : null}
      <div className="miniAppActionRow">
        {props.authState.authenticated ? (
          <button type="button" className="miniAppButton" onClick={props.onLogout}>Выйти</button>
        ) : (
          <button type="button" className="miniAppButton" onClick={props.onLogin}>Войти через Яндекс</button>
        )}
        <button type="button" className="miniAppButton miniAppButtonGhost" onClick={props.onReload}>Обновить</button>
        {user?.role === "admin" ? (
          <button type="button" className="miniAppButton miniAppButtonGhost" onClick={props.onOpenAdmin}>Админка</button>
        ) : null}
      </div>
    </div>
  );
}
