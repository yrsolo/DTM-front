import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { InspectorNodeBoundary } from "../inspector-integration/boundary";
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

type PreviewCapabilities = {
  token: boolean;
  component: boolean;
  placement: boolean;
  "instance-preview": boolean;
};

type DesignPreviewOverlay = Partial<DesignControls>;
type KeyColorPreviewOverlay = Partial<KeyColors>;

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
  effectiveDesign: DesignControls;
  setDesign: React.Dispatch<React.SetStateAction<DesignControls>>;
  saveDesign: () => void;
  loadDesign: () => void;
  loadDeployDesign: () => Promise<void>;
  resetDesign: () => void;
  keyColors: KeyColors;
  effectiveKeyColors: KeyColors;
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
  previewCapabilities: PreviewCapabilities;
  setDesignPreviewOverlay: React.Dispatch<React.SetStateAction<DesignPreviewOverlay>>;
  setKeyColorPreviewOverlay: React.Dispatch<React.SetStateAction<KeyColorPreviewOverlay>>;
};

export const LayoutContext = React.createContext<LayoutContextValue | null>(null);
const VIEW_MODE_STORAGE_KEY = "dtm.viewMode.v1";
const SORT_MODE_STORAGE_KEY = "dtm.sortMode.v1";
const LOCALE_STORAGE_KEY = "dtm.locale.v1";
const PRIMARY_SECTION_LINKS: ReadonlyArray<{ to: string; label: string; end?: boolean }> = [
  { to: "/", label: "Таблица", end: true },
  { to: "/analytics", label: "Аналитика" },
  { to: "/promo", label: "Промо" },
];

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

export function Layout(props: { children: React.ReactNode; inspectorMount?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
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
  const isPromoRoute = location.pathname === "/promo" || location.pathname === "/promo-draft";
  const isFormatSortRoute =
    location.pathname === "/format-sort" ||
    location.pathname === "/designer-sort" ||
    location.pathname === "/analytics";
  const snapshotState = useSnapshot(runtimeDefaults, {
    enabled: !authSession.blockInitialDataLoad && !isPromoRoute && !isFormatSortRoute,
  });
  const [design, setDesign] = React.useState<DesignControls>(() => readStoredLayoutDraft());
  const [keyColors, setKeyColors] = React.useState<KeyColors>(() => readStoredColorDraft());
  const [designPreviewOverlay, setDesignPreviewOverlay] = React.useState<DesignPreviewOverlay>({});
  const [keyColorPreviewOverlay, setKeyColorPreviewOverlay] = React.useState<KeyColorPreviewOverlay>({});
  const [workbenchPanelEnabled, setWorkbenchPanelEnabled] = React.useState(false);
  const [workbenchOpen, setWorkbenchOpen] = React.useState(false);
  const [favoritesOpen, setFavoritesOpen] = React.useState(false);
  const [introState, setIntroState] = React.useState<"idle" | "enter" | "playing" | "exit">("idle");
  const [introOverlayActive, setIntroOverlayActive] = React.useState(false);
  const introVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const textRenderingValue = React.useMemo(() => {
    const mode = Math.round(({ ...design, ...designPreviewOverlay }).textRenderingMode);
    if (mode === 1) return "optimizeLegibility";
    if (mode === 2) return "geometricPrecision";
    if (mode === 3) return "optimizeSpeed";
    return "auto";
  }, [design, designPreviewOverlay]);
  const smoothingValue = React.useMemo(() => {
    const mode = Math.round(({ ...design, ...designPreviewOverlay }).textSmoothingMode);
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
  }, [design, designPreviewOverlay]);
  const effectiveDesign = React.useMemo(
    () => normalizeDesignControls({ ...design, ...designPreviewOverlay }),
    [design, designPreviewOverlay]
  );
  const effectiveKeyColors = React.useMemo(
    () => normalizeKeyColors({ ...keyColors, ...keyColorPreviewOverlay }),
    [keyColors, keyColorPreviewOverlay]
  );
  const previewCapabilities = React.useMemo<PreviewCapabilities>(
    () => ({
      token: true,
      component: false,
      placement: false,
      "instance-preview": false,
    }),
    []
  );

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
        "--left-col-width": `${effectiveDesign.desktopLeftColWidth}px`,
        "--table-row-h": `${effectiveDesign.tableRowHeight}px`,
        "--table-cell-px": `${effectiveDesign.tableCellPadX}px`,
        "--table-cell-py": `${effectiveDesign.tableCellPadY}px`,
        "--badge-h": `${effectiveDesign.badgeHeight}px`,
        "--badge-fs": `${effectiveDesign.badgeFontSize}px`,
        "--card-p": `${effectiveDesign.cardPadding}px`,
        "--mat-bg-pink-a": String(effectiveDesign.matBgPinkOpacity),
        "--mat-bg-blue-a": String(effectiveDesign.matBgBlueOpacity),
        "--mat-bg-mint-a": String(effectiveDesign.matBgMintOpacity),
        "--scene-dim-a": String(effectiveDesign.sceneDimOpacity),
        "--mat-card-border-a": String(effectiveDesign.matCardBorderOpacity),
        "--mat-card-shadow-a": String(effectiveDesign.matCardShadowStrength),
        "--mat-card-inset-a": String(effectiveDesign.matCardInsetStrength),
        "--mat-topbar-border-a": String(effectiveDesign.matTopbarBorderOpacity),
        "--topbar-glow-a": String(effectiveDesign.topbarGlowOpacity),
        "--topbar-bg-a": String(effectiveDesign.topbarBgOpacity),
        "--mat-active-glow-a": String(effectiveDesign.matActiveGlowStrength),
        "--mat-button-glow-a": String(effectiveDesign.matButtonGlowStrength),
        "--mat-badge-glow-a": String(effectiveDesign.matBadgeGlowStrength),
        "--mat-row-hover-a": String(effectiveDesign.matRowHoverStrength),
        "--mat-scrollbar-glow-a": String(effectiveDesign.matScrollbarGlowStrength),
        "--designers-card-tint-a": String(effectiveDesign.designersCardTintStrength),
        "--drawer-width": `${effectiveDesign.drawerWidth}px`,
        "--drawer-padding": `${effectiveDesign.drawerPadding}px`,
        "--drawer-title-size": `${effectiveDesign.drawerTitleSize}px`,
        "--drawer-meta-gap": `${effectiveDesign.drawerMetaGap}px`,
        "--drawer-section-gap": `${effectiveDesign.drawerSectionGap}px`,
        "--drawer-mini-dates-fs": `${effectiveDesign.drawerMiniDatesFontSize}px`,
        "--drawer-milestone-date-fs": `${effectiveDesign.drawerMilestoneDateFontSize}px`,
        "--drawer-milestone-row-gap": `${effectiveDesign.drawerMilestoneRowGap}px`,
        "--drawer-calendar-cell-h": `${effectiveDesign.drawerCalendarCellHeight}px`,
        "--drawer-calendar-day-fs": `${effectiveDesign.drawerCalendarDayFontSize}px`,
        "--drawer-calendar-radius": `${effectiveDesign.drawerCalendarRadius}px`,
        "--drawer-calendar-month-tint-a": String(effectiveDesign.drawerCalendarMonthTintOpacity),
        "--drawer-calendar-weekend-tint-a": String(effectiveDesign.drawerCalendarWeekendTintOpacity),
        "--drawer-calendar-holiday-tint-a": String(effectiveDesign.drawerCalendarHolidayTintOpacity),
        "--drawer-milestone-cell-glow-a": String(effectiveDesign.drawerMilestoneCellGlowOpacity),
        "--drawer-milestone-cell-shadow-a": String(effectiveDesign.drawerMilestoneCellShadowOpacity),
        "--drawer-milestone-dot-size": `${effectiveDesign.drawerMilestoneDotSize}px`,
        "--drawer-milestone-label-fs": `${effectiveDesign.drawerMilestoneLabelFontSize}px`,
        "--drawer-milestone-label-maxw": `${effectiveDesign.drawerMilestoneLabelMaxWidth}px`,
        "--drawer-month-label-fs": `${effectiveDesign.drawerMonthLabelFontSize}px`,
        "--drawer-milestone-day-shadow-a": String(effectiveDesign.drawerMilestoneDayShadowOpacity),
        "--drawer-milestone-cell-dark-shadow-a": String(effectiveDesign.drawerMilestoneCellDarkShadowOpacity),
        "--drawer-milestone-cell-dark-shadow-blur": `${effectiveDesign.drawerMilestoneCellDarkShadowBlur}px`,
        "--drawer-panel-border-a": String(effectiveDesign.drawerPanelBorderOpacity),
        "--drawer-panel-shadow-a": String(effectiveDesign.drawerPanelShadowStrength),
        "--drawer-panel-inset-a": String(effectiveDesign.drawerPanelInsetStrength),
        "--drawer-panel-glow-a": String(effectiveDesign.drawerPanelGlowOpacity),
        "--anim-enabled": String(effectiveDesign.animEnabled >= 0.5 ? 1 : 0),
        "--anim-drawer-duration-ms": `${Math.max(0, effectiveDesign.animDrawerDurationMs)}ms`,
        "--anim-reorder-duration-ms": `${Math.max(0, effectiveDesign.animReorderDurationMs)}ms`,
        "--anim-drawer-ease": animationEaseByPreset(effectiveDesign.animDrawerEasePreset),
        "--anim-reorder-ease": animationEaseByPreset(effectiveDesign.animReorderEasePreset),
        "--wb-dock-left": `${effectiveDesign.workbenchDockLeft}px`,
        "--wb-dock-right": `${effectiveDesign.workbenchDockRight}px`,
        "--wb-dock-bottom": `${effectiveDesign.workbenchDockBottom}px`,
        "--wb-width-max": `${effectiveDesign.workbenchWidthMax}px`,
        "--wb-viewport-margin": `${effectiveDesign.workbenchViewportMargin}px`,
        "--wb-body-max-h-vh": `${effectiveDesign.workbenchBodyMaxHeightVh}vh`,
        "--wb-body-padding": `${effectiveDesign.workbenchBodyPadding}px`,
        "--wb-main-gap": `${effectiveDesign.workbenchMainGap}px`,
        "--wb-tabs-gap": `${effectiveDesign.workbenchTabsGap}px`,
        "--wb-tab-fs": `${effectiveDesign.workbenchTabFontSize}px`,
        "--wb-tab-py": `${effectiveDesign.workbenchTabPadY}px`,
        "--wb-tab-px": `${effectiveDesign.workbenchTabPadX}px`,
        "--wb-side-w": `${effectiveDesign.workbenchSideWidth}px`,
        "--wb-grid-min-col": `${effectiveDesign.workbenchGridMinCol}px`,
        "--wb-grid-gap": `${effectiveDesign.workbenchGridGap}px`,
        "--wb-group-padding": `${effectiveDesign.workbenchGroupPadding}px`,
        "--wb-control-gap": `${effectiveDesign.workbenchControlGap}px`,
        "--wb-action-btn-fs": `${effectiveDesign.workbenchActionBtnFontSize}px`,
        "--wb-action-btn-py": `${effectiveDesign.workbenchActionBtnPadY}px`,
        "--wb-action-btn-px": `${effectiveDesign.workbenchActionBtnPadX}px`,
        "--wb-slider-w": `${effectiveDesign.workbenchSliderWidth}px`,
        "--wb-number-w": `${effectiveDesign.workbenchNumberWidth}px`,
        "--wb-label-min": `${effectiveDesign.workbenchLabelMinWidth}px`,
        "--wb-color-text-w": `${effectiveDesign.workbenchColorTextWidth}px`,
        "--wb-label-fs": `${effectiveDesign.workbenchControlLabelFontSize}px`,
        "--wb-input-fs": `${effectiveDesign.workbenchControlInputFontSize}px`,
        "--key-pink": effectiveKeyColors.keyPink,
        "--key-blue": effectiveKeyColors.keyBlue,
        "--key-mint": effectiveKeyColors.keyMint,
        "--key-violet": effectiveKeyColors.keyViolet,
        "--key-milestone": effectiveKeyColors.keyMilestone,
        "--key-cursor-trail": effectiveKeyColors.keyCursorTrail,
        "--key-left-pill-text": effectiveKeyColors.keyLeftPillText,
        "--key-surface-top": effectiveKeyColors.keySurfaceTop,
        "--key-surface-bottom": effectiveKeyColors.keySurfaceBottom,
        "--key-surface-alt": effectiveKeyColors.keySurfaceAlt,
        "--key-drawer-surface-top": effectiveKeyColors.keyDrawerSurfaceTop,
        "--key-drawer-surface-bottom": effectiveKeyColors.keyDrawerSurfaceBottom,
        "--key-drawer-surface-alt": effectiveKeyColors.keyDrawerSurfaceAlt,
        "--key-text": effectiveKeyColors.keyText,
        "--key-btn-grad-from": effectiveKeyColors.keyBtnGradFrom,
        "--key-btn-grad-to": effectiveKeyColors.keyBtnGradTo,
        "--key-btn-hover-from": effectiveKeyColors.keyBtnHoverFrom,
        "--key-btn-hover-to": effectiveKeyColors.keyBtnHoverTo,
        "--key-nav-btn-from": effectiveKeyColors.keyNavBtnFrom,
        "--key-nav-btn-to": effectiveKeyColors.keyNavBtnTo,
        "--key-nav-active-from": effectiveKeyColors.keyNavActiveFrom,
        "--key-nav-active-to": effectiveKeyColors.keyNavActiveTo,
        "--key-backdrop-left": effectiveKeyColors.keyBackdropLeft,
        "--key-backdrop-right": effectiveKeyColors.keyBackdropRight,
        "--key-backdrop-bottom": effectiveKeyColors.keyBackdropBottom,
        "--key-app-bg-top": effectiveKeyColors.keyAppBgTop,
        "--key-app-bg-mid": effectiveKeyColors.keyAppBgMid,
        "--key-app-bg-bottom": effectiveKeyColors.keyAppBgBottom,
        "--key-app-bg-base": effectiveKeyColors.keyAppBgBase,
        "--key-topbar-glow": effectiveKeyColors.keyTopbarGlow,
        "--key-drawer-panel-glow-left": effectiveKeyColors.keyDrawerPanelGlowLeft,
        "--key-drawer-panel-glow-right": effectiveKeyColors.keyDrawerPanelGlowRight,
        "--key-drawer-panel-glow-bottom": effectiveKeyColors.keyDrawerPanelGlowBottom,
        "--key-drawer-ms-storyboard": effectiveKeyColors.keyDrawerMsStoryboard,
        "--key-drawer-ms-animatic": effectiveKeyColors.keyDrawerMsAnimatic,
        "--key-drawer-ms-feedback": effectiveKeyColors.keyDrawerMsFeedback,
        "--key-drawer-ms-prefinal": effectiveKeyColors.keyDrawerMsPrefinal,
        "--key-drawer-ms-final": effectiveKeyColors.keyDrawerMsFinal,
        "--key-drawer-ms-master": effectiveKeyColors.keyDrawerMsMaster,
        "--key-drawer-ms-onair": effectiveKeyColors.keyDrawerMsOnair,
        "--key-drawer-ms-start": effectiveKeyColors.keyDrawerMsStart,
        "--key-drawer-ms-default": effectiveKeyColors.keyDrawerMsDefault,
        "--task-color-1": effectiveKeyColors.taskColor1,
        "--task-color-2": effectiveKeyColors.taskColor2,
        "--task-color-3": effectiveKeyColors.taskColor3,
        "--task-color-4": effectiveKeyColors.taskColor4,
        "--task-color-5": effectiveKeyColors.taskColor5,
        "--task-color-6": effectiveKeyColors.taskColor6,
        "--task-color-7": effectiveKeyColors.taskColor7,
        "--task-color-8": effectiveKeyColors.taskColor8,
        textRendering: textRenderingValue,
        WebkitFontSmoothing: smoothingValue.webkit,
        MozOsxFontSmoothing: smoothingValue.moz,
      }) as React.CSSProperties,
    [effectiveDesign, effectiveKeyColors, smoothingValue, textRenderingValue]
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
  const isMainTimelineRoute = location.pathname === "/";
  const isMiniAppRoute =
    location.pathname === "/app" || location.pathname === "/m" || location.pathname === "/mobile";
  const handleBrandClick = React.useCallback(() => {
    if (isMainTimelineRoute) {
      startLogoIntro();
      return;
    }

    void navigate("/");
  }, [isMainTimelineRoute, navigate, startLogoIntro]);

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
        effectiveDesign,
        setDesign,
        saveDesign,
        loadDesign,
        loadDeployDesign,
        resetDesign,
        keyColors,
        effectiveKeyColors,
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
        previewCapabilities,
        setDesignPreviewOverlay,
        setKeyColorPreviewOverlay,
      }}
    >
      <InspectorNodeBoundary label="App shell" kind="content" sourcePath="apps/web/src/components/Layout.tsx">
      <div className={appShellClassName} style={layoutVarsStyle} data-inspector-host-root="true">
        {!isMiniAppRoute && !isPromoRoute && !isFormatSortRoute ? (
          <InspectorNodeBoundary
            label="App topbar"
            kind="content"
            semanticTargetId="app.chrome.topbar"
            sourcePath="apps/web/src/components/Layout.tsx"
          >
          <div className="topbar" data-inspector-target-id="app.chrome.topbar">
            <div className="nav">
              <div className="brand">
                <button
                  type="button"
                  className="brandIconButton"
                  onClick={handleBrandClick}
                  aria-label={isMainTimelineRoute ? "Play logo intro" : "Open DTM table"}
                >
                  <img className="brandIcon" src={brandIconUrl} alt="" aria-hidden="true" />
                </button>
                <div className="brandText">
                  <strong>{ui.appTitle}</strong>
                  <span className="muted">{ui.appSubtitle}</span>
                </div>
                <nav className="sectionSwitch" aria-label="Основные разделы">
                  {PRIMARY_SECTION_LINKS.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) => `sectionSwitchTab adminTabButton ${isActive ? "isActive" : ""}`}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            </div>
          </div>
          </InspectorNodeBoundary>
        ) : null}
        <InspectorNodeBoundary label="App content" kind="content" sourcePath="apps/web/src/components/Layout.tsx">
          <div className={containerClassName}>{props.children}</div>
        </InspectorNodeBoundary>
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
          <InspectorNodeBoundary
            label="Workbench dock"
            kind="content"
            semanticTargetId="app.workbench.dock"
            sourcePath="apps/web/src/components/Layout.tsx"
          >
            <div className="controlDock" data-inspector-target-id="app.workbench.dock">
              <ControlsWorkbench />
            </div>
          </InspectorNodeBoundary>
        ) : null}
      </div>
      </InspectorNodeBoundary>
      {props.inspectorMount ?? null}
    </LayoutContext.Provider>
  );
}
