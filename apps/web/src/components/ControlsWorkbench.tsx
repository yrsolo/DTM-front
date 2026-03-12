import React from "react";
import { KEY_COLOR_ITEMS, normalizeKeyColors, TASK_PALETTE_ITEMS } from "../design/colors";
import {
  ALL_DESIGN_CONTROL_ITEMS,
  DESIGN_CONTROLS_PUBLIC_PATH,
  normalizeDesignControls,
} from "../design/controls";
import {
  WORKBENCH_LAYOUT,
  resolveWorkbenchTabId,
  validateWorkbenchLayout,
  type WorkbenchControlRef,
  type WorkbenchSectionConfig,
  type WorkbenchTabId,
} from "../design/workbenchLayout";
import { DEFAULT_RUNTIME_DEFAULTS, normalizeRuntimeDefaults } from "../data/runtimeDefaults";
import {
  type PresetKind,
  type PresetSummary,
  loadBuiltinPresetCatalog,
  loadCloudPresetCatalog,
  loadColorPresetAsset,
  loadLayoutPresetAsset,
  mergePresetCatalogs,
  readStoredActivePresetId,
  writeStoredActivePresetId,
} from "../design/presets";
import { getAuthRequestBase } from "../config/runtimeContour";
import { LayoutContext } from "./Layout";

const FAVORITES_STORAGE_KEY = "dtm.web.workbench.favorites.v1";
const WORKBENCH_TAB_STORAGE_KEY = "dtm.web.workbench.tab.v2";
type RangeItem = (typeof ALL_DESIGN_CONTROL_ITEMS)[number];

type ResolvedControl = {
  id: string;
  key: string;
  kind: "range" | "color";
  label: string;
  rangeItem?: RangeItem;
  colorItem?: (typeof KEY_COLOR_ITEMS)[number];
};

function isBinaryRange(item: RangeItem): boolean {
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
  const [tab, setTab] = React.useState<WorkbenchTabId>(() => {
    try {
      return resolveWorkbenchTabId(localStorage.getItem(WORKBENCH_TAB_STORAGE_KEY));
    } catch {
      return WORKBENCH_LAYOUT[0]?.id ?? "foundation";
    }
  });
  const [query, setQuery] = React.useState("");
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [panelMapTarget, setPanelMapTarget] = React.useState<"scene" | "drawer">("drawer");
  const [activeColorPresetId, setActiveColorPresetId] = React.useState<string | null>(() =>
    readStoredActivePresetId("color")
  );
  const [activeLayoutPresetId, setActiveLayoutPresetId] = React.useState<string | null>(() =>
    readStoredActivePresetId("layout")
  );
  const [colorPresets, setColorPresets] = React.useState<PresetSummary[]>([]);
  const [layoutPresets, setLayoutPresets] = React.useState<PresetSummary[]>([]);
  const [cloudCatalogAvailable, setCloudCatalogAvailable] = React.useState({ color: false, layout: false });
  const [presetNotice, setPresetNotice] = React.useState<string | null>(null);
  const [presetError, setPresetError] = React.useState<string | null>(null);
  const [pendingImportKind, setPendingImportKind] = React.useState<PresetKind>("layout");
  const importRef = React.useRef<HTMLInputElement | null>(null);

  if (!ctx) return null;
  const {
    locale,
    design,
    keyColors,
    setDesign,
    setKeyColors,
    saveDesign,
    saveKeyColors,
    loadDesign,
    loadKeyColors,
    loadDeployDesign,
    resetDesign,
    resetKeyColors,
    workbenchPanelEnabled,
    setWorkbenchPanelEnabled,
    workbenchOpen,
    setWorkbenchOpen,
    favoritesOpen,
    setFavoritesOpen,
    canUseWorkbench,
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
    useTestApi,
    setUseTestApi,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    refreshIntervalMs,
    setRefreshIntervalMs,
    setLoadLimit,
    syncFromApi,
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

  React.useEffect(() => {
    try {
      localStorage.setItem(WORKBENCH_TAB_STORAGE_KEY, tab);
    } catch {
      // ignore
    }
  }, [tab]);

  React.useEffect(() => {
    writeStoredActivePresetId("color", activeColorPresetId);
  }, [activeColorPresetId]);

  React.useEffect(() => {
    writeStoredActivePresetId("layout", activeLayoutPresetId);
  }, [activeLayoutPresetId]);

  const reloadPresetCatalog = React.useCallback(async (kind: PresetKind) => {
    const builtin = await loadBuiltinPresetCatalog(kind);
    const cloud = await loadCloudPresetCatalog(kind);
    const merged = mergePresetCatalogs(builtin, cloud.presets, cloud.defaultPresetId);
    if (kind === "color") {
      setColorPresets(merged);
      setCloudCatalogAvailable((prev) => ({ ...prev, color: cloud.available }));
      setActiveColorPresetId((prev) => prev ?? merged.find((item) => item.isDefault)?.id ?? merged[0]?.id ?? null);
      return;
    }

    setLayoutPresets(merged);
    setCloudCatalogAvailable((prev) => ({ ...prev, layout: cloud.available }));
    setActiveLayoutPresetId((prev) => prev ?? merged.find((item) => item.isDefault)?.id ?? merged[0]?.id ?? null);
  }, []);

  React.useEffect(() => {
    void reloadPresetCatalog("color");
    void reloadPresetCatalog("layout");
  }, [reloadPresetCatalog]);

  const rangeByKey = React.useMemo(() => {
    const map = new Map<string, RangeItem>();
    for (const item of ALL_DESIGN_CONTROL_ITEMS) map.set(String(item.key), item);
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

    for (const issue of validateWorkbenchLayout()) {
      const prefix = `[workbench-layout] ${issue.code}:`;
      if (issue.severity === "error") {
        console.error(prefix, issue.message);
      } else {
        console.warn(prefix, issue.message);
      }
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

  const selectedColorPreset = React.useMemo(
    () => colorPresets.find((preset) => preset.id === activeColorPresetId) ?? null,
    [activeColorPresetId, colorPresets]
  );
  const selectedLayoutPreset = React.useMemo(
    () => layoutPresets.find((preset) => preset.id === activeLayoutPresetId) ?? null,
    [activeLayoutPresetId, layoutPresets]
  );

  const applyPreset = React.useCallback(
    async (kind: PresetKind, preset: PresetSummary | null) => {
      if (!preset) return;
      setPresetError(null);
      setPresetNotice(null);

      if (kind === "color") {
        const payload = await loadColorPresetAsset(preset.assetUrl);
        if (!payload) {
          setPresetError(locale === "en" ? "Failed to load color preset asset." : "Не удалось загрузить asset цветового пресета.");
          setColorPresets((prev) =>
            prev.map((item) => (item.id === preset.id ? { ...item, availability: "broken" } : item))
          );
          return;
        }
        setKeyColors(payload);
        setActiveColorPresetId(preset.id);
        setPresetNotice(locale === "en" ? `Applied color preset: ${preset.name}` : `Применена цветовая схема: ${preset.name}`);
        return;
      }

      const payload = await loadLayoutPresetAsset(preset.assetUrl);
      if (!payload) {
        setPresetError(locale === "en" ? "Failed to load layout preset asset." : "Не удалось загрузить asset layout-пресета.");
        setLayoutPresets((prev) =>
          prev.map((item) => (item.id === preset.id ? { ...item, availability: "broken" } : item))
        );
        return;
      }
      setDesign(payload);
      setActiveLayoutPresetId(preset.id);
      setPresetNotice(locale === "en" ? `Applied layout preset: ${preset.name}` : `Применён UI / Layout preset: ${preset.name}`);
    },
    [locale, setDesign, setKeyColors]
  );

  const saveLocalDraft = React.useCallback(
    (kind: PresetKind) => {
      setPresetError(null);
      setPresetNotice(null);
      if (kind === "color") {
        saveKeyColors();
        setPresetNotice(locale === "en" ? "Saved current colors locally." : "Текущая цветовая схема сохранена локально.");
        return;
      }
      saveDesign();
      setPresetNotice(locale === "en" ? "Saved current layout locally." : "Текущий layout сохранён локально.");
    },
    [locale, saveDesign, saveKeyColors]
  );

  const loadLocalDraft = React.useCallback(
    (kind: PresetKind) => {
      setPresetError(null);
      setPresetNotice(null);
      if (kind === "color") {
        loadKeyColors();
        setPresetNotice(locale === "en" ? "Loaded local colors." : "Локальная цветовая схема загружена.");
        return;
      }
      loadDesign();
      setPresetNotice(locale === "en" ? "Loaded local layout." : "Локальный layout загружен.");
    },
    [locale, loadDesign, loadKeyColors]
  );

  const resetDraft = React.useCallback(
    (kind: PresetKind) => {
      setPresetError(null);
      setPresetNotice(null);
      if (kind === "color") {
        resetKeyColors();
        setActiveColorPresetId(null);
        setPresetNotice(locale === "en" ? "Colors reset to defaults." : "Цвета сброшены к default.");
        return;
      }
      resetDesign();
      setActiveLayoutPresetId(null);
      setPresetNotice(locale === "en" ? "Layout reset to defaults." : "Layout сброшен к default.");
    },
    [locale, resetDesign, resetKeyColors]
  );

  const exportPresetFile = React.useCallback(
    (kind: PresetKind) => {
      const payload = kind === "color" ? { keyColors } : { design };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "color" ? "dtm-color-preset.json" : "dtm-layout-preset.json";
      a.click();
      URL.revokeObjectURL(url);
    },
    [design, keyColors]
  );

  const saveCloudPreset = React.useCallback(
    async (kind: PresetKind, preset: PresetSummary | null) => {
      const canEdit = preset?.sourceKind === "cloud" && preset.canEdit;
      const promptLabel =
        locale === "en"
          ? kind === "color"
            ? "Color preset name"
            : "Layout preset name"
          : kind === "color"
            ? "Название цветового пресета"
            : "Название layout-пресета";
      const nextName = window.prompt(promptLabel, preset?.name || "");
      if (!nextName?.trim()) return;

      setPresetError(null);
      setPresetNotice(null);

      const payload = kind === "color" ? { keyColors } : { design };
      const endpoint = canEdit
        ? `${getAuthRequestBase()}/presets/${encodeURIComponent(preset.id)}`
        : preset?.id
          ? `${getAuthRequestBase()}/presets/${encodeURIComponent(preset.id)}/clone`
          : `${getAuthRequestBase()}/presets`;
      const method = canEdit ? "PUT" : "POST";
      const body = canEdit
        ? { kind, name: nextName.trim(), payload }
        : { kind, name: nextName.trim(), payload };

      try {
        const res = await fetch(endpoint, {
          method,
          credentials: "include",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error(`${locale === "en" ? "Preset save failed" : "Не удалось сохранить пресет"} (HTTP ${res.status})`);
        }
        const response = (await res.json()) as { preset?: { id?: string; name?: string } };
        await reloadPresetCatalog(kind);
        if (kind === "color") setActiveColorPresetId(response.preset?.id ?? activeColorPresetId);
        else setActiveLayoutPresetId(response.preset?.id ?? activeLayoutPresetId);
        setPresetNotice(
          canEdit
            ? locale === "en"
              ? "Cloud preset updated."
              : "Cloud preset обновлён."
            : locale === "en"
              ? "Cloud preset saved."
              : "Cloud preset сохранён."
        );
      } catch (error) {
        setPresetError(error instanceof Error ? error.message : locale === "en" ? "Preset save failed." : "Не удалось сохранить пресет.");
      }
    },
    [activeColorPresetId, activeLayoutPresetId, design, keyColors, locale, reloadPresetCatalog]
  );

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

    return groups;
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
                <span>{locale === "en" ? "Test API (current session)" : "Test API (текущая сессия)"}</span>
                <button
                  type="button"
                  className={`wbBinaryBtn ${useTestApi ? "active" : ""}`}
                  title={
                    locale === "en"
                      ? useTestApi
                        ? "Current API: test"
                        : "Current API: production"
                      : useTestApi
                        ? "Текущий API: test"
                        : "Текущий API: prod"
                  }
                  aria-label={locale === "en" ? "Test API current session" : "Test API текущая сессия"}
                  onClick={() => {
                    const next = !useTestApi;
                    setUseTestApi(next);
                    if (!demoMode) {
                      void syncFromApi();
                    }
                  }}
                >
                  <BinaryIcon active={useTestApi} />
                </button>
              </label>

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
    const showPanelsGuide = section.id === "surfaces";
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
              <div className="wbSegmented">
                <button
                  type="button"
                  className={`wbSegmentedBtn ${panelMapTarget === "drawer" ? "active" : ""}`}
                  onClick={() => setPanelMapTarget("drawer")}
                >
                  {locale === "en" ? "Task card" : "Карточка задачи"}
                </button>
                <button
                  type="button"
                  className={`wbSegmentedBtn ${panelMapTarget === "scene" ? "active" : ""}`}
                  onClick={() => setPanelMapTarget("scene")}
                >
                  {locale === "en" ? "Timeline" : "Таймлайн"}
                </button>
              </div>
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

  const renderPresetSection = (kind: PresetKind, presets: PresetSummary[], activePreset: PresetSummary | null) => (
    <section className="wbPresetGroup">
      <div className="wbPresetHeader">
        <div>
          <h4>{kind === "color" ? (locale === "en" ? "Color presets" : "Цветовые пресеты") : "UI / Layout"}</h4>
          <div className="muted wbPresetMetaLine">
            {kind === "color"
              ? locale === "en"
                ? "Stored separately from layout."
                : "Хранятся отдельно от layout."
              : locale === "en"
                ? "Stored separately from colors."
                : "Хранится отдельно от цветов."}
          </div>
        </div>
        {!cloudCatalogAvailable[kind] ? (
          <div className="wbPresetHint">
            {locale === "en"
              ? "Cloud catalog unavailable. Builtin presets only."
              : "Cloud catalog недоступен. Доступны только builtin presets."}
          </div>
        ) : null}
      </div>

      <label className="wbPresetSelectWrap">
        <span className="wbPresetSelectLabel">{locale === "en" ? "Preset" : "Пресет"}</span>
        <select
          value={activePreset?.id ?? ""}
          onChange={(event) => {
            const next = presets.find((preset) => preset.id === event.target.value) ?? null;
            if (kind === "color") setActiveColorPresetId(next?.id ?? null);
            else setActiveLayoutPresetId(next?.id ?? null);
          }}
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>

      {activePreset ? (
        <div className="wbPresetSummary">
          <div className="muted wbPresetMetaLine">
            {activePreset.sourceKind === "builtin"
              ? locale === "en"
                ? "Builtin"
                : "Builtin"
              : locale === "en"
                ? "Cloud"
                : "Cloud"}
            {activePreset.isDefault ? locale === "en" ? " • default" : " • default" : ""}
            {activePreset.authorDisplayName ? ` • ${activePreset.authorDisplayName}` : ""}
          </div>
          {activePreset.description ? <div className="muted wbPresetMetaLine">{activePreset.description}</div> : null}
          {activePreset.availability !== "ready" ? (
            <div className="muted wbPresetMetaLine">
              {activePreset.availability === "broken"
                ? locale === "en"
                  ? "Asset is broken."
                  : "Asset повреждён."
                : locale === "en"
                  ? "Asset is temporarily unavailable."
                  : "Asset временно недоступен."}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="wbPresetActions">
        <button type="button" onClick={() => void applyPreset(kind, activePreset)} disabled={!activePreset}>
          {locale === "en" ? "Apply" : "Применить"}
        </button>
        <button type="button" onClick={() => saveLocalDraft(kind)}>
          {locale === "en" ? "Save local" : "Сохранить локально"}
        </button>
        <button type="button" onClick={() => loadLocalDraft(kind)}>
          {locale === "en" ? "Load local" : "Загрузить локальное"}
        </button>
        <button type="button" onClick={() => resetDraft(kind)}>
          {locale === "en" ? "Reset" : "Сброс"}
        </button>
        <button type="button" onClick={() => exportPresetFile(kind)}>
          {locale === "en" ? "Export" : "Экспорт"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPendingImportKind(kind);
            importRef.current?.click();
          }}
        >
          {locale === "en" ? "Import" : "Импорт"}
        </button>
        <button type="button" onClick={() => void saveCloudPreset(kind, activePreset)}>
          {activePreset?.sourceKind === "cloud" && activePreset.canEdit
            ? locale === "en"
              ? "Update cloud"
              : "Обновить cloud"
            : locale === "en"
              ? "Save to cloud"
              : "Сохранить в cloud"}
        </button>
      </div>
    </section>
  );

  return (
    <>
      {canUseWorkbench && workbenchPanelEnabled ? (
      <div className={`workbench ${workbenchOpen ? "open" : ""}`}>
        <button className="workbenchToggle" onClick={() => setWorkbenchOpen((value) => !value)}>
          {workbenchOpen ? ui.workbench.toggleHide : ui.workbench.toggleShow}
        </button>
        {workbenchOpen ? (
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
                <div className="wbToolbar wbToolbarSide">
                  <input
                    className="wbSearch"
                    type="search"
                    placeholder={locale === "en" ? "Search controls" : "Поиск параметров"}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                {presetNotice ? <div className="wbPresetMessage">{presetNotice}</div> : null}
                {presetError ? <div className="wbPresetMessage isError">{presetError}</div> : null}

                {renderPresetSection("color", colorPresets, selectedColorPreset)}
                {renderPresetSection("layout", layoutPresets, selectedLayoutPreset)}

                <div className="workbenchActionGrid">
                  <button onClick={() => void loadDeployDesign()}>{ui.workbench.deploy}</button>
                  <button onClick={() => setFavoritesOpen((value) => !value)}>
                    {favoritesOpen
                      ? locale === "en"
                        ? "Hide favorites"
                        : "Скрыть избранное"
                      : locale === "en"
                        ? "Show favorites"
                        : "Показать избранное"}
                  </button>
                  <button onClick={() => {
                    setWorkbenchOpen(false);
                    setFavoritesOpen(false);
                    setWorkbenchPanelEnabled(false);
                  }}>
                    {locale === "en" ? "Disable workbench" : "Выключить крутилки"}
                  </button>
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

                      if (pendingImportKind === "color") {
                        const nextColors =
                          rec.keyColors && typeof rec.keyColors === "object"
                            ? normalizeKeyColors(rec.keyColors as Record<string, string>)
                            : normalizeKeyColors(rec as Record<string, string>);
                        setKeyColors(nextColors);
                        setPresetNotice(locale === "en" ? "Imported color preset." : "Цветовой пресет импортирован.");
                      } else if (rec.design && typeof rec.design === "object") {
                        setDesign(normalizeDesignControls(rec.design as Record<string, unknown>));
                        setRuntimeDefaults(
                          rec.runtimeDefaults && typeof rec.runtimeDefaults === "object"
                            ? normalizeRuntimeDefaults(rec.runtimeDefaults as Record<string, unknown>)
                            : runtimeDefaults
                        );
                      } else {
                        setDesign(normalizeDesignControls(parsed));
                      }
                    } catch {
                      setPresetError(locale === "en" ? "Import failed." : "Импорт не выполнен.");
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
      ) : null}

      {canUseWorkbench && workbenchPanelEnabled ? (
      <aside className={`favoritesPanel favoritesPanelDetached ${favoritesOpen && workbenchOpen ? "open" : ""}`}>
        {favoritesOpen && workbenchOpen ? (
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
      ) : null}
    </>
  );
}
