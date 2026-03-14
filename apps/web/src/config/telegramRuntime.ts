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

export function getTelegramRuntimeInfo(): TelegramRuntimeInfo {
  const webApp = readTelegramWebApp();
  const initData = typeof webApp?.initData === "string" ? webApp.initData : "";
  const rawTelegramUserId = webApp?.initDataUnsafe?.user?.id;
  const telegramUserId =
    typeof rawTelegramUserId === "number" && Number.isFinite(rawTelegramUserId)
      ? String(Math.trunc(rawTelegramUserId))
      : null;
  const isTelegramMiniApp = Boolean(webApp && initData);
  return {
    isTelegramMiniApp,
    presentationMode: isTelegramMiniApp ? "telegramMiniApp" : "desktop",
    initData,
    telegramUserId,
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
