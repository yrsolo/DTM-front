import React from "react";
import { DESIGN_CONTROL_ITEMS, DESIGN_CONTROLS_PUBLIC_PATH, normalizeDesignControls } from "../design/controls";
import { normalizeKeyColors } from "../design/colors";
import { LayoutContext } from "./Layout";

export function DesignControlsPanel() {
  const ctx = React.useContext(LayoutContext);
  const [open, setOpen] = React.useState(false);
  const importRef = React.useRef<HTMLInputElement | null>(null);

  if (!ctx) return null;
  const { design, keyColors, setDesign, setKeyColors, saveDesign, loadDesign, loadDeployDesign, resetDesign } = ctx;

  const exportPreset = () => {
    const payload = {
      design,
      keyColors,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design-controls.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`designPanel ${open ? "open" : ""}`}>
      <button className="designPanelToggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide controls" : "Design controls"}
      </button>
      {open ? (
        <div className="designPanelBody">
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            For deploy persistence upload preset to <code>{DESIGN_CONTROLS_PUBLIC_PATH}</code>
          </div>

          <div className="designPanelActions">
            <button onClick={saveDesign}>Save local</button>
            <button onClick={loadDesign}>Load local</button>
            <button onClick={resetDesign}>Reset</button>
            <button onClick={exportPreset}>Export preset</button>
            <button onClick={() => importRef.current?.click()}>Import preset</button>
            <button onClick={() => void loadDeployDesign()}>Load deploy</button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                try {
                  const parsed = JSON.parse(text);
                  const rec = parsed as Record<string, unknown>;
                  const isCombined = Boolean(rec.design || rec.keyColors);

                  if (isCombined) {
                    setDesign(normalizeDesignControls((rec.design ?? {}) as Record<string, unknown>));
                    setKeyColors(
                      rec.keyColors && typeof rec.keyColors === "object"
                        ? normalizeKeyColors(rec.keyColors as Record<string, string>)
                        : keyColors
                    );
                  } else {
                    setDesign(normalizeDesignControls(parsed));
                  }
                } catch {
                  // ignore invalid json
                } finally {
                  e.target.value = "";
                }
              }}
            />
          </div>

          <div className="designPanelGrid">
            {DESIGN_CONTROL_ITEMS.map((item) => (
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
