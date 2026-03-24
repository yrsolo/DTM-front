import { getAuthRequestBase } from "./runtimeContour";

let telegramSdkPromise: Promise<void> | null = null;

export function getTelegramSdkUrl(): string {
  return `${getAuthRequestBase()}/telegram/sdk`;
}

export function ensureTelegramSdkLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Telegram?.WebApp) return Promise.resolve();
  if (telegramSdkPromise) return telegramSdkPromise;

  telegramSdkPromise = new Promise<void>((resolve, reject) => {
    const src = getTelegramSdkUrl();
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error(`Failed to load Telegram SDK: ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load Telegram SDK: ${src}`));
    document.head.appendChild(script);
  }).catch((error) => {
    telegramSdkPromise = null;
    throw error;
  });

  return telegramSdkPromise;
}
