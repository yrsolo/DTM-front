import React from "react";

import { getAdminRoute, getAuthRequestBase } from "../config/runtimeContour";

export type AuthSessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  role: "admin" | "viewer";
  status: "pending" | "approved" | "blocked";
};

export type AuthSessionState = {
  loading: boolean;
  authenticated: boolean;
  accessMode: "masked" | "full";
  user: AuthSessionUser | null;
  available: boolean;
};

const DEFAULT_STATE: AuthSessionState = {
  loading: false,
  authenticated: false,
  accessMode: "masked",
  user: null,
  available: true,
};

function buildAuthUrl(path: string): string {
  return `${getAuthRequestBase()}${path}`;
}

export function useAuthSession() {
  const [state, setState] = React.useState<AuthSessionState>(() =>
    ({ ...DEFAULT_STATE, loading: true, available: true })
  );

  const reload = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, available: true }));
    try {
      const res = await fetch(buildAuthUrl("/me"), {
        credentials: "include",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        setState({
          loading: false,
          authenticated: false,
          accessMode: "masked",
          user: null,
          available: true,
        });
        return;
      }

      const payload = await res.json();
      setState({
        loading: false,
        authenticated: Boolean(payload?.authenticated),
        accessMode: payload?.accessMode === "full" ? "full" : "masked",
        user: payload?.user ?? null,
        available: true,
      });
    } catch {
      setState(DEFAULT_STATE);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const loginHref = React.useMemo(() => {
    const returnTo =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`
        : "/";
    return `${buildAuthUrl("/login")}?return_to=${encodeURIComponent(returnTo)}`;
  }, []);

  const adminHref = React.useMemo(() => getAdminRoute(), []);

  const startLogin = React.useCallback(async () => {
    if (typeof window === "undefined") return;
    const popupUrl = `${loginHref}${loginHref.includes("?") ? "&" : "?"}popup=1`;
    const popup = window.open(
      popupUrl,
      "dtm-auth",
      "popup=yes,width=560,height=760,resizable=yes,scrollbars=yes"
    );

    if (!popup) {
      window.location.assign(loginHref);
      return;
    }

    popup.focus();

    await new Promise<void>((resolve) => {
      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("message", onMessage);
        window.clearInterval(closeWatcher);
        window.clearTimeout(timeoutId);
      };

      const finish = () => {
        cleanup();
        resolve();
      };

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || typeof event.data !== "object") return;
        if ((event.data as { type?: string }).type !== "dtm-auth-complete") return;
        finish();
      };

      const closeWatcher = window.setInterval(() => {
        if (popup.closed) {
          finish();
        }
      }, 400);

      const timeoutId = window.setTimeout(() => {
        finish();
      }, 5 * 60 * 1000);

      window.addEventListener("message", onMessage);
    });

    await reload();
  }, [loginHref, reload]);

  const logout = React.useCallback(async () => {
    await fetch(buildAuthUrl("/logout"), {
      method: "POST",
      credentials: "include",
    });
    await reload();
  }, [reload]);

  return {
    state,
    reload,
    loginHref,
    startLogin,
    adminHref,
    logout,
  };
}
