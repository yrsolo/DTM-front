import { AuthSessionState } from "../../auth/useAuthSession";

export function AuthStatusPanelCompact(props: {
  authState: AuthSessionState;
  onLogin: () => void;
  onLogout: () => void;
  onReload: () => void;
  onOpenAdmin: () => void;
}) {
  const user = props.authState.user;
  return (
    <div className="miniAppProfileCard">
      <div className="miniAppProfileName">{user?.displayName || user?.email || "Гость"}</div>
      <div className="miniAppProfileMeta">
        Статус: {user?.status ?? "guest"} • Доступ: {props.authState.accessMode}
      </div>
      {user?.personName ? <div className="miniAppProfileMeta">Дизайнер: {user.personName}</div> : null}
      {user?.telegramUsername ? <div className="miniAppProfileMeta">Telegram: @{user.telegramUsername}</div> : null}
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
