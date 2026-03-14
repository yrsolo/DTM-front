import { AuthSessionState } from "../../auth/useAuthSession";

function telegramBootstrapMessage(state: AuthSessionState): string | null {
  if (state.telegramBootstrap === "linking") {
    return "Проверяем Telegram-вход и связь с пользователем DTM...";
  }
  if (state.telegramBootstrapReason === "telegram_person_not_found") {
    return "Telegram аккаунт не найден в базе дизайнеров.";
  }
  if (state.telegramBootstrapReason === "telegram_person_missing_email") {
    return "Для этого Telegram аккаунта в базе дизайнеров не заполнен yandexEmail.";
  }
  if (state.telegramBootstrapReason === "telegram_user_not_found_by_email") {
    return "По yandexEmail из базы дизайнеров не найден пользователь в auth.";
  }
  if (state.telegramBootstrapReason === "telegram_user_not_linked") {
    return "Telegram аккаунт пока не связан с пользователем DTM.";
  }
  if (state.telegramBootstrapReason === "invalid_init_data") {
    return "Telegram WebApp передал невалидные данные входа.";
  }
  if (state.telegramBootstrap === "error") {
    return "Не удалось проверить Telegram-вход. Попробуйте повторить проверку.";
  }
  return null;
}

export function AuthStatusPanelCompact(props: {
  authState: AuthSessionState;
  onLogin: () => void;
  onLogout: () => void;
  onReload: () => void;
  onOpenAdmin: () => void;
}) {
  const user = props.authState.user;
  const telegramMessage = telegramBootstrapMessage(props.authState);

  return (
    <div className="miniAppProfileCard">
      <div className="miniAppProfileName">{user?.displayName || user?.email || "Гость"}</div>
      <div className="miniAppProfileMeta">
        Статус: {user?.status ?? "guest"} • Доступ: {props.authState.accessMode}
      </div>
      {user?.personName ? <div className="miniAppProfileMeta">Дизайнер: {user.personName}</div> : null}
      {user?.telegramUsername ? <div className="miniAppProfileMeta">Telegram: @{user.telegramUsername}</div> : null}
      {telegramMessage ? <div className="miniAppNotice">{telegramMessage}</div> : null}
      <div className="miniAppActionRow">
        {props.authState.authenticated ? (
          <button type="button" className="miniAppButton" onClick={props.onLogout}>Выйти</button>
        ) : (
          <button type="button" className="miniAppButton" onClick={props.onLogin}>Войти</button>
        )}
        <button type="button" className="miniAppButton miniAppButtonGhost" onClick={props.onReload}>Обновить</button>
        {user?.role === "admin" ? (
          <button type="button" className="miniAppButton miniAppButtonGhost" onClick={props.onOpenAdmin}>Админка</button>
        ) : null}
      </div>
    </div>
  );
}
