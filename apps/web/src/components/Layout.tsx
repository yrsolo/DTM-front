import React from "react";
import { useLocation } from "react-router-dom";
import { useSnapshot } from "../data/useSnapshot";
import { resolvePublicAssetUrl } from "../config/publicPaths";
import { AppLocale, getUiText, UiText } from "../i18n/uiText";
import {
  DEFAULT_DESIGN_CONTROLS,
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
import {
  LEGACY_UI_PRESET_STORAGE_KEY,
  readStoredColorDraft,
  readStoredLayoutDraft,
} from "../design/presets";
import { ControlsWorkbench } from "./ControlsWorkbench";
import { FiltersState } from "./FiltersBar";
import {
  DEFAULT_RUNTIME_DEFAULTS,
  RuntimeDefaults,
  normalizeRuntimeDefaults,
} from "../data/runtimeDefaults";
import { useAuthSession } from "../auth/useAuthSession";

const DEPLOY_COLOR_PRESET_PATH = resolvePublicAssetUrl("config/UI/colors/deploy.json");
const DEPLOY_LAYOUT_PRESET_PATH = resolvePublicAssetUrl("config/UI/layouts/deploy.json");

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
  runtimeDefaults: RuntimeDefaults;
  setRuntimeDefaults: React.Dispatch<React.SetStateAction<RuntimeDefaults>>;
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
  workbenchPanelEnabled: boolean;
  setWorkbenchPanelEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  workbenchOpen: boolean;
  setWorkbenchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  favoritesOpen: boolean;
  setFavoritesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  canUseWorkbench: boolean;
  authSession: ReturnType<typeof useAuthSession>;
};

export const LayoutContext = React.createContext<LayoutContextValue | null>(null);
const VIEW_MODE_STORAGE_KEY = "dtm.viewMode.v1";
const SORT_MODE_STORAGE_KEY = "dtm.sortMode.v1";
const LOCALE_STORAGE_KEY = "dtm.locale.v1";

type UiPreset = {
  design: DesignControls;
  keyColors: KeyColors;
  runtimeDefaults: RuntimeDefaults;
};

function animationEaseByPreset(preset: number): string {
  const id = Math.round(preset);
  if (id === 0) return "linear";
  if (id === 1) return "ease-out";
  if (id === 3) return "cubic-bezier(0.22, 1, 0.36, 1)";
  if (id === 4) return "cubic-bezier(0.2, 0.8, 0.2, 1)";
  return "ease-in-out";
}

function normalizeUiPreset(input: unknown): UiPreset {
  if (!input || typeof input !== "object") {
    return {
      design: DEFAULT_DESIGN_CONTROLS,
      keyColors: DEFAULT_KEY_COLORS,
      runtimeDefaults: DEFAULT_RUNTIME_DEFAULTS,
    };
  }

  const record = input as Record<string, unknown>;
  const hasNested = Boolean(record.design || record.keyColors);

  if (hasNested) {
    return {
      design: normalizeDesignControls((record.design ?? {}) as Partial<DesignControls>),
      keyColors: normalizeKeyColors((record.keyColors ?? {}) as Partial<KeyColors>),
      runtimeDefaults: normalizeRuntimeDefaults((record.runtimeDefaults ?? {}) as Partial<RuntimeDefaults>),
    };
  }

  return {
    design: normalizeDesignControls(record as Partial<DesignControls>),
    keyColors: DEFAULT_KEY_COLORS,
    runtimeDefaults: DEFAULT_RUNTIME_DEFAULTS,
  };
}

function isLocalOrTestHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".local") ||
    h.includes("test")
  );
}

function sanitizeRuntimeDefaultsForHost(input: RuntimeDefaults): RuntimeDefaults {
  if (typeof window === "undefined") return input;
  if (isLocalOrTestHost(window.location.hostname)) return input;
  return { ...input, demoMode: false };
}

export function Layout(props: { children: React.ReactNode }) {
  const location = useLocation();
  const INTRO_FADE_MS = 3000;
  const INTRO_VIDEO_DELAY_MS = 1000;
  const brandIconUrl = React.useMemo(() => resolvePublicAssetUrl("dtm_ico_64x64.png"), []);
  const introVideoUrl = React.useMemo(() => resolvePublicAssetUrl("DTM_lo.mp4"), []);
  const [locale, setLocale] = React.useState<AppLocale>("ru");
  const ui = getUiText(locale);
  const [runtimeDefaults, setRuntimeDefaults] = React.useState<RuntimeDefaults>(() => {
    try {
      const raw = localStorage.getItem(LEGACY_UI_PRESET_STORAGE_KEY);
      if (!raw) return sanitizeRuntimeDefaultsForHost(DEFAULT_RUNTIME_DEFAULTS);
      const preset = normalizeUiPreset(JSON.parse(raw));
      return sanitizeRuntimeDefaultsForHost(preset.runtimeDefaults);
    } catch {
      return sanitizeRuntimeDefaultsForHost(DEFAULT_RUNTIME_DEFAULTS);
    }
  });
  const [viewMode, setViewMode] = React.useState<TimelineViewMode>("brand_designer_show");
  const [sortMode, setSortMode] = React.useState<TimelineSortMode>("last_milestone_desc");
  const [filters, setFilters] = React.useState<FiltersState>(() => ({
    ownerId: "",
    status: "",
    search: "",
    displayLimit: runtimeDefaults.displayLimit,
    loadLimit: runtimeDefaults.loadLimit,
  }));
  const authSession = useAuthSession();
  const isPromoRoute = location.pathname === "/promo";
  const isFormatSortRoute = location.pathname === "/format-sort" || location.pathname === "/designer-sort" || location.pathname === "/analytics";
  const snapshotState = useSnapshot(runtimeDefaults, {
    enabled: !authSession.blockInitialDataLoad && !isPromoRoute && !isFormatSortRoute,
  });
  const [design, setDesign] = React.useState<DesignControls>(() => readStoredLayoutDraft());
  const [keyColors, setKeyColors] = React.useState<KeyColors>(() => readStoredColorDraft());
  const [workbenchPanelEnabled, setWorkbenchPanelEnabled] = React.useState(false);
  const [workbenchOpen, setWorkbenchOpen] = React.useState(false);
  const [favoritesOpen, setFavoritesOpen] = React.useState(false);
  const [introState, setIntroState] = React.useState<"idle" | "enter" | "playing" | "exit">("idle");
  const [introOverlayActive, setIntroOverlayActive] = React.useState(false);
  const introVideoRef = React.useRef<HTMLVideoElement | null>(null);
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
      const [colorRes, layoutRes] = await Promise.all([
        fetch(DEPLOY_COLOR_PRESET_PATH, {
          headers: { accept: "application/json" },
          cache: "no-store",
        }),
        fetch(DEPLOY_LAYOUT_PRESET_PATH, {
          headers: { accept: "application/json" },
          cache: "no-store",
        }),
      ]);

      if (!colorRes.ok && !layoutRes.ok) return;

      if (colorRes.ok) {
        const colorParsed = (await colorRes.json()) as Record<string, unknown>;
        const nextColors =
          colorParsed.keyColors && typeof colorParsed.keyColors === "object"
            ? normalizeKeyColors(colorParsed.keyColors as Partial<KeyColors>)
            : normalizeKeyColors(colorParsed as Partial<KeyColors>);
        setKeyColors(nextColors);
      }

      if (layoutRes.ok) {
        const layoutParsed = (await layoutRes.json()) as Record<string, unknown>;
        const nextDesign =
          layoutParsed.design && typeof layoutParsed.design === "object"
            ? normalizeDesignControls(layoutParsed.design as Partial<DesignControls>)
            : normalizeDesignControls(layoutParsed as Partial<DesignControls>);
        setDesign(nextDesign);
        if (layoutParsed.runtimeDefaults && typeof layoutParsed.runtimeDefaults === "object") {
          setRuntimeDefaults(
            sanitizeRuntimeDefaultsForHost(
              normalizeRuntimeDefaults(layoutParsed.runtimeDefaults as Partial<RuntimeDefaults>)
            )
          );
        }
      }
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
      const hasLayoutDraft = Boolean(localStorage.getItem(DESIGN_CONTROLS_STORAGE_KEY));
      const hasColorDraft = Boolean(localStorage.getItem(KEY_COLORS_STORAGE_KEY));
      const hasLegacyPreset = Boolean(localStorage.getItem(LEGACY_UI_PRESET_STORAGE_KEY));
      if (hasLayoutDraft || hasColorDraft || hasLegacyPreset) return;
      await loadDeployDesign();
    })();

    return () => {
      active = false;
    };
  }, []);

  const saveDesign = React.useCallback(() => {
    localStorage.setItem(DESIGN_CONTROLS_STORAGE_KEY, JSON.stringify(design));
    localStorage.setItem(LEGACY_UI_PRESET_STORAGE_KEY, JSON.stringify({ design, keyColors, runtimeDefaults }));
  }, [design, keyColors, runtimeDefaults]);

  const loadDesign = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(DESIGN_CONTROLS_STORAGE_KEY);
      if (raw) {
        setDesign(normalizeDesignControls(JSON.parse(raw)));
        return;
      }
    } catch {
      // ignore invalid payload
    }

    try {
      const combinedRaw = localStorage.getItem(LEGACY_UI_PRESET_STORAGE_KEY);
      if (!combinedRaw) return;
      const preset = normalizeUiPreset(JSON.parse(combinedRaw));
      setDesign(preset.design);
      setRuntimeDefaults(sanitizeRuntimeDefaultsForHost(preset.runtimeDefaults));
    } catch {
      // ignore invalid combined payload
    }
  }, []);

  const resetDesign = React.useCallback(() => {
    setDesign(DEFAULT_DESIGN_CONTROLS);
  }, []);

  const saveKeyColors = React.useCallback(() => {
    localStorage.setItem(KEY_COLORS_STORAGE_KEY, JSON.stringify(keyColors));
    localStorage.setItem(LEGACY_UI_PRESET_STORAGE_KEY, JSON.stringify({ design, keyColors, runtimeDefaults }));
  }, [design, keyColors, runtimeDefaults]);
  const loadKeyColors = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(KEY_COLORS_STORAGE_KEY);
      if (raw) {
        setKeyColors(normalizeKeyColors(JSON.parse(raw)));
        return;
      }
    } catch {
      // ignore invalid payload
    }

    try {
      const combinedRaw = localStorage.getItem(LEGACY_UI_PRESET_STORAGE_KEY);
      if (!combinedRaw) return;
      const preset = normalizeUiPreset(JSON.parse(combinedRaw));
      setKeyColors(preset.keyColors);
      setRuntimeDefaults(sanitizeRuntimeDefaultsForHost(preset.runtimeDefaults));
    } catch {
      // ignore invalid combined payload
    }
  }, []);

  const resetKeyColors = React.useCallback(() => {
    setKeyColors(DEFAULT_KEY_COLORS);
  }, []);

  const startLogoIntro = React.useCallback(() => {
    if (introState !== "idle") return;
    setIntroOverlayActive(false);
    setIntroState("enter");
  }, [introState]);

  React.useEffect(() => {
    if (introState !== "enter") return;
    const raf = window.requestAnimationFrame(() => {
      setIntroOverlayActive(true);
    });
    const startTimer = window.setTimeout(() => {
      const video = introVideoRef.current;
      if (video) {
        video.currentTime = 0;
        void video.play().catch(() => {
          setIntroState("exit");
        });
      }
      setIntroState("playing");
    }, INTRO_VIDEO_DELAY_MS);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(startTimer);
    };
  }, [introState]);

  React.useEffect(() => {
    if (introState !== "exit") return;
    setIntroOverlayActive(false);
    const endTimer = window.setTimeout(() => {
      const video = introVideoRef.current;
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      setIntroOverlayActive(false);
      setIntroState("idle");
    }, INTRO_FADE_MS);
    return () => window.clearTimeout(endTimer);
  }, [introState]);

  const canUseWorkbench =
    authSession.state.authenticated &&
    authSession.state.available &&
    authSession.state.accessMode === "full" &&
    authSession.state.user?.status === "approved";

  React.useEffect(() => {
    if (canUseWorkbench) return;
    setWorkbenchPanelEnabled(false);
    setWorkbenchOpen(false);
    setFavoritesOpen(false);
  }, [canUseWorkbench]);

  React.useEffect(() => {
    if (introState === "idle") return;
    const onKeyDown = () => setIntroState("exit");
    const onMouseDown = () => setIntroState("exit");
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [introState]);

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
        "--scene-dim-a": String(design.sceneDimOpacity),
        "--mat-card-border-a": String(design.matCardBorderOpacity),
        "--mat-card-shadow-a": String(design.matCardShadowStrength),
        "--mat-card-inset-a": String(design.matCardInsetStrength),
        "--mat-topbar-border-a": String(design.matTopbarBorderOpacity),
        "--topbar-glow-a": String(design.topbarGlowOpacity),
        "--topbar-bg-a": String(design.topbarBgOpacity),
        "--mat-active-glow-a": String(design.matActiveGlowStrength),
        "--mat-button-glow-a": String(design.matButtonGlowStrength),
        "--mat-badge-glow-a": String(design.matBadgeGlowStrength),
        "--mat-row-hover-a": String(design.matRowHoverStrength),
        "--mat-scrollbar-glow-a": String(design.matScrollbarGlowStrength),
        "--designers-card-tint-a": String(design.designersCardTintStrength),
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
        "--drawer-panel-border-a": String(design.drawerPanelBorderOpacity),
        "--drawer-panel-shadow-a": String(design.drawerPanelShadowStrength),
        "--drawer-panel-inset-a": String(design.drawerPanelInsetStrength),
        "--drawer-panel-glow-a": String(design.drawerPanelGlowOpacity),
        "--anim-enabled": String(design.animEnabled >= 0.5 ? 1 : 0),
        "--anim-drawer-duration-ms": `${Math.max(0, design.animDrawerDurationMs)}ms`,
        "--anim-reorder-duration-ms": `${Math.max(0, design.animReorderDurationMs)}ms`,
        "--anim-drawer-ease": animationEaseByPreset(design.animDrawerEasePreset),
        "--anim-reorder-ease": animationEaseByPreset(design.animReorderEasePreset),
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
        "--key-drawer-surface-top": keyColors.keyDrawerSurfaceTop,
        "--key-drawer-surface-bottom": keyColors.keyDrawerSurfaceBottom,
        "--key-drawer-surface-alt": keyColors.keyDrawerSurfaceAlt,
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
        "--key-topbar-glow": keyColors.keyTopbarGlow,
        "--key-drawer-panel-glow-left": keyColors.keyDrawerPanelGlowLeft,
        "--key-drawer-panel-glow-right": keyColors.keyDrawerPanelGlowRight,
        "--key-drawer-panel-glow-bottom": keyColors.keyDrawerPanelGlowBottom,
        "--key-drawer-ms-storyboard": keyColors.keyDrawerMsStoryboard,
        "--key-drawer-ms-animatic": keyColors.keyDrawerMsAnimatic,
        "--key-drawer-ms-feedback": keyColors.keyDrawerMsFeedback,
        "--key-drawer-ms-prefinal": keyColors.keyDrawerMsPrefinal,
        "--key-drawer-ms-final": keyColors.keyDrawerMsFinal,
        "--key-drawer-ms-master": keyColors.keyDrawerMsMaster,
        "--key-drawer-ms-onair": keyColors.keyDrawerMsOnair,
        "--key-drawer-ms-start": keyColors.keyDrawerMsStart,
        "--key-drawer-ms-default": keyColors.keyDrawerMsDefault,
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

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const target = document.body;
    const cssVarEntries = Object.entries(layoutVarsStyle).filter(([key]) => key.startsWith("--"));
    const previous = new Map<string, string>();

    for (const [key] of cssVarEntries) {
      previous.set(key, target.style.getPropertyValue(key));
    }

    for (const [key, value] of cssVarEntries) {
      target.style.setProperty(key, String(value));
    }

    return () => {
      for (const [key, value] of previous) {
        if (value) target.style.setProperty(key, value);
        else target.style.removeProperty(key);
      }
    };
  }, [layoutVarsStyle]);

  const isAdminRoute = location.pathname === "/admin";
  const isMiniAppRoute =
    location.pathname === "/app" || location.pathname === "/m" || location.pathname === "/mobile";

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;

    if (isPromoRoute || isFormatSortRoute) {
      body.style.overflow = "auto";
      documentElement.style.overflow = "auto";
    }

    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isFormatSortRoute, isPromoRoute]);

  const appShellClassName = `appShell${isAdminRoute ? " adminShell" : ""}${isPromoRoute || isFormatSortRoute ? " promoShell" : ""}`;
  const containerClassName = `${isAdminRoute ? "container adminContainer" : "container"}${isMiniAppRoute ? " miniAppContainer" : ""}${isPromoRoute || isFormatSortRoute ? " promoContainer" : ""}`;

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
        runtimeDefaults,
        setRuntimeDefaults,
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
        workbenchPanelEnabled,
        setWorkbenchPanelEnabled,
        workbenchOpen,
        setWorkbenchOpen,
        favoritesOpen,
        setFavoritesOpen,
        canUseWorkbench,
        authSession,
      }}
    >
      <div className={appShellClassName} style={layoutVarsStyle}>
        {!isMiniAppRoute && !isPromoRoute && !isFormatSortRoute ? (
          <div className="topbar">
            <div className="nav">
              <div className="brand">
                <button
                  type="button"
                  className="brandIconButton"
                  onClick={startLogoIntro}
                  aria-label="Play logo intro"
                >
                  <img className="brandIcon" src={brandIconUrl} alt="" aria-hidden="true" />
                </button>
                <div className="brandText">
                  <strong>{ui.appTitle}</strong>
                  <span className="muted">{ui.appSubtitle}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className={containerClassName}>{props.children}</div>
        {introState !== "idle" ? (
          <div
            className={`logoIntroOverlay ${introState === "exit" ? "isExit" : introOverlayActive ? "isActive" : ""}`}
          >
            <video
              ref={introVideoRef}
              className={`logoIntroVideo ${introState === "playing" ? "isVisible" : ""}`}
              src={introVideoUrl}
              preload="auto"
              playsInline
              muted
              controls={false}
              onEnded={() => setIntroState("exit")}
              onError={() => setIntroState("exit")}
            />
          </div>
        ) : null}
        {!isPromoRoute && !isFormatSortRoute ? (
          <div className="controlDock">
            <ControlsWorkbench />
          </div>
        ) : null}
      </div>
    </LayoutContext.Provider>
  );
}
