import React from "react";
import { KEY_COLOR_ITEMS, normalizeKeyColors, TASK_PALETTE_ITEMS } from "../design/colors";
import {
  DESIGN_CONTROL_ITEMS,
  DESIGN_CONTROLS_PUBLIC_PATH,
  normalizeDesignControls,
} from "../design/controls";
import {
  WORKBENCH_LAYOUT,
  type WorkbenchControlRef,
  type WorkbenchSectionConfig,
  type WorkbenchTabId,
} from "../design/workbenchLayout";
import { DEFAULT_RUNTIME_DEFAULTS, normalizeRuntimeDefaults } from "../data/runtimeDefaults";
import { LayoutContext } from "./Layout";

const FAVORITES_STORAGE_KEY = "dtm.web.workbench.favorites.v1";

type ResolvedControl = {
  id: string;
  key: string;
  kind: "range" | "color";
  label: string;
  rangeItem?: (typeof DESIGN_CONTROL_ITEMS)[number];
  colorItem?: (typeof KEY_COLOR_ITEMS)[number];
};

function isBinaryRange(item: (typeof DESIGN_CONTROL_ITEMS)[number]): boolean {
  return item.min === 0 && item.max === 1 && item.step === 1;
}

function FavoriteStar({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path
        d="M12 2.8l2.8 5.68 6.27.91-4.54 4.43 1.07 6.26L12 17.14 6.4 20.08l1.07-6.26L2.93 9.39l6.27-.91L12 2.8z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BinaryIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      {active ? (
        <path
          d="M7 12.5l3.2 3.2L17.4 8.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function ControlsWorkbench() {
  const ctx = React.useContext(LayoutContext);
  const [open, setOpen] = React.useState(false);
  const [favoritesOpen, setFavoritesOpen] = React.useState(false);
  const [tab, setTab] = React.useState<WorkbenchTabId>(WORKBENCH_LAYOUT[0]?.id ?? "material");
  const [query, setQuery] = React.useState("");
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [panelMapTarget, setPanelMapTarget] = React.useState<"scene" | "drawer">("drawer");
  const importRef = React.useRef<HTMLInputElement | null>(null);

  if (!ctx) return null;
  const {
    locale,
    design,
    keyColors,
    setDesign,
    setKeyColors,
    saveDesign,
    loadDesign,
    loadDeployDesign,
    resetDesign,
    resetKeyColors,
    ui,
    filters,
    setFilters,
    runtimeDefaults,
    setRuntimeDefaults,
    snapshotState,
  } = ctx;
  const {
    demoMode,
    toggleDemoMode,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    refreshIntervalMs,
    setRefreshIntervalMs,
    setLoadLimit,
  } = snapshotState;

  const pickLocaleText = React.useCallback(
    (value: string) => {
      const sep = " / ";
      const cut = value.indexOf(sep);
      if (cut < 0) return value;
      const ru = value.slice(0, cut).trim();
      const en = value.slice(cut + sep.length).trim();
      return locale === "en" ? en : ru;
    },
    [locale]
  );

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setFavorites(parsed.filter((v): v is string => typeof v === "string"));
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  const exportPreset = () => {
    const payload = { design, keyColors, runtimeDefaults };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design-controls.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeByKey = React.useMemo(() => {
    const map = new Map<string, (typeof DESIGN_CONTROL_ITEMS)[number]>();
    for (const item of DESIGN_CONTROL_ITEMS) map.set(String(item.key), item);
    return map;
  }, []);

  const colorByKey = React.useMemo(() => {
    const map = new Map<string, (typeof KEY_COLOR_ITEMS)[number]>();
    for (const item of [...KEY_COLOR_ITEMS, ...TASK_PALETTE_ITEMS]) {
      if (!map.has(String(item.key))) map.set(String(item.key), item);
    }
    return map;
  }, []);

  React.useEffect(() => {
    if (!import.meta.env.DEV) return;

    const knownRange = new Set(DESIGN_CONTROL_ITEMS.map((item) => String(item.key)));
    const knownColor = new Set([...KEY_COLOR_ITEMS, ...TASK_PALETTE_ITEMS].map((item) => String(item.key)));
    const rangeSeen = new Map<string, number>();

    for (const section of WORKBENCH_LAYOUT) {
      for (const group of section.groups) {
        if (group.controls.length === 0) console.warn("[workbench-layout] Empty group:", section.id, group.title);
        if (group.controls.length > 6) {
          console.warn("[workbench-layout] Group has more than 6 controls:", section.id, group.title, group.controls.length);
        }
        for (const control of group.controls) {
          const key = String(control.key);
          if (control.kind === "range") {
            rangeSeen.set(key, (rangeSeen.get(key) ?? 0) + 1);
            if (!knownRange.has(key)) console.warn("[workbench-layout] Unknown range key:", section.id, group.title, key);
          } else if (!knownColor.has(key)) {
            console.warn("[workbench-layout] Unknown color key:", section.id, group.title, key);
          }
        }
      }
    }

    for (const [key, count] of rangeSeen) {
      if (count > 1) console.warn("[workbench-layout] Duplicate range key across groups:", key, count);
    }

    for (const key of knownRange) {
      if (!rangeSeen.has(key)) console.warn("[workbench-layout] Range key not assigned in layout:", key);
    }
  }, []);

  const resolveControl = React.useCallback(
    (ref: WorkbenchControlRef): ResolvedControl | null => {
      if (ref.kind === "range") {
        const item = rangeByKey.get(String(ref.key));
        if (!item) return null;
        return {
          id: `range:${String(ref.key)}`,
          key: String(ref.key),
          kind: "range",
          label: item.label,
          rangeItem: item,
        };
      }
      const item = colorByKey.get(String(ref.key));
      if (!item) return null;
      return {
        id: `color:${String(ref.key)}`,
        key: String(ref.key),
        kind: "color",
        label: item.label,
        colorItem: item,
      };
    },
    [rangeByKey, colorByKey]
  );

  const selectedSection = React.useMemo(
    () => WORKBENCH_LAYOUT.find((section) => section.id === tab) ?? WORKBENCH_LAYOUT[0],
    [tab]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const allResolvedControls = React.useMemo(() => {
    const all: ResolvedControl[] = [];
    for (const section of WORKBENCH_LAYOUT) {
      for (const group of section.groups) {
        for (const control of group.controls) {
          const resolved = resolveControl(control);
          if (resolved) all.push(resolved);
        }
      }
    }
    return Array.from(new Map(all.map((item) => [item.id, item])).values());
  }, [resolveControl]);

  const favoriteControls = React.useMemo(() => {
    const fav = new Set(favorites);
    return allResolvedControls.filter((item) => fav.has(item.id));
  }, [allResolvedControls, favorites]);

  const groupsForRender = React.useMemo(() => {
    if (!selectedSection) return [] as Array<{ title: string; controls: ResolvedControl[] }>;

    const groups: Array<{ title: string; controls: ResolvedControl[] }> = [];

    for (const group of selectedSection.groups) {
      const resolved = group.controls
        .map((control) => resolveControl(control))
        .filter((control): control is ResolvedControl => control !== null);

      const titleMatch = normalizedQuery.length > 0 && group.title.toLowerCase().includes(normalizedQuery);
      const filtered =
        normalizedQuery.length === 0 || titleMatch
          ? resolved
          : resolved.filter(
              (control) =>
                control.label.toLowerCase().includes(normalizedQuery) || control.key.toLowerCase().includes(normalizedQuery)
            );

      if (filtered.length > 0) groups.push({ title: group.title, controls: filtered });
    }

    return groups.sort((a, b) => b.controls.length - a.controls.length);
  }, [selectedSection, resolveControl, normalizedQuery]);

  const toggleFavorite = React.useCallback((id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const renderControl = (control: ResolvedControl) => {
    const isFav = favorites.includes(control.id);

    if (control.kind === "range" && control.rangeItem) {
      const item = control.rangeItem;
      const binary = isBinaryRange(item);
      return (
        <label key={control.id} className={`wbCtrl ${binary ? "wbCtrlToggle" : ""}`}>
          <button
            type="button"
            className={`wbFavBtn ${isFav ? "active" : ""}`}
            onClick={() => toggleFavorite(control.id)}
            title="Favorite"
            aria-label="Favorite"
          >
            <FavoriteStar active={isFav} />
          </button>
          <span>{item.label}</span>
          {binary ? (
            <button
              type="button"
              className={`wbBinaryBtn ${design[item.key] >= 0.5 ? "active" : ""}`}
              title={`${item.label}: ${design[item.key] >= 0.5 ? (locale === "en" ? "on" : "вкл") : locale === "en" ? "off" : "выкл"}`}
              aria-label={`${item.label}: ${design[item.key] >= 0.5 ? (locale === "en" ? "on" : "вкл") : locale === "en" ? "off" : "выкл"}`}
              onClick={() => {
                setDesign((prev) => ({ ...prev, [item.key]: prev[item.key] >= 0.5 ? 0 : 1 }));
              }}
            >
              <BinaryIcon active={design[item.key] >= 0.5} />
            </button>
          ) : (
            <>
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
            </>
          )}
        </label>
      );
    }

    if (control.kind === "color" && control.colorItem) {
      const item = control.colorItem;
      return (
        <label key={control.id} className="wbColorCtrl">
          <button
            type="button"
            className={`wbFavBtn ${isFav ? "active" : ""}`}
            onClick={() => toggleFavorite(control.id)}
            title="Favorite"
            aria-label="Favorite"
          >
            <FavoriteStar active={isFav} />
          </button>
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
      );
    }

    return null;
  };

  const renderSection = (section: WorkbenchSectionConfig | undefined) => {
    if (!section) return null;
    if (section.id === "defaults") {
      return (
        <div className="wbGrid">
          <section className="wbGroup">
            <h4>{locale === "en" ? "Defaults for next session" : "Параметры новой сессии"}</h4>
            <div className="wbGroupBody">
              <label className="wbCtrl wbCtrlToggle wbCtrlToggleBare">
                <span>{locale === "en" ? "Default demo mode" : "Демо режим по умолчанию"}</span>
                <button
                  type="button"
                  className={`wbBinaryBtn ${runtimeDefaults.demoMode ? "active" : ""}`}
                  title={
                    locale === "en"
                      ? runtimeDefaults.demoMode
                        ? "Default demo mode on"
                        : "Default demo mode off"
                      : runtimeDefaults.demoMode
                        ? "Демо по умолчанию включен"
                        : "Демо по умолчанию выключен"
                  }
                  aria-label={locale === "en" ? "Demo mode" : "Демо режим"}
                  onClick={() => {
                    setRuntimeDefaults((prev) => ({ ...prev, demoMode: !prev.demoMode }));
                  }}
                >
                  <BinaryIcon active={runtimeDefaults.demoMode} />
                </button>
              </label>

              <label className="wbCtrl">
                <span>{locale === "en" ? "Default display limit" : "Лимит отображения по умолчанию"}</span>
                <input
                  type="range"
                  min={1}
                  max={200}
                  step={1}
                  value={Math.max(1, Math.min(200, Math.round(runtimeDefaults.displayLimit || 30)))}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setRuntimeDefaults((prev) => ({
                      ...prev,
                      displayLimit: Number.isFinite(next) ? next : prev.displayLimit,
                    }));
                  }}
                />
                <input
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  value={Math.max(1, Math.min(200, Math.round(runtimeDefaults.displayLimit || 30)))}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setRuntimeDefaults((prev) => ({
                      ...prev,
                      displayLimit: Number.isFinite(next) ? next : prev.displayLimit,
                    }));
                  }}
                />
              </label>

              <label className="wbCtrl">
                <span>{locale === "en" ? "Default load limit" : "Лимит загрузки по умолчанию"}</span>
                <input
                  type="range"
                  min={1}
                  max={200}
                  step={1}
                  value={Math.max(1, Math.min(200, Math.round(runtimeDefaults.loadLimit || 30)))}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setRuntimeDefaults((prev) => ({
                      ...prev,
                      loadLimit: Number.isFinite(next) ? next : prev.loadLimit,
                    }));
                  }}
                />
                <input
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  value={Math.max(1, Math.min(200, Math.round(runtimeDefaults.loadLimit || 30)))}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setRuntimeDefaults((prev) => ({
                      ...prev,
                      loadLimit: Number.isFinite(next) ? next : prev.loadLimit,
                    }));
                  }}
                />
              </label>

              <label className="wbCtrl">
                <span>{locale === "en" ? "Default auto refresh sec" : "Автообновление по умолчанию (сек)"}</span>
                <input
                  type="range"
                  min={0}
                  max={300}
                  step={1}
                  value={Math.max(0, Math.min(300, Math.round(runtimeDefaults.refreshIntervalSec || 0)))}
                  onChange={(e) =>
                    setRuntimeDefaults((prev) => ({ ...prev, refreshIntervalSec: Number(e.target.value) }))
                  }
                />
                <input
                  type="number"
                  min={0}
                  max={300}
                  step={1}
                  value={Math.max(0, Math.min(300, Math.round(runtimeDefaults.refreshIntervalSec || 0)))}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setRuntimeDefaults((prev) => ({
                      ...prev,
                      refreshIntervalSec: Number.isFinite(next) ? next : prev.refreshIntervalSec,
                    }));
                  }}
                />
              </label>
            </div>
          </section>

          <section className="wbGroup">
            <h4>{locale === "en" ? "Task statuses" : "Статусы задач"}</h4>
            <div className="wbGroupBody">
              <label className="wbCtrl wbCtrlToggle wbCtrlToggleBare">
                <span>{locale === "en" ? "Default date filter" : "Фильтр по дате по умолчанию"}</span>
                <button
                  type="button"
                  className={`wbBinaryBtn ${runtimeDefaults.dateFilterEnabled ? "active" : ""}`}
                  title={locale === "en" ? "Default date filter" : "Фильтр по дате по умолчанию"}
                  aria-label={locale === "en" ? "Date filter enabled" : "Фильтр по дате включён"}
                  onClick={() =>
                    setRuntimeDefaults((prev) => ({ ...prev, dateFilterEnabled: !prev.dateFilterEnabled }))
                  }
                >
                  <BinaryIcon active={runtimeDefaults.dateFilterEnabled} />
                </button>
              </label>
              <label className="wbCtrl wbCtrlToggle wbCtrlToggleBare">
                <span>{locale === "en" ? "Default In work" : "В работе по умолчанию"}</span>
                <button
                  type="button"
                  className={`wbBinaryBtn ${runtimeDefaults.statusWork ? "active" : ""}`}
                  title={locale === "en" ? "Default In work" : "В работе по умолчанию"}
                  aria-label={locale === "en" ? "In work" : "В работе"}
                  onClick={() => setRuntimeDefaults((prev) => ({ ...prev, statusWork: !prev.statusWork }))}
                >
                  <BinaryIcon active={runtimeDefaults.statusWork} />
                </button>
              </label>
              <label className="wbCtrl wbCtrlToggle wbCtrlToggleBare">
                <span>{locale === "en" ? "Default Pre done" : "Почти готово по умолчанию"}</span>
                <button
                  type="button"
                  className={`wbBinaryBtn ${runtimeDefaults.statusPreDone ? "active" : ""}`}
                  title={locale === "en" ? "Default Pre done" : "Почти готово по умолчанию"}
                  aria-label={locale === "en" ? "Pre done" : "Почти готово"}
                  onClick={() =>
                    setRuntimeDefaults((prev) => ({ ...prev, statusPreDone: !prev.statusPreDone }))
                  }
                >
                  <BinaryIcon active={runtimeDefaults.statusPreDone} />
                </button>
              </label>
              <label className="wbCtrl wbCtrlToggle wbCtrlToggleBare">
                <span>{locale === "en" ? "Default Done" : "Готово по умолчанию"}</span>
                <button
                  type="button"
                  className={`wbBinaryBtn ${runtimeDefaults.statusDone ? "active" : ""}`}
                  title={locale === "en" ? "Default Done" : "Готово по умолчанию"}
                  aria-label={locale === "en" ? "Done" : "Готово"}
                  onClick={() => setRuntimeDefaults((prev) => ({ ...prev, statusDone: !prev.statusDone }))}
                >
                  <BinaryIcon active={runtimeDefaults.statusDone} />
                </button>
              </label>
              <label className="wbCtrl wbCtrlToggle wbCtrlToggleBare">
                <span>{locale === "en" ? "Default Waiting" : "Ждёт по умолчанию"}</span>
                <button
                  type="button"
                  className={`wbBinaryBtn ${runtimeDefaults.statusWait ? "active" : ""}`}
                  title={locale === "en" ? "Default Waiting" : "Ждёт по умолчанию"}
                  aria-label={locale === "en" ? "Waiting" : "Ждёт"}
                  onClick={() => setRuntimeDefaults((prev) => ({ ...prev, statusWait: !prev.statusWait }))}
                >
                  <BinaryIcon active={runtimeDefaults.statusWait} />
                </button>
              </label>
              <button
                type="button"
                className="wbDefaultResetBtn"
                onClick={() => {
                  setRuntimeDefaults(DEFAULT_RUNTIME_DEFAULTS);
                }}
              >
                {locale === "en" ? "Reset defaults values" : "Сбросить значения defaults"}
              </button>
              <button
                type="button"
                className="wbDefaultResetBtn"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    displayLimit: runtimeDefaults.displayLimit,
                    loadLimit: runtimeDefaults.loadLimit,
                  }));
                  setLoadLimit(runtimeDefaults.loadLimit);
                  setRefreshIntervalMs(runtimeDefaults.refreshIntervalSec * 1000);
                  setDateFilter({ ...dateFilter, enabled: runtimeDefaults.dateFilterEnabled });
                  setStatusFilter({
                    work: runtimeDefaults.statusWork,
                    preDone: runtimeDefaults.statusPreDone,
                    done: runtimeDefaults.statusDone,
                    wait: runtimeDefaults.statusWait,
                  });
                  if (demoMode !== runtimeDefaults.demoMode) {
                    void toggleDemoMode();
                  }
                }}
              >
                {locale === "en" ? "Apply defaults now" : "Применить defaults сейчас"}
              </button>
            </div>
          </section>
        </div>
      );
    }
    const showPanelsGuide = section.id === "panelGuide";
    const panelGlowLeft = panelMapTarget === "scene" ? keyColors.keyBackdropLeft : keyColors.keyDrawerPanelGlowLeft;
    const panelGlowRight = panelMapTarget === "scene" ? keyColors.keyBackdropRight : keyColors.keyDrawerPanelGlowRight;
    const panelGlowBottom = panelMapTarget === "scene" ? keyColors.keyBackdropBottom : keyColors.keyDrawerPanelGlowBottom;
    const panelSurfaceTop = panelMapTarget === "scene" ? keyColors.keySurfaceTop : keyColors.keyDrawerSurfaceTop;
    const panelSurfaceBottom = panelMapTarget === "scene" ? keyColors.keySurfaceBottom : keyColors.keyDrawerSurfaceBottom;
    const panelSurfaceAlt = panelMapTarget === "scene" ? keyColors.keySurfaceAlt : keyColors.keyDrawerSurfaceAlt;

    const setPanelGlowLeft = (value: string) => {
      setKeyColors((prev) =>
        panelMapTarget === "scene" ? { ...prev, keyBackdropLeft: value } : { ...prev, keyDrawerPanelGlowLeft: value }
      );
    };
    const setPanelGlowRight = (value: string) => {
      setKeyColors((prev) =>
        panelMapTarget === "scene" ? { ...prev, keyBackdropRight: value } : { ...prev, keyDrawerPanelGlowRight: value }
      );
    };
    const setPanelGlowBottom = (value: string) => {
      setKeyColors((prev) =>
        panelMapTarget === "scene" ? { ...prev, keyBackdropBottom: value } : { ...prev, keyDrawerPanelGlowBottom: value }
      );
    };
    const setPanelSurfaceTop = (value: string) => {
      setKeyColors((prev) =>
        panelMapTarget === "scene" ? { ...prev, keySurfaceTop: value } : { ...prev, keyDrawerSurfaceTop: value }
      );
    };
    const setPanelSurfaceBottom = (value: string) => {
      setKeyColors((prev) =>
        panelMapTarget === "scene" ? { ...prev, keySurfaceBottom: value } : { ...prev, keyDrawerSurfaceBottom: value }
      );
    };
    const setPanelSurfaceAlt = (value: string) => {
      setKeyColors((prev) =>
        panelMapTarget === "scene" ? { ...prev, keySurfaceAlt: value } : { ...prev, keyDrawerSurfaceAlt: value }
      );
    };

    return (
      <div className="wbGrid">
        {showPanelsGuide ? (
          <section className="wbGroup wbPanelMap">
            <h4>{locale === "en" ? "Interactive panel map" : "Интерактивная схема панели"}</h4>
            <div className="wbPanelMapMode">
              <span>{locale === "en" ? "Apply to" : "Применять к"}</span>
              <select
                value={panelMapTarget}
                onChange={(e) => setPanelMapTarget(e.target.value === "scene" ? "scene" : "drawer")}
              >
                <option value="drawer">{locale === "en" ? "Task drawer panels" : "Панели карточки задачи"}</option>
                <option value="scene">{locale === "en" ? "Scene / table background" : "Фон сцены / таблицы"}</option>
              </select>
            </div>
            <div
              className={`wbPanelMapScene ${panelMapTarget === "scene" ? "targetScene" : "targetDrawer"}`}
              style={
                panelMapTarget === "scene"
                  ? { background: "var(--scene-bg-image)", backgroundAttachment: "fixed, fixed, fixed, fixed, fixed, fixed" }
                  : undefined
              }
            >
              <div className="wbPanelMapCard" />

              <label className="wbPanelMapPoint p-left-glow">
                <span>{locale === "en" ? "Left glow" : "Левый глоу"}</span>
                <input
                  type="color"
                  value={panelGlowLeft}
                  onChange={(e) => setPanelGlowLeft(e.target.value)}
                />
              </label>

              <label className="wbPanelMapPoint p-right-glow">
                <span>{locale === "en" ? "Right glow" : "Правый глоу"}</span>
                <input
                  type="color"
                  value={panelGlowRight}
                  onChange={(e) => setPanelGlowRight(e.target.value)}
                />
              </label>

              <label className="wbPanelMapPoint p-bottom-glow">
                <span>{locale === "en" ? "Bottom glow" : "Нижний глоу"}</span>
                <input
                  type="color"
                  value={panelGlowBottom}
                  onChange={(e) => setPanelGlowBottom(e.target.value)}
                />
              </label>

              <label className="wbPanelMapPoint p-panel-top">
                <span>{locale === "en" ? "Panel top" : "Верх панели"}</span>
                <input
                  type="color"
                  value={panelSurfaceTop}
                  onChange={(e) => setPanelSurfaceTop(e.target.value)}
                />
              </label>

              <label className="wbPanelMapPoint p-panel-bottom">
                <span>{locale === "en" ? "Panel bottom" : "Низ панели"}</span>
                <input
                  type="color"
                  value={panelSurfaceBottom}
                  onChange={(e) => setPanelSurfaceBottom(e.target.value)}
                />
              </label>

              <label className="wbPanelMapPoint p-panel-alt">
                <span>{locale === "en" ? "Panel alt" : "Альт панели"}</span>
                <input
                  type="color"
                  value={panelSurfaceAlt}
                  onChange={(e) => setPanelSurfaceAlt(e.target.value)}
                />
              </label>

            </div>
          </section>
        ) : null}
        {groupsForRender.map((group) => (
          <section key={`${section.id}:${group.title}`} className="wbGroup">
              <h4>{pickLocaleText(group.title)}</h4>
              <div className="wbGroupBody">{group.controls.map((control) => renderControl(control))}</div>
            </section>
          ))}
      </div>
    );
  };

  return (
    <>
      <div className={`workbench ${open ? "open" : ""}`}>
        <button className="workbenchToggle" onClick={() => setOpen((v) => !v)}>
          {open ? ui.workbench.toggleHide : ui.workbench.toggleShow}
        </button>

        {open ? (
          <div className="workbenchBody">
            <div className="workbenchMain">
              <div>
                <div className="workbenchTabs">
                  {WORKBENCH_LAYOUT.map((section) => (
                    <button
                      key={section.id}
                      className={`workbenchTab ${tab === section.id ? "active" : ""}`}
                      onClick={() => setTab(section.id)}
                    >
                      {pickLocaleText(section.title)}
                    </button>
                  ))}
                </div>

                <div className="workbenchContent">{renderSection(selectedSection)}</div>
              </div>

              <aside className="workbenchSideActions">
                <div className="muted workbenchDeployHint">
                  {ui.workbench.deployPathLabel}: <code>{DESIGN_CONTROLS_PUBLIC_PATH}</code>
                </div>
                <div className="workbenchActionGrid">
                  <button onClick={saveDesign}>{ui.workbench.save}</button>
                  <button onClick={loadDesign}>{ui.workbench.load}</button>
                  <button
                    onClick={() => {
                      resetDesign();
                      resetKeyColors();
                    }}
                  >
                    {ui.workbench.reset}
                  </button>
                  <button onClick={exportPreset}>{ui.workbench.export}</button>
                  <button onClick={() => importRef.current?.click()}>{ui.workbench.import}</button>
                  <button onClick={() => void loadDeployDesign()}>{ui.workbench.deploy}</button>
                </div>

                <div className="wbToolbar wbToolbarSide">
                  <input
                    className="wbSearch"
                    type="search"
                    placeholder={locale === "en" ? "Search controls" : "Поиск параметров"}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

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
                        setRuntimeDefaults(
                          rec.runtimeDefaults && typeof rec.runtimeDefaults === "object"
                            ? normalizeRuntimeDefaults(rec.runtimeDefaults as Record<string, unknown>)
                            : runtimeDefaults
                        );
                      } else {
                        setDesign(normalizeDesignControls(parsed));
                      }
                    } catch {
                      // ignore
                    } finally {
                      e.target.value = "";
                    }
                  }}
                />
              </aside>
            </div>
          </div>
        ) : null}
      </div>

      <aside className={`favoritesPanel favoritesPanelDetached ${favoritesOpen ? "open" : ""}`}>
        <button className="favoritesPanelToggle" onClick={() => setFavoritesOpen((v) => !v)}>
          {favoritesOpen
            ? locale === "en"
              ? "Hide favorites"
              : "Скрыть избранное"
            : locale === "en"
              ? "Show favorites"
              : "Показать избранное"}
        </button>
        {favoritesOpen ? (
          <div className="favoritesPanelBody">
            <section className="wbGroup wbFavPanel">
              <h4>{locale === "en" ? "Favorites" : "Избранное"}</h4>
              <div className="wbGroupBody">
                {favoriteControls.length > 0 ? (
                  favoriteControls.map((control) => renderControl(control))
                ) : (
                  <div className="muted">{locale === "en" ? "No favorites yet" : "Пока нет избранных"}</div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </aside>
    </>
  );
}
