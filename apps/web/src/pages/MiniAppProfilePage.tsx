import { AuthStatusPanelCompact } from "../components/miniapp/AuthStatusPanelCompact";
import { AuthSessionState } from "../auth/useAuthSession";

export function MiniAppProfilePage(props: {
  authState: AuthSessionState;
  onLogin: () => void;
  onLogout: () => void;
  onReload: () => void;
  onOpenAdmin: () => void;
}) {
  return (
    <div className="miniAppSection">
      <AuthStatusPanelCompact
        authState={props.authState}
        onLogin={props.onLogin}
        onLogout={props.onLogout}
        onReload={props.onReload}
        onOpenAdmin={props.onOpenAdmin}
      />
    </div>
  );
}
