import React from "react";
import { LayoutContext } from "./Layout";

export type FiltersState = {
  ownerId: string;
  status: string;
  search: string;
  displayLimit: number;
  loadLimit: number;
};

export function FiltersBar() {
  const ctx = React.useContext(LayoutContext);
  if (!ctx) return null;

  const { snapshotState, ui } = ctx;
  const {
    snapshot,
    reloadLocal,
    syncFromApi,
    isRefreshing,
    error,
    lastUpdatedAt,
    lastRefreshAttemptAt,
    refreshIntervalMs,
    setRefreshIntervalMs,
  } = snapshotState;

  return (
    <div className="filters">
      <button onClick={() => { void reloadLocal(); }} disabled={isRefreshing}>
        {ui.filters.updateFromLocal}
      </button>

      <button onClick={() => { void syncFromApi(); }} disabled={isRefreshing}>
        {ui.filters.updateFromApi}
      </button>

      <select
        value={String(refreshIntervalMs)}
        onChange={(e) => setRefreshIntervalMs(Number(e.target.value))}
        aria-label="Auto refresh interval"
      >
        <option value="0">{ui.filters.autoRefreshOff}</option>
        <option value="15000">{ui.filters.autoRefresh15s}</option>
        <option value="30000">{ui.filters.autoRefresh30s}</option>
        <option value="60000">{ui.filters.autoRefresh1m}</option>
        <option value="300000">{ui.filters.autoRefresh5m}</option>
      </select>

      <span className="refreshMeta muted">
        {isRefreshing ? ui.filters.refreshing : ui.filters.ready} | {ui.filters.generated}:{" "}
        {snapshot?.meta.generatedAt ?? "-"} | {ui.filters.updated}: {lastUpdatedAt ?? "-"} |{" "}
        {ui.filters.attempt}: {lastRefreshAttemptAt ?? "-"}
      </span>

      {error ? <span className="muted">Error: {String(error)}</span> : null}
    </div>
  );
}
