export type RuntimeContour = "test" | "prod";

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
  const path = pathname.toLowerCase();
  if (path === "/test-front" || path.startsWith("/test-front/")) {
    return "test";
  }
  return "prod";
}

export function getFrontendBasePath(pathname = currentPathname()): string {
  return getRuntimeContour(pathname) === "test" ? "/test-front/" : "/";
}

export function getAuthBasePath(pathname = currentPathname()): string {
  return getRuntimeContour(pathname) === "test" ? "/test/auth" : "/prod/auth";
}

export function getApiProxyBasePath(pathname = currentPathname()): string {
  return getRuntimeContour(pathname) === "test" ? "/test/api" : "/prod/api";
}

export function getAdminRoute(pathname = currentPathname()): string {
  return getRuntimeContour(pathname) === "test" ? "/test-front/admin" : "/admin";
}

export function getTasksRoute(pathname = currentPathname()): string {
  return getRuntimeContour(pathname) === "test" ? "/test-front/" : "/";
}
