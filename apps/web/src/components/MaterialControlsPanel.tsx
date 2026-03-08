import React from "react";
import { MATERIAL_CONTROL_ITEMS } from "../design/controls";
import { LayoutContext } from "./Layout";

export function MaterialControlsPanel() {
  const ctx = React.useContext(LayoutContext);
  const [open, setOpen] = React.useState(false);

  if (!ctx) return null;
  const { design, setDesign } = ctx;

  return (
    <div className={`materialPanel ${open ? "open" : ""}`}>
      <button className="materialPanelToggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Скрыть материал" : "Материал"}
      </button>
      {open ? (
        <div className="materialPanelBody">
          <div className="materialPanelGrid">
            {MATERIAL_CONTROL_ITEMS.map((item) => (
              <label key={item.key} className="materialCtrl">
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
