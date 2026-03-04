import React from "react";
import { useSnapshot } from "../data/useSnapshot";
import {
  DEFAULT_DESIGN_CONTROLS,
  DESIGN_CONTROLS_PUBLIC_PATH,
  DESIGN_CONTROLS_STORAGE_KEY,
  DesignControls,
  normalizeDesignControls,
} from "../design/controls";
import {
  DEFAULT_KEY_COLORS,
  KEY_COLORS_STORAGE_KEY,
  KeyColors,
  normalizeKeyColors,
} from "../design/colors";
import { DesignControlsPanel } from "./DesignControlsPanel";
import { ColorControlsPanel } from "./ColorControlsPanel";
import { MaterialControlsPanel } from "./MaterialControlsPanel";
import { TaskPalettePanel } from "./TaskPalettePanel";
import { FiltersBar, FiltersState } from "./FiltersBar";

export type LayoutContextValue = {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
  snapshotState: ReturnType<typeof useSnapshot>;
  design: DesignControls;
  setDesign: React.Dispatch<React.SetStateAction<DesignControls>>;
  saveDesign: () => void;
  loadDesign: () => void;
  loadDeployDesign: () => Promise<void>;
  resetDesign: () => void;
  keyColors: KeyColors;
  setKeyColors: React.Dispatch<React.SetStateAction<KeyColors>>;
  saveKeyColors: () => void;
  loadKeyColors: () => void;
  resetKeyColors: () => void;
};

export const LayoutContext = React.createContext<LayoutContextValue | null>(null);
const UI_PRESET_STORAGE_KEY = "dtm.web.uiPreset.v1";

type UiPreset = {
  design: DesignControls;
  keyColors: KeyColors;
};

function normalizeUiPreset(input: unknown): UiPreset {
  if (!input || typeof input !== "object") {
    return { design: DEFAULT_DESIGN_CONTROLS, keyColors: DEFAULT_KEY_COLORS };
  }

  const record = input as Record<string, unknown>;
  const hasNested = Boolean(record.design || record.keyColors);

  if (hasNested) {
    return {
      design: normalizeDesignControls((record.design ?? {}) as Partial<DesignControls>),
      keyColors: normalizeKeyColors((record.keyColors ?? {}) as Partial<KeyColors>),
    };
  }

  return {
    design: normalizeDesignControls(record as Partial<DesignControls>),
    keyColors: DEFAULT_KEY_COLORS,
  };
}

export function Layout(props: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<FiltersState>({
    ownerId: "",
    status: "",
    search: ""
  });
  const snapshotState = useSnapshot();
  const [design, setDesign] = React.useState<DesignControls>(DEFAULT_DESIGN_CONTROLS);
  const [keyColors, setKeyColors] = React.useState<KeyColors>(DEFAULT_KEY_COLORS);

  const loadDeployDesign = React.useCallback(async () => {
    try {
      const res = await fetch(DESIGN_CONTROLS_PUBLIC_PATH, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return;
      const parsed = await res.json();
      const preset = normalizeUiPreset(parsed);
      setDesign(preset.design);
      setKeyColors(preset.keyColors);
    } catch {
      // ignore optional preset file errors
    }
  }, []);

  React.useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const combinedRaw = localStorage.getItem(UI_PRESET_STORAGE_KEY);
        if (combinedRaw) {
          const preset = normalizeUiPreset(JSON.parse(combinedRaw));
          if (!active) return;
          setDesign(preset.design);
          setKeyColors(preset.keyColors);
          return;
        }
      } catch {
        // ignore invalid combined payload
      }

      try {
        const raw = localStorage.getItem(DESIGN_CONTROLS_STORAGE_KEY);
        if (raw) {
          if (!active) return;
          setDesign(normalizeDesignControls(JSON.parse(raw)));
        }
      } catch {
        // ignore invalid legacy payload
      }

      try {
        const raw = localStorage.getItem(KEY_COLORS_STORAGE_KEY);
        if (raw) {
          if (!active) return;
          setKeyColors(normalizeKeyColors(JSON.parse(raw)));
        }
      } catch {
        // ignore invalid legacy payload
      }

      await loadDeployDesign();
    })();

    return () => {
      active = false;
    };
  }, []);

  const saveDesign = React.useCallback(() => {
    localStorage.setItem(UI_PRESET_STORAGE_KEY, JSON.stringify({ design, keyColors }));
    localStorage.setItem(DESIGN_CONTROLS_STORAGE_KEY, JSON.stringify(design));
    localStorage.setItem(KEY_COLORS_STORAGE_KEY, JSON.stringify(keyColors));
  }, [design, keyColors]);

  const loadDesign = React.useCallback(() => {
    try {
      const combinedRaw = localStorage.getItem(UI_PRESET_STORAGE_KEY);
      if (combinedRaw) {
        const preset = normalizeUiPreset(JSON.parse(combinedRaw));
        setDesign(preset.design);
        setKeyColors(preset.keyColors);
        return;
      }
    } catch {
      // ignore invalid combined payload
    }

    try {
      const raw = localStorage.getItem(DESIGN_CONTROLS_STORAGE_KEY);
      if (raw) {
        setDesign(normalizeDesignControls(JSON.parse(raw)));
      }
    } catch {
      // ignore invalid payload
    }

    try {
      const raw = localStorage.getItem(KEY_COLORS_STORAGE_KEY);
      if (raw) {
        setKeyColors(normalizeKeyColors(JSON.parse(raw)));
      }
    } catch {
      // ignore invalid payload
    }
  }, []);

  const resetDesign = React.useCallback(() => {
    setDesign(DEFAULT_DESIGN_CONTROLS);
  }, []);

  const saveKeyColors = React.useCallback(() => saveDesign(), [saveDesign]);
  const loadKeyColors = React.useCallback(() => loadDesign(), [loadDesign]);

  const resetKeyColors = React.useCallback(() => {
    setKeyColors(DEFAULT_KEY_COLORS);
  }, []);

  const layoutVarsStyle = React.useMemo(
    () =>
      ({
        "--left-col-width": `${design.desktopLeftColWidth}px`,
        "--table-row-h": `${design.tableRowHeight}px`,
        "--table-cell-px": `${design.tableCellPadX}px`,
        "--table-cell-py": `${design.tableCellPadY}px`,
        "--badge-h": `${design.badgeHeight}px`,
        "--badge-fs": `${design.badgeFontSize}px`,
        "--card-p": `${design.cardPadding}px`,
        "--mat-bg-pink-a": String(design.matBgPinkOpacity),
        "--mat-bg-blue-a": String(design.matBgBlueOpacity),
        "--mat-bg-mint-a": String(design.matBgMintOpacity),
        "--mat-card-border-a": String(design.matCardBorderOpacity),
        "--mat-card-shadow-a": String(design.matCardShadowStrength),
        "--mat-card-inset-a": String(design.matCardInsetStrength),
        "--mat-topbar-border-a": String(design.matTopbarBorderOpacity),
        "--mat-active-glow-a": String(design.matActiveGlowStrength),
        "--mat-button-glow-a": String(design.matButtonGlowStrength),
        "--mat-badge-glow-a": String(design.matBadgeGlowStrength),
        "--mat-row-hover-a": String(design.matRowHoverStrength),
        "--mat-scrollbar-glow-a": String(design.matScrollbarGlowStrength),
        "--key-pink": keyColors.keyPink,
        "--key-blue": keyColors.keyBlue,
        "--key-mint": keyColors.keyMint,
        "--key-violet": keyColors.keyViolet,
        "--key-milestone": keyColors.keyMilestone,
        "--key-surface-top": keyColors.keySurfaceTop,
        "--key-surface-bottom": keyColors.keySurfaceBottom,
        "--key-surface-alt": keyColors.keySurfaceAlt,
        "--key-text": keyColors.keyText,
        "--task-color-1": keyColors.taskColor1,
        "--task-color-2": keyColors.taskColor2,
        "--task-color-3": keyColors.taskColor3,
        "--task-color-4": keyColors.taskColor4,
        "--task-color-5": keyColors.taskColor5,
        "--task-color-6": keyColors.taskColor6,
        "--task-color-7": keyColors.taskColor7,
        "--task-color-8": keyColors.taskColor8,
      }) as React.CSSProperties,
    [design, keyColors]
  );

  return (
    <LayoutContext.Provider
      value={{
        filters,
        setFilters,
        snapshotState,
        design,
        setDesign,
        saveDesign,
        loadDesign,
        loadDeployDesign,
        resetDesign,
        keyColors,
        setKeyColors,
        saveKeyColors,
        loadKeyColors,
        resetKeyColors,
      }}
    >
      <div style={layoutVarsStyle}>
        <div className="topbar">
          <div className="nav">
            <div className="brand">
              <strong>DTM Grant Charts</strong>
              <span className="muted">Planning and workload timeline</span>
            </div>
            <div className="navLinks" />
          </div>
          <FiltersBar />
        </div>
        <div className="container">{props.children}</div>
        <div className="controlDock">
          <MaterialControlsPanel />
          <ColorControlsPanel />
          <TaskPalettePanel />
          <DesignControlsPanel />
        </div>
      </div>
    </LayoutContext.Provider>
  );
}
