import { AuthSessionState } from "../auth/useAuthSession";
import { AuthStatusPanelCompact } from "../components/miniapp/AuthStatusPanelCompact";
import type { MobileSurfaceMode } from "./MiniAppPage";

export function MiniAppProfilePage(props: {
  surfaceMode: MobileSurfaceMode;
  authState: AuthSessionState;
  onLogin: () => void;
  onLogout: () => void;
  onReload: () => void;
  onOpenAdmin: () => void;
}) {
  return (
    <div className="miniAppSection">
      <AuthStatusPanelCompact
        surfaceMode={props.surfaceMode}
        authState={props.authState}
        onLogin={props.onLogin}
        onLogout={props.onLogout}
        onReload={props.onReload}
        onOpenAdmin={props.onOpenAdmin}
      />
    </div>
  );
}
