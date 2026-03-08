import React from "react";
import { DRAWER_CONTROL_ITEMS } from "../design/controls";
import { LayoutContext } from "./Layout";

export function DrawerControlsPanel() {
  const ctx = React.useContext(LayoutContext);
  const [open, setOpen] = React.useState(false);

  if (!ctx) return null;
  const { design, setDesign } = ctx;

  return (
    <div className={`designPanel ${open ? "open" : ""}`}>
      <button className="designPanelToggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Скрыть крутилки карточки" : "Крутилки карточки"}
      </button>
      {open ? (
        <div className="designPanelBody">
          <div className="designPanelGrid">
            {DRAWER_CONTROL_ITEMS.map((item) => (
              <label key={item.key} className="designCtrl">
                <span>{item.label}</span>
                <input
                  type="range"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={design[item.key]}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDesign((prev) => ({ ...prev, [item.key]: next }));
                  }}
                />
                <input
                  type="number"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={design[item.key]}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDesign((prev) => ({ ...prev, [item.key]: Number.isFinite(next) ? next : prev[item.key] }));
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
