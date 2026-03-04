import React from "react";
import { LayoutContext } from "./Layout";

export type FiltersState = {
  ownerId: string;
  status: string;
  search: string;
};

export function FiltersBar() {
  const ctx = React.useContext(LayoutContext);
  if (!ctx) return null;
  const { filters, setFilters, snapshotState } = ctx;
  const { snapshot, reloadLocal, syncFromApi, isLoading, error } = snapshotState;

  const people = snapshot?.people ?? [];
  const statusEntries = Object.entries(snapshot?.enums?.status ?? {});

  return (
    <div className="filters">
      <select
        value={filters.ownerId}
        onChange={(e) => setFilters((s) => ({ ...s, ownerId: e.target.value }))}
        aria-label="Designer filter"
      >
        <option value="">All designers</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
        aria-label="Status filter"
      >
        <option value="">All statuses</option>
        {statusEntries.map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>

      <input
        value={filters.search}
        onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
        placeholder="Search tasks..."
        aria-label="Search"
      />

      <button onClick={reloadLocal} disabled={isLoading}>
        {isLoading ? "Загрузка..." : "Обновить из локального JSON"}
      </button>

      <button onClick={syncFromApi} disabled={isLoading}>
        {isLoading ? "Загрузка..." : "Обновить JSON из API"}
      </button>

      {error ? <span className="muted">Error: {String(error)}</span> : null}
    </div>
  );
}
