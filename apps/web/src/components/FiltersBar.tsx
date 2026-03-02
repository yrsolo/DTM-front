import React from "react";
import { useSnapshot } from "../data/useSnapshot";
import { LayoutContext } from "./Layout";

export type FiltersState = {
  ownerId: string;
  status: string;
  search: string;
};

export function FiltersBar() {
  const ctx = React.useContext(LayoutContext);
  const { snapshot, reload, isLoading, error } = useSnapshot();

  if (!ctx) return null;
  const { filters, setFilters } = ctx;

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

      <button onClick={reload} disabled={isLoading}>
        {isLoading ? "Loading..." : "Refresh"}
      </button>

      {error ? <span className="muted">Error: {String(error)}</span> : null}
    </div>
  );
}
