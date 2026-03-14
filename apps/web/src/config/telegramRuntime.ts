export type AppPresentationMode = "desktop" | "telegramMiniApp";

type TelegramWebAppLike = {
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id?: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
  ready?: () => void;
  expand?: () => void;
};

export type TelegramRuntimeInfo = {
  isTelegramMiniApp: boolean;
  presentationMode: AppPresentationMode;
  initData: string;
  telegramUserId: string | null;
  initDataPresent: boolean;
  runtimeDetected: boolean;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebAppLike;
    };
  }
}

function readTelegramWebApp(): TelegramWebAppLike | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

function decodeTelegramValue(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, "%20"));
}

function readTelegramUserIdFromInitData(initData: string): string | null {
  if (!initData) return null;
  for (const part of initData.split("&")) {
    if (!part) continue;
    const [rawKey, rawValue = ""] = part.split("=");
    const key = decodeTelegramValue(rawKey);
    if (key !== "user") continue;
    const value = decodeTelegramValue(rawValue);
    try {
      const parsed = JSON.parse(value) as { id?: number | string };
      if (typeof parsed.id === "number" && Number.isFinite(parsed.id)) {
        return String(Math.trunc(parsed.id));
      }
      if (typeof parsed.id === "string" && parsed.id.trim()) {
        return parsed.id.trim();
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function getTelegramRuntimeInfo(): TelegramRuntimeInfo {
  const webApp = readTelegramWebApp();
  const initData = typeof webApp?.initData === "string" ? webApp.initData : "";
  const rawTelegramUserId = webApp?.initDataUnsafe?.user?.id;
  const telegramUserId =
    (typeof rawTelegramUserId === "number" && Number.isFinite(rawTelegramUserId)
      ? String(Math.trunc(rawTelegramUserId))
      : null) ?? readTelegramUserIdFromInitData(initData);
  const initDataPresent = Boolean(initData);
  const runtimeDetected = Boolean(webApp);
  const isTelegramMiniApp = Boolean(webApp && initData);
  return {
    isTelegramMiniApp,
    presentationMode: isTelegramMiniApp ? "telegramMiniApp" : "desktop",
    initData,
    telegramUserId,
    initDataPresent,
    runtimeDetected,
  };
}

export function initTelegramMiniApp(): TelegramRuntimeInfo {
  const webApp = readTelegramWebApp();
  if (webApp) {
    webApp.ready?.();
    webApp.expand?.();
  }
  return getTelegramRuntimeInfo();
}
