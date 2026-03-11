import { getAuthRuntimeConfig } from "../config";
import type { YandexProfile } from "../types";

export function getYandexRedirectUri(): string {
  const cfg = getAuthRuntimeConfig();
  return `${cfg.baseUrl}${cfg.authBasePath}/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const cfg = getAuthRuntimeConfig();
  const url = new URL("https://oauth.yandex.ru/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.yandexClientId);
  url.searchParams.set("redirect_uri", getYandexRedirectUri());
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCode(code: string): Promise<{ access_token: string }> {
  const cfg = getAuthRuntimeConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: cfg.yandexClientId,
    client_secret: cfg.yandexClientSecret,
  });

  const res = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Yandex token exchange failed with HTTP ${res.status}`);
  }

  return (await res.json()) as { access_token: string };
}

export async function fetchProfile(accessToken: string): Promise<YandexProfile> {
  const res = await fetch("https://login.yandex.ru/info?format=json", {
    headers: {
      accept: "application/json",
      authorization: `OAuth ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Yandex profile fetch failed with HTTP ${res.status}`);
  }

  return (await res.json()) as YandexProfile;
}
