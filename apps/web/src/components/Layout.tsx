import React from "react";
import { NavLink } from "react-router-dom";
import { FiltersBar, FiltersState } from "./FiltersBar";

export type LayoutContextValue = {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
};

export const LayoutContext = React.createContext<LayoutContextValue | null>(null);

export function Layout(props: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<FiltersState>({
    ownerId: "",
    status: "",
    search: ""
  });

  return (
    <LayoutContext.Provider value={{ filters, setFilters }}>
      <div className="topbar">
        <div className="nav">
          <strong>DTM Web</strong>
          <NavLink to="/designers" className={({ isActive }) => (isActive ? "active" : "")}>
            By designers
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => (isActive ? "active" : "")}>
            By tasks
          </NavLink>
        </div>
        <FiltersBar />
      </div>
      <div className="container">{props.children}</div>
    </LayoutContext.Provider>
  );
}
