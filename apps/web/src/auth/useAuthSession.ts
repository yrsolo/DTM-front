import React from "react";

import { getAdminRoute, getAuthRequestBase } from "../config/runtimeContour";
import { getLocalDevBootstrapToken } from "../config/localDevAuth";
import { getTelegramRuntimeInfo } from "../config/telegramRuntime";

export type AuthSessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  personId?: string | null;
  personName?: string | null;
  telegramId?: string | null;
  telegramUsername?: string | null;
  canViewAllTasks?: boolean | null;
  canUseDesignerGrouping?: boolean | null;
  role: "admin" | "viewer";
  status: "pending" | "approved" | "blocked";
};

export type DevLocalPersona = {
  id: string;
  kind: "guest" | "real_user" | "synthetic_blocked";
  label: string;
  role: "admin" | "viewer" | null;
  status: "pending" | "approved" | "blocked" | "guest";
  email: string | null;
  personName: string | null;
  canViewAllTasks: boolean;
  canUseDesignerGrouping: boolean;
};

export type TelegramBootstrapReason =
  | "telegram_person_not_found"
  | "telegram_person_missing_email"
  | "telegram_user_not_found_by_email"
  | "telegram_user_not_linked"
  | "invalid_init_data"
  | "unknown";

export type TelegramBootstrapState = "idle" | "linking" | "linked" | "unlinked" | "error";

export type AuthSessionState = {
  loading: boolean;
  authenticated: boolean;
  accessMode: "masked" | "full";
  user: AuthSessionUser | null;
  available: boolean;
  sessionKind: "yandex" | "telegram" | "temp_link" | "dev_local" | null;
  expiresAt: string | null;
  temporaryAccessLabel: string | null;
  telegramBootstrap: TelegramBootstrapState;
  telegramBootstrapReason: TelegramBootstrapReason | null;
  pendingAccessLinkBootstrap: boolean;
};

const DEFAULT_STATE: AuthSessionState = {
  loading: false,
  authenticated: false,
  accessMode: "masked",
  user: null,
  available: true,
  sessionKind: null,
  expiresAt: null,
  temporaryAccessLabel: null,
  telegramBootstrap: "idle",
  telegramBootstrapReason: null,
  pendingAccessLinkBootstrap: false,
};

function buildAuthUrl(path: string): string {
  return `${getAuthRequestBase()}${path}`;
}

function readAccessLinkTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  return url.searchParams.get("k")?.trim() || url.searchParams.get("access_link")?.trim() || null;
}

function consumeAccessLinkTokenFromUrl(): string | null {
  const token = readAccessLinkTokenFromUrl();
  if (!token) return null;
  const url = new URL(window.location.href);
  url.searchParams.delete("k");
  url.searchParams.delete("access_link");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  return token;
}

export function useAuthSession() {
  const hasAccessLinkBootstrap = Boolean(readAccessLinkTokenFromUrl());
  const [state, setState] = React.useState<AuthSessionState>(() =>
    ({ ...DEFAULT_STATE, loading: true, available: true, pendingAccessLinkBootstrap: hasAccessLinkBootstrap })
  );
  const redeemedRef = React.useRef(false);

  const reload = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, available: true }));
    try {
      const res = await fetch(buildAuthUrl("/me"), {
        credentials: "include",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        const nextState: AuthSessionState = {
          loading: false,
          authenticated: false,
          accessMode: "masked",
          user: null,
          available: true,
          sessionKind: null,
        expiresAt: null,
        temporaryAccessLabel: null,
        telegramBootstrap: "idle",
        telegramBootstrapReason: null,
        pendingAccessLinkBootstrap: false,
      };
        setState((prev) => ({
          ...prev,
          ...nextState,
        }));
        return nextState;
      }

      const payload = await res.json();
      const nextState: AuthSessionState = {
        loading: false,
        authenticated: Boolean(payload?.authenticated),
        accessMode: payload?.accessMode === "full" ? "full" : "masked",
        user: payload?.user ?? null,
        available: true,
        sessionKind:
          payload?.sessionKind === "yandex" ||
          payload?.sessionKind === "telegram" ||
          payload?.sessionKind === "temp_link" ||
          payload?.sessionKind === "dev_local"
            ? payload.sessionKind
            : null,
        expiresAt: typeof payload?.expiresAt === "string" ? payload.expiresAt : null,
        temporaryAccessLabel: typeof payload?.temporaryAccessLabel === "string" ? payload.temporaryAccessLabel : null,
        telegramBootstrap: payload?.authenticated ? "linked" : "idle",
        telegramBootstrapReason: null,
        pendingAccessLinkBootstrap: false,
      };
      setState((prev) => ({
        ...prev,
        ...nextState,
      }));
      return nextState;
    } catch {
      setState((prev) => ({ ...prev, ...DEFAULT_STATE, pendingAccessLinkBootstrap: false }));
      return DEFAULT_STATE;
    }
  }, []);

  const startTelegramSession = React.useCallback(async () => {
    const runtime = getTelegramRuntimeInfo();
    if (!runtime.isTelegramMiniApp || !runtime.initData) return { ok: false as const, reason: "unknown" as const };

    setState((prev) => ({
      ...prev,
      telegramBootstrap: "linking",
      telegramBootstrapReason: null,
    }));

    try {
      const res = await fetch(buildAuthUrl("/telegram/session"), {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ initData: runtime.initData }),
      });
      if (!res.ok) {
        let reason: TelegramBootstrapReason = "unknown";
        try {
          const payload = await res.json();
          if (typeof payload?.reason === "string") {
            reason = payload.reason as TelegramBootstrapReason;
          }
        } catch {
          // ignore malformed error payload
        }
        setState((prev) => ({
          ...prev,
          telegramBootstrap: reason === "unknown" ? "error" : "unlinked",
          telegramBootstrapReason: reason,
        }));
        return { ok: false as const, reason };
      }
      await reload();
      setState((prev) => ({
        ...prev,
        telegramBootstrap: "linked",
        telegramBootstrapReason: null,
      }));
      return { ok: true as const };
    } catch {
      setState((prev) => ({
        ...prev,
        telegramBootstrap: "error",
        telegramBootstrapReason: "unknown",
      }));
      return { ok: false as const, reason: "unknown" as const };
    }
  }, [reload]);

  React.useEffect(() => {
    void (async () => {
      const accessLinkToken = redeemedRef.current ? null : consumeAccessLinkTokenFromUrl();
      redeemedRef.current = true;
      if (accessLinkToken) {
        try {
          await fetch(buildAuthUrl("/access-links/redeem"), {
            method: "POST",
            credentials: "include",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify({ token: accessLinkToken }),
          });
        } catch {
          // A failed redemption simply falls back to the regular auth/session check.
        }
      }
      const nextState = await reload();
      const runtime = getTelegramRuntimeInfo();
      if (!runtime.isTelegramMiniApp) return;
      if (nextState.authenticated) {
        setState((prev) => ({
          ...prev,
          telegramBootstrap: "linked",
          telegramBootstrapReason: null,
        }));
        return;
      }
      await startTelegramSession();
    })();
  }, [reload, startTelegramSession]);

  const loginHref = React.useMemo(() => {
    const returnTo =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`
        : "/";
    return `${buildAuthUrl("/login")}?return_to=${encodeURIComponent(returnTo)}`;
  }, []);

  const adminHref = React.useMemo(() => getAdminRoute(), []);
  const localDevBootstrapToken = React.useMemo(() => getLocalDevBootstrapToken(), []);

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

  const loadDevCatalog = React.useCallback(async (token: string) => {
    const res = await fetch(buildAuthUrl("/dev/session/catalog"), {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ token }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const error =
        typeof payload?.error === "string"
          ? payload.error
          : typeof payload?.message === "string"
            ? payload.message
            : `HTTP ${res.status}`;
      throw new Error(error);
    }
    return {
      tokenSource:
        payload?.tokenSource === "bootstrap" || payload?.tokenSource === "developer_token"
          ? payload.tokenSource
          : "developer_token",
      personas: Array.isArray(payload?.personas) ? (payload.personas as DevLocalPersona[]) : [],
    };
  }, []);

  const impersonateDevPersona = React.useCallback(
    async (token: string, personaId: string) => {
      const res = await fetch(buildAuthUrl("/dev/session/impersonate"), {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ token, personaId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const error =
          typeof payload?.error === "string"
            ? payload.error
            : typeof payload?.message === "string"
              ? payload.message
              : `HTTP ${res.status}`;
        throw new Error(error);
      }
      await reload();
      return payload;
    },
    [reload]
  );

  const logoutDevSession = React.useCallback(async () => {
    await fetch(buildAuthUrl("/dev/session/logout"), {
      method: "POST",
      credentials: "include",
    });
    await reload();
  }, [reload]);

  return {
    state,
    blockInitialDataLoad: state.pendingAccessLinkBootstrap,
    reload,
    loginHref,
    startLogin,
    adminHref,
    logout,
    startTelegramSession,
    localDevBootstrapToken,
    loadDevCatalog,
    impersonateDevPersona,
    logoutDevSession,
  };
}
