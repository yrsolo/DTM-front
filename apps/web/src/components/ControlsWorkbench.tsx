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

export function ControlsWorkbench() {
  const ctx = React.useContext(LayoutContext);
  const [open, setOpen] = React.useState(false);
  const [favoritesOpen, setFavoritesOpen] = React.useState(false);
  const [tab, setTab] = React.useState<WorkbenchTabId>(WORKBENCH_LAYOUT[0]?.id ?? "material");
  const [query, setQuery] = React.useState("");
  const [favorites, setFavorites] = React.useState<string[]>([]);
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
  } = ctx;

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
    const payload = { design, keyColors };
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
      return (
        <label key={control.id} className="wbCtrl">
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
    return (
      <div className="wbGrid">
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
