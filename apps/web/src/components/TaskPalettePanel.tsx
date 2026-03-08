import React from "react";
import { TASK_PALETTE_ITEMS } from "../design/colors";
import { LayoutContext } from "./Layout";

export function TaskPalettePanel() {
  const ctx = React.useContext(LayoutContext);
  const [open, setOpen] = React.useState(false);

  if (!ctx) return null;
  const { keyColors, setKeyColors, saveKeyColors, loadKeyColors, resetKeyColors } = ctx;

  return (
    <div className={`palettePanel ${open ? "open" : ""}`}>
      <button className="palettePanelToggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Скрыть палитру задач" : "Палитра задач"}
      </button>
      {open ? (
        <div className="palettePanelBody">
          <div className="palettePanelActions">
            <button onClick={saveKeyColors}>Сохранить палитру</button>
            <button onClick={loadKeyColors}>Загрузить палитру</button>
            <button onClick={resetKeyColors}>Сброс палитры</button>
          </div>
          <div className="palettePanelGrid">
            {TASK_PALETTE_ITEMS.map((item) => (
              <label key={item.key} className="paletteCtrl">
                <span>{item.label}</span>
                <input
                  type="color"
                  value={keyColors[item.key]}
                  onChange={(e) => {
                    const next = e.target.value;
                    setKeyColors((prev) => ({ ...prev, [item.key]: next }));
                  }}
                />
                <input
                  type="text"
                  value={keyColors[item.key]}
                  onChange={(e) => {
                    const next = e.target.value.trim();
                    setKeyColors((prev) => ({ ...prev, [item.key]: next || prev[item.key] }));
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
