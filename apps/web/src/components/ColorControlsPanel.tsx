import React from "react";
import { KEY_COLOR_ITEMS } from "../design/colors";
import { LayoutContext } from "./Layout";

export function ColorControlsPanel() {
  const ctx = React.useContext(LayoutContext);
  const [open, setOpen] = React.useState(false);

  if (!ctx) return null;
  const { keyColors, setKeyColors, saveKeyColors, loadKeyColors, resetKeyColors } = ctx;

  return (
    <div className={`colorPanel ${open ? "open" : ""}`}>
      <button className="colorPanelToggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Скрыть цвета" : "Цвета"}
      </button>
      {open ? (
        <div className="colorPanelBody">
          <div className="colorPanelActions">
            <button onClick={saveKeyColors}>Сохранить цвета</button>
            <button onClick={loadKeyColors}>Загрузить цвета</button>
            <button onClick={resetKeyColors}>Сбросить цвета</button>
          </div>
          <div className="colorPanelGrid">
            {KEY_COLOR_ITEMS.map((item) => (
              <label key={item.key} className="colorCtrl">
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
