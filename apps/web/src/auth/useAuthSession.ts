import React from "react";

import { getAdminRoute, getAuthBasePath, isLocalFrontendRuntime } from "../config/runtimeContour";

export type AuthSessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
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
  available: false,
};

function buildAuthUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${getAuthBasePath()}${path}`;
}

export function useAuthSession() {
  const [state, setState] = React.useState<AuthSessionState>(() =>
    isLocalFrontendRuntime()
      ? DEFAULT_STATE
      : { ...DEFAULT_STATE, loading: true, available: true }
  );

  const reload = React.useCallback(async () => {
    if (isLocalFrontendRuntime()) {
      setState(DEFAULT_STATE);
      return;
    }

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
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : "/";
    return `${buildAuthUrl("/login")}?return_to=${encodeURIComponent(returnTo)}`;
  }, []);

  const adminHref = React.useMemo(() => getAdminRoute(), []);

  const logout = React.useCallback(async () => {
    if (isLocalFrontendRuntime()) return;
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
    adminHref,
    logout,
  };
}
