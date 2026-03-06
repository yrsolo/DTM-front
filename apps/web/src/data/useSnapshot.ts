import { SnapshotV1 } from "@dtm/schema/snapshot";
import React from "react";
import {
  ApiWindowFilter,
  ApiStatusFilter,
  fetchApiSnapshotWithMeta,
  fetchDemoSnapshot,
  fetchLocalSnapshot,
  isApiConfigured,
} from "./api";
import { loadPublicConfig } from "../config/publicConfig";
import { normalizeToSnapshotV1 } from "./normalize";
import {
  DEFAULT_RUNTIME_DEFAULTS,
  RuntimeDefaults,
  normalizeRuntimeDefaults,
} from "./runtimeDefaults";

type SnapshotStatus = "cold_loading" | "ready" | "refreshing" | "stale_error";

type PersistedMeta = {
  generatedAt?: string;
  savedAt?: string;
  source?: "local" | "api" | "demo";
  etag?: string | null;
  lastRefreshAttemptAt?: string;
};

const LOCAL_RAW_SNAPSHOT_STORAGE_KEY = "dtm.web.localSnapshotRaw.v1";
const PERSISTED_SNAPSHOT_STORAGE_KEY = "dtm.snapshot.v1";
const PERSISTED_META_STORAGE_KEY = "dtm.snapshot.meta";
let memorySnapshot: SnapshotV1 | null = null;
let memoryMeta: PersistedMeta | null = null;

function readPersisted(): { snapshot: SnapshotV1 | null; meta: PersistedMeta | null } {
  try {
    const rawSnapshot = localStorage.getItem(PERSISTED_SNAPSHOT_STORAGE_KEY);
    const rawMeta = localStorage.getItem(PERSISTED_META_STORAGE_KEY);
    return {
      snapshot: rawSnapshot ? (JSON.parse(rawSnapshot) as SnapshotV1) : null,
      meta: rawMeta ? (JSON.parse(rawMeta) as PersistedMeta) : null,
    };
  } catch {
    return { snapshot: null, meta: null };
  }
}

function persistSnapshot(snapshot: SnapshotV1, meta: PersistedMeta) {
  memorySnapshot = snapshot;
  memoryMeta = meta;
  localStorage.setItem(PERSISTED_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  localStorage.setItem(PERSISTED_META_STORAGE_KEY, JSON.stringify(meta));
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultDateFilter(): ApiWindowFilter {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 2);
  const end = new Date(now);
  end.setMonth(end.getMonth() + 2);
  return {
    enabled: false,
    start: toIsoDate(start),
    end: toIsoDate(end),
  };
}

function defaultStatusFilter(): ApiStatusFilter {
  return {
    work: true,
    preDone: true,
    done: false,
    wait: false,
  };
}

function readDateFilterOverride(): ApiWindowFilter {
  return defaultDateFilter();
}

function readStatusFilterOverride(): ApiStatusFilter {
  return defaultStatusFilter();
}

export function useSnapshot(initialRuntimeDefaults?: Partial<RuntimeDefaults>) {
  const runtimeDefaultsRef = React.useRef<RuntimeDefaults>(
    normalizeRuntimeDefaults(initialRuntimeDefaults ?? DEFAULT_RUNTIME_DEFAULTS)
  );
  const runtimeDefaults = runtimeDefaultsRef.current;
  const initialSnapshot = memorySnapshot;
  const initialMeta = memoryMeta;

  const [snapshot, setSnapshot] = React.useState<SnapshotV1 | null>(initialSnapshot);
  const [status, setStatus] = React.useState<SnapshotStatus>(initialSnapshot ? "ready" : "cold_loading");
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<string | null>(
    initialMeta?.savedAt ?? initialSnapshot?.meta.generatedAt ?? null
  );
  const [lastRefreshAttemptAt, setLastRefreshAttemptAt] = React.useState<string | null>(
    initialMeta?.lastRefreshAttemptAt ?? null
  );
  const [lastError, setLastError] = React.useState<unknown>(null);
  const [refreshIntervalMs, setRefreshIntervalMsState] = React.useState<number>(
    runtimeDefaults.refreshIntervalSec * 1000
  );
  const [loadLimit, setLoadLimitState] = React.useState<number>(runtimeDefaults.loadLimit);
  const [demoMode, setDemoModeState] = React.useState<boolean>(runtimeDefaults.demoMode);
  const [dateFilter, setDateFilterState] = React.useState<ApiWindowFilter>(() => ({
    ...defaultDateFilter(),
    enabled: runtimeDefaults.dateFilterEnabled,
  }));
  const [statusFilter, setStatusFilterState] = React.useState<ApiStatusFilter>(() => ({
    ...defaultStatusFilter(),
    work: runtimeDefaults.statusWork,
    preDone: runtimeDefaults.statusPreDone,
    done: runtimeDefaults.statusDone,
    wait: runtimeDefaults.statusWait,
  }));

  const snapshotRef = React.useRef<SnapshotV1 | null>(snapshot);
  React.useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const loadDemo = React.useCallback(async () => {
    const attemptAt = new Date().toISOString();
    const hasData = Boolean(snapshotRef.current ?? memorySnapshot);
    setLastRefreshAttemptAt(attemptAt);
    setLastError(null);
    setStatus(hasData ? "refreshing" : "cold_loading");
    try {
      const raw = await fetchDemoSnapshot();
      const normalized = normalizeToSnapshotV1(raw);
      const savedAt = new Date().toISOString();
      setSnapshot(normalized);
      setLastUpdatedAt(savedAt);
      setStatus("ready");
      memorySnapshot = normalized;
      memoryMeta = {
        generatedAt: normalized.meta.generatedAt,
        savedAt,
        source: "demo",
        etag: null,
        lastRefreshAttemptAt: attemptAt,
      };
    } catch (error) {
      setLastError(error);
      setStatus(hasData ? "stale_error" : "cold_loading");
    }
  }, []);

  const refreshFromApi = React.useCallback(async (opts?: { manual?: boolean; ignoreDemoMode?: boolean }) => {
    if (demoMode && !opts?.ignoreDemoMode) {
      await loadDemo();
      return;
    }
    const hasData = Boolean(snapshotRef.current ?? memorySnapshot);
    const attemptAt = new Date().toISOString();
    setLastRefreshAttemptAt(attemptAt);
    setLastError(null);
    setStatus(hasData ? "refreshing" : "cold_loading");

    if (!opts?.manual) {
      const apiOn = await isApiConfigured();
      if (!apiOn) {
        setStatus(hasData ? "ready" : "cold_loading");
        return;
      }
    }

    try {
      const currentMeta = memoryMeta;
      const apiStatusFilterAll: ApiStatusFilter = {
        work: true,
        preDone: true,
        done: true,
        wait: true,
      };
      const { payload, etag, notModified } = await fetchApiSnapshotWithMeta(
        currentMeta?.etag ?? null,
        dateFilter,
        apiStatusFilterAll,
        loadLimit
      );
      const nowIso = new Date().toISOString();

      if (notModified) {
        const mergedMeta: PersistedMeta = {
          generatedAt: currentMeta?.generatedAt ?? snapshotRef.current?.meta.generatedAt,
          savedAt: currentMeta?.savedAt ?? nowIso,
          source: currentMeta?.source ?? "api",
          etag: etag ?? currentMeta?.etag ?? null,
          lastRefreshAttemptAt: attemptAt,
        };

        if (memorySnapshot) {
          persistSnapshot(memorySnapshot, mergedMeta);
        } else {
          memoryMeta = mergedMeta;
          localStorage.setItem(PERSISTED_META_STORAGE_KEY, JSON.stringify(mergedMeta));
        }
        setStatus("ready");
        return;
      }

      if (!payload) {
        throw new Error("API returned empty snapshot payload");
      }

      const normalized = normalizeToSnapshotV1(payload);
      const savedAt = nowIso;

      persistSnapshot(normalized, {
        generatedAt: normalized.meta.generatedAt,
        savedAt,
        source: "api",
        etag,
        lastRefreshAttemptAt: attemptAt,
      });
      localStorage.setItem(LOCAL_RAW_SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));

      setSnapshot(normalized);
      setLastUpdatedAt(savedAt);
      setStatus("ready");
    } catch (error) {
      setLastError(error);
      setStatus(hasData ? "stale_error" : "cold_loading");
    }
  }, [dateFilter, loadLimit, demoMode, loadDemo]);

  const reloadLocal = React.useCallback(async (opts?: { ignoreDemoMode?: boolean }) => {
    if (demoMode && !opts?.ignoreDemoMode) {
      await loadDemo();
      return;
    }
    const attemptAt = new Date().toISOString();
    const hasData = Boolean(snapshotRef.current ?? memorySnapshot);
    setLastRefreshAttemptAt(attemptAt);
    setLastError(null);
    setStatus(hasData ? "refreshing" : "cold_loading");

    try {
      const fromStorage = localStorage.getItem(LOCAL_RAW_SNAPSHOT_STORAGE_KEY);
      const raw = fromStorage ? JSON.parse(fromStorage) : await fetchLocalSnapshot();
      const normalized = normalizeToSnapshotV1(raw);
      const savedAt = new Date().toISOString();

      persistSnapshot(normalized, {
        generatedAt: normalized.meta.generatedAt,
        savedAt,
        source: "local",
        etag: null,
        lastRefreshAttemptAt: attemptAt,
      });

      setSnapshot(normalized);
      setLastUpdatedAt(savedAt);
      setStatus("ready");
    } catch (error) {
      setLastError(error);
      setStatus(hasData ? "stale_error" : "cold_loading");
    }
  }, [demoMode, loadDemo]);

  const syncFromApi = React.useCallback(async () => {
    await refreshFromApi({ manual: true });
  }, [refreshFromApi]);

  const setRefreshIntervalMs = React.useCallback((next: number) => {
    const normalized = Math.max(0, next);
    setRefreshIntervalMsState(normalized);
  }, []);

  const setLoadLimit = React.useCallback((next: number) => {
    const normalized = Math.max(1, Math.min(1000, Math.floor(next || 30)));
    setLoadLimitState(normalized);
  }, []);

  const setDemoMode = React.useCallback(async (next: boolean) => {
    setDemoModeState(next);
    if (next) {
      await loadDemo();
      return;
    }
    const cfg = await loadPublicConfig();
    if (cfg.apiBaseUrl) {
      await refreshFromApi({ manual: false, ignoreDemoMode: true });
    } else {
      await reloadLocal({ ignoreDemoMode: true });
    }
  }, [loadDemo, refreshFromApi, reloadLocal]);

  const toggleDemoMode = React.useCallback(async () => {
    await setDemoMode(!demoMode);
  }, [demoMode, setDemoMode]);

  const setDateFilter = React.useCallback((next: ApiWindowFilter) => {
    setDateFilterState(next);
  }, []);

  const setStatusFilter = React.useCallback((next: ApiStatusFilter) => {
    setStatusFilterState(next);
  }, []);

  const resetRuntimeDefaults = React.useCallback(async () => {
    const nextDateFilter = {
      ...defaultDateFilter(),
      enabled: DEFAULT_RUNTIME_DEFAULTS.dateFilterEnabled,
    };
    const nextStatusFilter = {
      work: DEFAULT_RUNTIME_DEFAULTS.statusWork,
      preDone: DEFAULT_RUNTIME_DEFAULTS.statusPreDone,
      done: DEFAULT_RUNTIME_DEFAULTS.statusDone,
      wait: DEFAULT_RUNTIME_DEFAULTS.statusWait,
    };
    const nextLoadLimit = DEFAULT_RUNTIME_DEFAULTS.loadLimit;
    const nextDemoMode = DEFAULT_RUNTIME_DEFAULTS.demoMode;
    const nextRefreshInterval = DEFAULT_RUNTIME_DEFAULTS.refreshIntervalSec * 1000;

    setRefreshIntervalMsState(nextRefreshInterval);
    setLoadLimitState(nextLoadLimit);
    setDateFilterState(nextDateFilter);
    setStatusFilterState(nextStatusFilter);

    if (demoMode !== nextDemoMode) {
      await setDemoMode(nextDemoMode);
      return;
    }
    if (nextDemoMode) {
      await loadDemo();
    }
  }, [demoMode, loadDemo, setDemoMode]);

  React.useEffect(() => {
    let active = true;

    void (async () => {
      const cfg = await loadPublicConfig();
      const overrideInterval = runtimeDefaults.refreshIntervalSec * 1000;
      const overrideLoadLimit = runtimeDefaults.loadLimit;
      const overrideDemoMode = runtimeDefaults.demoMode;
      const overrideDateFilter = {
        ...readDateFilterOverride(),
        enabled: runtimeDefaults.dateFilterEnabled,
      };
      const overrideStatusFilter = {
        ...readStatusFilterOverride(),
        work: runtimeDefaults.statusWork,
        preDone: runtimeDefaults.statusPreDone,
        done: runtimeDefaults.statusDone,
        wait: runtimeDefaults.statusWait,
      };
      const initialInterval = overrideInterval;
      if (active) {
        setRefreshIntervalMsState(initialInterval);
        setLoadLimitState(overrideLoadLimit);
        setDemoModeState(overrideDemoMode);
        setDateFilterState(overrideDateFilter);
        setStatusFilterState(overrideStatusFilter);
      }

      if (!active) return;
      if (overrideDemoMode) {
        await loadDemo();
        return;
      }

      if (!memorySnapshot) {
        const persisted = readPersisted();
        if (!active) return;

        if (persisted.snapshot) {
          memorySnapshot = persisted.snapshot;
          memoryMeta = persisted.meta;
          setSnapshot(persisted.snapshot);
          setLastUpdatedAt(persisted.meta?.savedAt ?? persisted.snapshot.meta.generatedAt);
          setLastRefreshAttemptAt(persisted.meta?.lastRefreshAttemptAt ?? null);
          setStatus("ready");
        } else {
          setStatus("cold_loading");
        }
      }

      if (!active) return;
      const apiOn = Boolean(cfg.apiBaseUrl);
      if (apiOn) {
        await refreshFromApi({ manual: false });
      } else if (!memorySnapshot && !snapshotRef.current) {
        await reloadLocal();
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (demoMode || refreshIntervalMs <= 0) return;

    const timer = window.setInterval(() => {
      void refreshFromApi({ manual: false });
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [refreshIntervalMs, refreshFromApi, demoMode]);

  const isLoading = status === "cold_loading";
  const isRefreshing = status === "refreshing";

  return {
    snapshot,
    status,
    isLoading,
    isRefreshing,
    error: lastError,
    lastError,
    lastUpdatedAt,
    lastRefreshAttemptAt,
    refreshIntervalMs,
    setRefreshIntervalMs,
    loadLimit,
    setLoadLimit,
    demoMode,
    setDemoMode,
    toggleDemoMode,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    resetRuntimeDefaults,
    reloadLocal,
    syncFromApi,
  };
}
