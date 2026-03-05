import React from "react";
import { KEY_COLOR_ITEMS, normalizeKeyColors, TASK_PALETTE_ITEMS } from "../design/colors";
import {
  DESIGN_CONTROL_ITEMS,
  DESIGN_CONTROLS_PUBLIC_PATH,
  DRAWER_CONTROL_ITEMS,
  MATERIAL_CONTROL_ITEMS,
  normalizeDesignControls,
} from "../design/controls";
import { LayoutContext } from "./Layout";

type TabKey = "material" | "colors" | "palette" | "drawer" | "design" | "leftBlock" | "workbench";

type Group<T> = {
  title: string;
  items: T[];
};
const TAB_ORDER: TabKey[] = [
  "material",
  "colors",
  "palette",
  "drawer",
  "design",
  "leftBlock",
  "workbench",
];

export function ControlsWorkbench() {
  const ctx = React.useContext(LayoutContext);
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<TabKey>("material");
  const importRef = React.useRef<HTMLInputElement | null>(null);

  if (!ctx) return null;
  const {
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

  const materialGroups = React.useMemo(
    () => [
      { title: ui.workbench.groups.materialBg, items: MATERIAL_CONTROL_ITEMS.filter((i) => i.key.toLowerCase().includes("bg")) },
      { title: ui.workbench.groups.materialCards, items: MATERIAL_CONTROL_ITEMS.filter((i) => i.key.toLowerCase().includes("card") || i.key.toLowerCase().includes("topbar")) },
      { title: ui.workbench.groups.materialFx, items: MATERIAL_CONTROL_ITEMS.filter((i) => !(i.key.toLowerCase().includes("bg") || i.key.toLowerCase().includes("card") || i.key.toLowerCase().includes("topbar"))) },
    ],
    [ui]
  );

  const colorGroups = React.useMemo(
    () => [
      { title: ui.workbench.groups.colorsKey, items: KEY_COLOR_ITEMS.filter((i) => i.key.startsWith("key") && !i.key.includes("Surface") && i.key !== "keyText") },
      { title: ui.workbench.groups.colorsSurface, items: KEY_COLOR_ITEMS.filter((i) => i.key.includes("Surface") || i.key === "keyText") },
    ],
    [ui]
  );

  const paletteGroups = React.useMemo(
    () => [
      { title: ui.workbench.groups.palette1, items: TASK_PALETTE_ITEMS.slice(0, 4) },
      { title: ui.workbench.groups.palette2, items: TASK_PALETTE_ITEMS.slice(4, 8) },
    ],
    [ui]
  );

  const drawerGroups = React.useMemo(
    () => [
      { title: ui.workbench.groups.drawerSize, items: DRAWER_CONTROL_ITEMS.filter((i) => /(width|padding|size|font|radius|gap|height)/i.test(i.key)) },
      { title: ui.workbench.groups.drawerCalendar, items: DRAWER_CONTROL_ITEMS.filter((i) => /(calendar|month|weekend|holiday)/i.test(i.key)) },
      { title: ui.workbench.groups.drawerHighlight, items: DRAWER_CONTROL_ITEMS.filter((i) => /(shadow|glow|dot|label)/i.test(i.key)) },
    ],
    [ui]
  );

  const skipKeys = React.useMemo(
    () => new Set([...MATERIAL_CONTROL_ITEMS, ...DRAWER_CONTROL_ITEMS].map((i) => i.key)),
    []
  );

  const coreDesignItems = React.useMemo(
    () => DESIGN_CONTROL_ITEMS.filter((i) => !skipKeys.has(i.key) && !String(i.key).startsWith("workbench")),
    [skipKeys]
  );

  const workbenchItems = React.useMemo(
    () => DESIGN_CONTROL_ITEMS.filter((i) => String(i.key).startsWith("workbench")),
    []
  );

  const designGroups = React.useMemo(
    () => [
      { title: ui.workbench.groups.designTable, items: coreDesignItems.filter((i) => /(table|col|badge|cardPadding)/i.test(i.key) && !/timelineLeft/i.test(i.key)) },
      { title: ui.workbench.groups.designPinned, items: coreDesignItems.filter((i) => /timelineLeft/i.test(i.key)) },
      { title: ui.workbench.groups.designTimeline, items: coreDesignItems.filter((i) => /(timeline|bar|milestone|taskColorMixPercent)/i.test(i.key)) },
      { title: ui.workbench.groups.designOther, items: coreDesignItems.filter((i) => !/(table|col|badge|left|cardPadding|timelineLeft|timeline|bar|milestone|taskColorMixPercent)/i.test(i.key)) },
    ],
    [coreDesignItems, ui]
  );

  const workbenchGroups = React.useMemo(
    () => [
      {
        title: ui.workbench.groups.workbenchDock,
        items: workbenchItems.filter((i) => /(Dock|WidthMax|ViewportMargin|Bottom|Left|Right)/i.test(String(i.key))),
      },
      {
        title: ui.workbench.groups.workbenchLayout,
        items: workbenchItems.filter((i) => /(Body|MainGap|TabsGap|SideWidth|Grid|GroupPadding|ControlGap)/i.test(String(i.key))),
      },
      {
        title: ui.workbench.groups.workbenchControls,
        items: workbenchItems.filter((i) => /(SliderWidth|NumberWidth|LabelMinWidth|ColorTextWidth|InputFontSize|LabelFontSize)/i.test(String(i.key))),
      },
      {
        title: ui.workbench.groups.workbenchActions,
        items: workbenchItems.filter((i) => /(ActionBtn)/i.test(String(i.key))),
      },
    ],
    [workbenchItems, ui]
  );

  const designItemByKey = React.useMemo(() => {
    const map = new Map<string, (typeof DESIGN_CONTROL_ITEMS)[number]>();
    for (const item of DESIGN_CONTROL_ITEMS) map.set(String(item.key), item);
    return map;
  }, []);

  const keyColorByKey = React.useMemo(() => {
    const map = new Map<string, (typeof KEY_COLOR_ITEMS)[number]>();
    for (const item of KEY_COLOR_ITEMS) map.set(String(item.key), item);
    return map;
  }, []);

  const leftBlockGroups = React.useMemo(
    () => [
      {
        title: ui.workbench.groups.designPinnedText,
        items: [
          "timelineLeftOwnerXOffset",
          "timelineLeftOwnerTextOffsetY",
          "timelineLeftOwnerFontSize",
          "timelineLeftOwnerCropLeft",
          "timelineLeftTaskXOffset",
          "timelineLeftTaskTextOffsetY",
          "timelineLeftTaskFontSize",
          "timelineLeftTaskCropLeft",
        ]
          .map((k) => designItemByKey.get(k))
          .filter(Boolean) as Array<(typeof DESIGN_CONTROL_ITEMS)[number]>,
        colors: [],
      },
      {
        title: ui.workbench.groups.designPinnedPill,
        items: [
          "timelineLeftPillXOffset",
          "timelineLeftPillOffsetY",
          "timelineLeftPillWidth",
          "timelineLeftPillSizeScale",
          "timelineLeftMetaFontSize",
          "timelineLeftMetaTextOffsetY",
          "badgeHeight",
          "badgeFontSize",
        ]
          .map((k) => designItemByKey.get(k))
          .filter(Boolean) as Array<(typeof DESIGN_CONTROL_ITEMS)[number]>,
        colors: [keyColorByKey.get("keyLeftPillText")].filter(Boolean) as Array<
          (typeof KEY_COLOR_ITEMS)[number]
        >,
      },
      {
        title: ui.workbench.groups.designPinnedShow,
        items: [
          "timelineLeftGroupXOffset",
          "timelineLeftGroupOffsetY",
          "timelineLeftGroupCropLeft",
          "timelineLeftGroupFontSize",
        ]
          .map((k) => designItemByKey.get(k))
          .filter(Boolean) as Array<(typeof DESIGN_CONTROL_ITEMS)[number]>,
        colors: [],
      },
    ],
    [ui, designItemByKey, keyColorByKey]
  );

  function chunkGroups<T>(groups: Group<T>[], maxItems = 8): Group<T>[] {
    const out: Group<T>[] = [];
    for (const group of groups) {
      if (group.items.length <= maxItems) {
        out.push(group);
        continue;
      }
      const chunks = Math.ceil(group.items.length / maxItems);
      for (let i = 0; i < chunks; i += 1) {
        out.push({
          title: `${group.title} ${i + 1}/${chunks}`,
          items: group.items.slice(i * maxItems, (i + 1) * maxItems),
        });
      }
    }
    return out;
  }

  const renderRangeGroups = (groups: Group<typeof DESIGN_CONTROL_ITEMS[number]>[]) => (
    <div className="wbGrid">
      {chunkGroups(groups).filter((g) => g.items.length > 0).map((group) => (
        <section key={group.title} className="wbGroup">
          <h4>{group.title}</h4>
          <div className="wbGroupBody">
            {group.items.map((item) => (
              <label key={item.key} className="wbCtrl">
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
        </section>
      ))}
    </div>
  );

  const renderColorGroups = (groups: Group<typeof KEY_COLOR_ITEMS[number]>[]) => (
    <div className="wbGrid">
      {chunkGroups(groups).map((group) => (
        <section key={group.title} className="wbGroup">
          <h4>{group.title}</h4>
          <div className="wbGroupBody">
            {group.items.map((item) => (
              <label key={item.key} className="wbColorCtrl">
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
        </section>
      ))}
    </div>
  );

  const renderLeftBlockGroups = () => (
    <div className="wbGrid">
      {leftBlockGroups.map((group) => (
        <section key={group.title} className="wbGroup">
          <h4>{group.title}</h4>
          <div className="wbGroupBody">
            {group.items.map((item) => (
              <label key={item.key} className="wbCtrl">
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
                    setDesign((prev) => ({
                      ...prev,
                      [item.key]: Number.isFinite(next) ? next : prev[item.key],
                    }));
                  }}
                />
              </label>
            ))}
            {group.colors.map((item) => (
              <label key={item.key} className="wbColorCtrl">
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
        </section>
      ))}
    </div>
  );

  return (
    <div className={`workbench ${open ? "open" : ""}`}>
      <button className="workbenchToggle" onClick={() => setOpen((v) => !v)}>
        {open ? ui.workbench.toggleHide : ui.workbench.toggleShow}
      </button>

      {open ? (
        <div className="workbenchBody">
          <div className="workbenchMain">
            <div>
              <div className="workbenchTabs">
                {TAB_ORDER.map((key) => (
                  <button
                    key={key}
                    className={`workbenchTab ${tab === key ? "active" : ""}`}
                    onClick={() => setTab(key)}
                  >
                    {ui.workbench.tabs[key]}
                  </button>
                ))}
              </div>

              <div className="workbenchContent">
                {tab === "material" ? renderRangeGroups(materialGroups) : null}
                {tab === "colors" ? renderColorGroups(colorGroups) : null}
                {tab === "palette" ? renderColorGroups(paletteGroups) : null}
                {tab === "drawer" ? renderRangeGroups(drawerGroups) : null}
                {tab === "design" ? renderRangeGroups(designGroups) : null}
                {tab === "leftBlock" ? renderLeftBlockGroups() : null}
                {tab === "workbench" ? renderRangeGroups(workbenchGroups) : null}
              </div>
            </div>

            <aside className="workbenchSideActions">
              <div className="muted workbenchDeployHint">
                {ui.workbench.deployPathLabel}: <code>{DESIGN_CONTROLS_PUBLIC_PATH}</code>
              </div>
              <div className="workbenchActionGrid">
                <button onClick={saveDesign}>{ui.workbench.save}</button>
                <button onClick={loadDesign}>{ui.workbench.load}</button>
                <button onClick={() => { resetDesign(); resetKeyColors(); }}>{ui.workbench.reset}</button>
                <button onClick={exportPreset}>{ui.workbench.export}</button>
                <button onClick={() => importRef.current?.click()}>{ui.workbench.import}</button>
                <button onClick={() => void loadDeployDesign()}>{ui.workbench.deploy}</button>
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
  );
}
