import React from "react";
import { NavLink } from "react-router-dom";
import { useSnapshot } from "../data/useSnapshot";
import {
  DEFAULT_DESIGN_CONTROLS,
  DESIGN_CONTROLS_STORAGE_KEY,
  DesignControls,
  normalizeDesignControls,
} from "../design/controls";
import { DesignControlsPanel } from "./DesignControlsPanel";
import { FiltersBar, FiltersState } from "./FiltersBar";

export type LayoutContextValue = {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
  snapshotState: ReturnType<typeof useSnapshot>;
  design: DesignControls;
  setDesign: React.Dispatch<React.SetStateAction<DesignControls>>;
  saveDesign: () => void;
  loadDesign: () => void;
  resetDesign: () => void;
};

export const LayoutContext = React.createContext<LayoutContextValue | null>(null);

export function Layout(props: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<FiltersState>({
    ownerId: "",
    status: "",
    search: ""
  });
  const snapshotState = useSnapshot();
  const [design, setDesign] = React.useState<DesignControls>(DEFAULT_DESIGN_CONTROLS);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DESIGN_CONTROLS_STORAGE_KEY);
      if (!raw) return;
      setDesign(normalizeDesignControls(JSON.parse(raw)));
    } catch {
      // ignore invalid local storage payload
    }
  }, []);

  const saveDesign = React.useCallback(() => {
    localStorage.setItem(DESIGN_CONTROLS_STORAGE_KEY, JSON.stringify(design));
  }, [design]);

  const loadDesign = React.useCallback(() => {
    const raw = localStorage.getItem(DESIGN_CONTROLS_STORAGE_KEY);
    if (!raw) return;
    try {
      setDesign(normalizeDesignControls(JSON.parse(raw)));
    } catch {
      // ignore invalid payload
    }
  }, []);

  const resetDesign = React.useCallback(() => {
    setDesign(DEFAULT_DESIGN_CONTROLS);
  }, []);

  const containerStyle = React.useMemo(
    () =>
      ({
        "--left-col-width": `${design.desktopLeftColWidth}px`,
        "--table-row-h": `${design.tableRowHeight}px`,
        "--table-cell-px": `${design.tableCellPadX}px`,
        "--table-cell-py": `${design.tableCellPadY}px`,
        "--badge-h": `${design.badgeHeight}px`,
        "--badge-fs": `${design.badgeFontSize}px`,
        "--card-p": `${design.cardPadding}px`,
      }) as React.CSSProperties,
    [design]
  );

  return (
    <LayoutContext.Provider
      value={{ filters, setFilters, snapshotState, design, setDesign, saveDesign, loadDesign, resetDesign }}
    >
      <div className="topbar">
        <div className="nav">
          <div className="brand">
            <strong>DTM Grant Charts</strong>
            <span className="muted">Planning and workload timeline</span>
          </div>
          <div className="navLinks">
            <NavLink to="/designers" className={({ isActive }) => (isActive ? "active" : "")}>
              By designers
            </NavLink>
            <NavLink to="/tasks" className={({ isActive }) => (isActive ? "active" : "")}>
              By tasks
            </NavLink>
          </div>
        </div>
        <FiltersBar />
      </div>
      <div className="container" style={containerStyle}>{props.children}</div>
      <DesignControlsPanel />
    </LayoutContext.Provider>
  );
}
