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

  const formatMetaTs = (value?: string | null): string => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    const yy = String(d.getUTCFullYear()).slice(-2);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mi = String(d.getUTCMinutes()).padStart(2, "0");
    return `${yy}:${mm}:${dd}:${hh}:${mi}`;
  };

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
        {formatMetaTs(snapshot?.meta.generatedAt)} | {ui.filters.updated}: {formatMetaTs(lastUpdatedAt)} |{" "}
        {ui.filters.attempt}: {formatMetaTs(lastRefreshAttemptAt)}
      </span>

      {error ? <span className="muted">Error: {String(error)}</span> : null}
    </div>
  );
}
