import React from "react";
import { useSnapshot } from "../data/useSnapshot";
import { AppLocale, getUiText, UiText } from "../i18n/uiText";
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
import { ControlsWorkbench } from "./ControlsWorkbench";
import { FiltersState } from "./FiltersBar";

export type TimelineViewMode =
  | "brand_designer_show"
  | "format_brand_show"
  | "designer_brand_show"
  | "flat_brand_show"
  | "show_brand_designer";

export type TimelineSortMode = "last_milestone_desc" | "last_milestone_asc";

export type LayoutContextValue = {
  locale: AppLocale;
  setLocale: React.Dispatch<React.SetStateAction<AppLocale>>;
  ui: UiText;
  viewMode: TimelineViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<TimelineViewMode>>;
  sortMode: TimelineSortMode;
  setSortMode: React.Dispatch<React.SetStateAction<TimelineSortMode>>;
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
const VIEW_MODE_STORAGE_KEY = "dtm.viewMode.v1";
const SORT_MODE_STORAGE_KEY = "dtm.sortMode.v1";
const LOCALE_STORAGE_KEY = "dtm.locale.v1";

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
  const [locale, setLocale] = React.useState<AppLocale>("ru");
  const ui = getUiText(locale);
  const [viewMode, setViewMode] = React.useState<TimelineViewMode>("brand_designer_show");
  const [sortMode, setSortMode] = React.useState<TimelineSortMode>("last_milestone_desc");
  const [filters, setFilters] = React.useState<FiltersState>({
    ownerId: "",
    status: "",
    search: "",
    displayLimit: 30,
    loadLimit: 30,
  });
  const snapshotState = useSnapshot();
  const [design, setDesign] = React.useState<DesignControls>(DEFAULT_DESIGN_CONTROLS);
  const [keyColors, setKeyColors] = React.useState<KeyColors>(DEFAULT_KEY_COLORS);
  const textRenderingValue = React.useMemo(() => {
    const mode = Math.round(design.textRenderingMode);
    if (mode === 1) return "optimizeLegibility";
    if (mode === 2) return "geometricPrecision";
    if (mode === 3) return "optimizeSpeed";
    return "auto";
  }, [design.textRenderingMode]);
  const smoothingValue = React.useMemo(() => {
    const mode = Math.round(design.textSmoothingMode);
    if (mode === 0) {
      return {
        webkit: "auto",
        moz: "auto",
      };
    }
    if (mode === 2) {
      return {
        webkit: "none",
        moz: "auto",
      };
    }
    return {
      webkit: "antialiased",
      moz: "grayscale",
    };
  }, [design.textSmoothingMode]);

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
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (
      stored === "brand_designer_show" ||
      stored === "format_brand_show" ||
      stored === "designer_brand_show" ||
      stored === "flat_brand_show" ||
      stored === "show_brand_designer"
    ) {
      setViewMode(stored);
    }
  }, []);

  React.useEffect(() => {
    const stored = localStorage.getItem(SORT_MODE_STORAGE_KEY);
    if (stored === "last_milestone_desc" || stored === "last_milestone_asc") {
      setSortMode(stored);
    }
  }, []);

  React.useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "ru" || stored === "en") {
      setLocale(stored);
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);
  React.useEffect(() => {
    localStorage.setItem(SORT_MODE_STORAGE_KEY, sortMode);
  }, [sortMode]);

  React.useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

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
        "--drawer-width": `${design.drawerWidth}px`,
        "--drawer-padding": `${design.drawerPadding}px`,
        "--drawer-title-size": `${design.drawerTitleSize}px`,
        "--drawer-meta-gap": `${design.drawerMetaGap}px`,
        "--drawer-section-gap": `${design.drawerSectionGap}px`,
        "--drawer-mini-dates-fs": `${design.drawerMiniDatesFontSize}px`,
        "--drawer-milestone-date-fs": `${design.drawerMilestoneDateFontSize}px`,
        "--drawer-milestone-row-gap": `${design.drawerMilestoneRowGap}px`,
        "--drawer-calendar-cell-h": `${design.drawerCalendarCellHeight}px`,
        "--drawer-calendar-day-fs": `${design.drawerCalendarDayFontSize}px`,
        "--drawer-calendar-radius": `${design.drawerCalendarRadius}px`,
        "--drawer-calendar-month-tint-a": String(design.drawerCalendarMonthTintOpacity),
        "--drawer-calendar-weekend-tint-a": String(design.drawerCalendarWeekendTintOpacity),
        "--drawer-calendar-holiday-tint-a": String(design.drawerCalendarHolidayTintOpacity),
        "--drawer-milestone-cell-glow-a": String(design.drawerMilestoneCellGlowOpacity),
        "--drawer-milestone-cell-shadow-a": String(design.drawerMilestoneCellShadowOpacity),
        "--drawer-milestone-dot-size": `${design.drawerMilestoneDotSize}px`,
        "--drawer-milestone-label-fs": `${design.drawerMilestoneLabelFontSize}px`,
        "--drawer-milestone-label-maxw": `${design.drawerMilestoneLabelMaxWidth}px`,
        "--drawer-month-label-fs": `${design.drawerMonthLabelFontSize}px`,
        "--drawer-milestone-day-shadow-a": String(design.drawerMilestoneDayShadowOpacity),
        "--drawer-milestone-cell-dark-shadow-a": String(design.drawerMilestoneCellDarkShadowOpacity),
        "--drawer-milestone-cell-dark-shadow-blur": `${design.drawerMilestoneCellDarkShadowBlur}px`,
        "--wb-dock-left": `${design.workbenchDockLeft}px`,
        "--wb-dock-right": `${design.workbenchDockRight}px`,
        "--wb-dock-bottom": `${design.workbenchDockBottom}px`,
        "--wb-width-max": `${design.workbenchWidthMax}px`,
        "--wb-viewport-margin": `${design.workbenchViewportMargin}px`,
        "--wb-body-max-h-vh": `${design.workbenchBodyMaxHeightVh}vh`,
        "--wb-body-padding": `${design.workbenchBodyPadding}px`,
        "--wb-main-gap": `${design.workbenchMainGap}px`,
        "--wb-tabs-gap": `${design.workbenchTabsGap}px`,
        "--wb-tab-fs": `${design.workbenchTabFontSize}px`,
        "--wb-tab-py": `${design.workbenchTabPadY}px`,
        "--wb-tab-px": `${design.workbenchTabPadX}px`,
        "--wb-side-w": `${design.workbenchSideWidth}px`,
        "--wb-grid-min-col": `${design.workbenchGridMinCol}px`,
        "--wb-grid-gap": `${design.workbenchGridGap}px`,
        "--wb-group-padding": `${design.workbenchGroupPadding}px`,
        "--wb-control-gap": `${design.workbenchControlGap}px`,
        "--wb-action-btn-fs": `${design.workbenchActionBtnFontSize}px`,
        "--wb-action-btn-py": `${design.workbenchActionBtnPadY}px`,
        "--wb-action-btn-px": `${design.workbenchActionBtnPadX}px`,
        "--wb-slider-w": `${design.workbenchSliderWidth}px`,
        "--wb-number-w": `${design.workbenchNumberWidth}px`,
        "--wb-label-min": `${design.workbenchLabelMinWidth}px`,
        "--wb-color-text-w": `${design.workbenchColorTextWidth}px`,
        "--wb-label-fs": `${design.workbenchControlLabelFontSize}px`,
        "--wb-input-fs": `${design.workbenchControlInputFontSize}px`,
        "--key-pink": keyColors.keyPink,
        "--key-blue": keyColors.keyBlue,
        "--key-mint": keyColors.keyMint,
        "--key-violet": keyColors.keyViolet,
        "--key-milestone": keyColors.keyMilestone,
        "--key-cursor-trail": keyColors.keyCursorTrail,
        "--key-left-pill-text": keyColors.keyLeftPillText,
        "--key-surface-top": keyColors.keySurfaceTop,
        "--key-surface-bottom": keyColors.keySurfaceBottom,
        "--key-surface-alt": keyColors.keySurfaceAlt,
        "--key-text": keyColors.keyText,
        "--key-btn-grad-from": keyColors.keyBtnGradFrom,
        "--key-btn-grad-to": keyColors.keyBtnGradTo,
        "--key-btn-hover-from": keyColors.keyBtnHoverFrom,
        "--key-btn-hover-to": keyColors.keyBtnHoverTo,
        "--key-nav-btn-from": keyColors.keyNavBtnFrom,
        "--key-nav-btn-to": keyColors.keyNavBtnTo,
        "--key-nav-active-from": keyColors.keyNavActiveFrom,
        "--key-nav-active-to": keyColors.keyNavActiveTo,
        "--key-backdrop-left": keyColors.keyBackdropLeft,
        "--key-backdrop-right": keyColors.keyBackdropRight,
        "--key-backdrop-bottom": keyColors.keyBackdropBottom,
        "--key-app-bg-top": keyColors.keyAppBgTop,
        "--key-app-bg-mid": keyColors.keyAppBgMid,
        "--key-app-bg-bottom": keyColors.keyAppBgBottom,
        "--key-app-bg-base": keyColors.keyAppBgBase,
        "--task-color-1": keyColors.taskColor1,
        "--task-color-2": keyColors.taskColor2,
        "--task-color-3": keyColors.taskColor3,
        "--task-color-4": keyColors.taskColor4,
        "--task-color-5": keyColors.taskColor5,
        "--task-color-6": keyColors.taskColor6,
        "--task-color-7": keyColors.taskColor7,
        "--task-color-8": keyColors.taskColor8,
        textRendering: textRenderingValue,
        WebkitFontSmoothing: smoothingValue.webkit,
        MozOsxFontSmoothing: smoothingValue.moz,
      }) as React.CSSProperties,
    [design, keyColors, smoothingValue, textRenderingValue]
  );

  return (
    <LayoutContext.Provider
      value={{
        locale,
        setLocale,
        ui,
        viewMode,
        setViewMode,
        sortMode,
        setSortMode,
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
              <strong>{ui.appTitle}</strong>
              <span className="muted">{ui.appSubtitle}</span>
            </div>
          </div>
        </div>
        <div className="container">{props.children}</div>
        <div className="controlDock">
          <ControlsWorkbench />
        </div>
      </div>
    </LayoutContext.Provider>
  );
}
