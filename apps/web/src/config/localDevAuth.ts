import { isLocalFrontendRuntime } from "./runtimeContour";

const LOCAL_DEV_BOOTSTRAP_TOKEN =
  typeof import.meta !== "undefined" && typeof import.meta.env?.VITE_LOCAL_DEV_AUTH_TOKEN === "string"
    ? import.meta.env.VITE_LOCAL_DEV_AUTH_TOKEN.trim() || null
    : null;

export function canUseLocalDevAuthUi(): boolean {
  return isLocalFrontendRuntime();
}

export function getLocalDevBootstrapToken(): string | null {
  return canUseLocalDevAuthUi() ? LOCAL_DEV_BOOTSTRAP_TOKEN : null;
}
