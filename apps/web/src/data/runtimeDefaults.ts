export type RuntimeDefaults = {
  demoMode: boolean;
  displayLimit: number;
  loadLimit: number;
  refreshIntervalSec: number;
  dateFilterEnabled: boolean;
  statusWork: boolean;
  statusPreDone: boolean;
  statusDone: boolean;
  statusWait: boolean;
};

export const DEFAULT_RUNTIME_DEFAULTS: RuntimeDefaults = {
  demoMode: false,
  displayLimit: 30,
  loadLimit: 100,
  refreshIntervalSec: 60,
  dateFilterEnabled: false,
  statusWork: true,
  statusPreDone: true,
  statusDone: false,
  statusWait: false,
};

export function normalizeRuntimeDefaults(input?: Partial<RuntimeDefaults>): RuntimeDefaults {
  const merged = { ...DEFAULT_RUNTIME_DEFAULTS, ...(input ?? {}) };
  return {
    demoMode: Boolean(merged.demoMode),
    displayLimit: Math.max(1, Math.min(200, Math.round(merged.displayLimit))),
    loadLimit: Math.max(1, Math.min(200, Math.round(merged.loadLimit))),
    refreshIntervalSec: Math.max(0, Math.min(300, Math.round(merged.refreshIntervalSec))),
    dateFilterEnabled: Boolean(merged.dateFilterEnabled),
    statusWork: Boolean(merged.statusWork),
    statusPreDone: Boolean(merged.statusPreDone),
    statusDone: Boolean(merged.statusDone),
    statusWait: Boolean(merged.statusWait),
  };
}
