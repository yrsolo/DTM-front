import type { InspectorActivation } from "@dtm/workbench-inspector";

const INSPECTOR_QUERY_KEY = "inspector";
const INSPECTOR_DEBUG_QUERY_KEY = "inspectorDebug";
const INSPECTOR_STORAGE_KEY = "dtm.workbenchInspector.enabled";

function readQueryFlag(): "on" | "off" | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const value = params.get(INSPECTOR_QUERY_KEY)?.trim().toLowerCase();
  if (value === "1" || value === "true" || value === "on") return "on";
  if (value === "0" || value === "false" || value === "off") return "off";
  return null;
}

function readStorageFlag(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(INSPECTOR_STORAGE_KEY) === "1";
}

function readDebugQueryFlag(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const value = params.get(INSPECTOR_DEBUG_QUERY_KEY)?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "on";
}

function syncStorageWithQueryFlag(queryFlag: "on" | "off" | null): boolean {
  if (typeof window === "undefined") return false;
  if (queryFlag === "on") {
    window.localStorage.setItem(INSPECTOR_STORAGE_KEY, "1");
    return true;
  }
  if (queryFlag === "off") {
    window.localStorage.removeItem(INSPECTOR_STORAGE_KEY);
    return false;
  }
  return readStorageFlag();
}

export function getWorkbenchInspectorActivation(): InspectorActivation {
  if (!import.meta.env.DEV) {
    return { enabled: false, source: "disabled" };
  }

  const queryFlag = readQueryFlag();
  const enabled = syncStorageWithQueryFlag(queryFlag);
  const debug = readDebugQueryFlag();

  if (!enabled) {
    return { enabled: false, source: "disabled" };
  }

  return {
    enabled: true,
    debug,
    source: queryFlag === "on" ? "query" : "storage",
  };
}
