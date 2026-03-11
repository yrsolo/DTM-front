export type RuntimeContour = "test" | "prod";
const REMOTE_RUNTIME_ORIGIN = "https://dtm.solofarm.ru";

function currentPathname(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

export function isLocalFrontendRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local")
  );
}

export function getRuntimeContour(pathname = currentPathname()): RuntimeContour {
  if (isLocalFrontendRuntime()) {
    return "test";
  }
  const path = pathname.toLowerCase();
  if (path === "/test" || path.startsWith("/test/")) {
    return "test";
  }
  return "prod";
}

export function getFrontendBasePath(pathname = currentPathname()): string {
  if (isLocalFrontendRuntime()) {
    return "/";
  }
  return getRuntimeContour(pathname) === "test" ? "/test/" : "/";
}

export function getAuthBasePath(pathname = currentPathname()): string {
  return getRuntimeContour(pathname) === "test" ? "/test/auth" : "/auth";
}

export function getApiProxyBasePath(pathname = currentPathname()): string {
  return getRuntimeContour(pathname) === "test" ? "/test/api" : "/api";
}

export function getAdminRoute(pathname = currentPathname()): string {
  if (isLocalFrontendRuntime()) {
    return "/admin";
  }
  return getRuntimeContour(pathname) === "test" ? "/test/admin" : "/admin";
}

export function getTasksRoute(pathname = currentPathname()): string {
  if (isLocalFrontendRuntime()) {
    return "/";
  }
  return getRuntimeContour(pathname) === "test" ? "/test/" : "/";
}

export function getRuntimeOrigin(pathname = currentPathname()): string {
  if (typeof window === "undefined") return REMOTE_RUNTIME_ORIGIN;
  return isLocalFrontendRuntime() ? REMOTE_RUNTIME_ORIGIN : window.location.origin;
}

export function getAuthRequestBase(pathname = currentPathname()): string {
  return `${getRuntimeOrigin(pathname)}${getAuthBasePath(pathname)}`;
}

export function getApiProxyRequestBase(pathname = currentPathname()): string {
  return `${getRuntimeOrigin(pathname)}${getApiProxyBasePath(pathname)}`;
}
