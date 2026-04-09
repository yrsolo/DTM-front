import React from "react";
import { Link, useNavigate } from "react-router-dom";

import type { DesignerSortAssignment } from "../designerSort/types";
import type { NormalizedTaskFormatId } from "../formatSort/types";
import "../styles/analytics.css";
import {
  buildAnalyticsDonutBreakdown,
  buildAnalyticsMovingAverage,
  buildDepartmentAnalyticsReport,
  computeAutoHoursPerDesigner,
} from "../analytics/calculations";
import { downloadAnalyticsSnapshotFromBrowser } from "../analytics/browserIngestion";
import type {
  AnalyticsDesignerConfig,
  AnalyticsDonutBreakdown,
  AnalyticsDonutPeriodMode,
  AnalyticsSourceDataset,
  DepartmentAnalyticsConfig,
  DepartmentAnalyticsReport,
} from "../analytics/types";
import { Tooltip, TooltipState } from "../components/Tooltip";
import { resolvePublicAssetUrl } from "../config/publicPaths";
import { taskFormatConfig } from "../formatSort/config";
import { DesignerSortLab } from "./DesignerSortPage";
import { FormatSortLab } from "./FormatSortPage";

const ANALYTICS_CONFIG_STORAGE_KEY = "dtm.analytics.config.v1";
const ANALYTICS_DATASET_STORAGE_KEY = "dtm.analytics.dataset.v1";
const DESIGNER_SORT_STORAGE_KEY = "dtm.designerSort.config.v1";
const FILE_INPUT_ACCEPT = "application/json,.json";
const DONUT_COLORS = [
  "#6da3ff",
  "#fb6f92",
  "#f9c74f",
  "#90be6d",
  "#c77dff",
  "#4dd0e1",
  "#ff9f1c",
  "#ff6b6b",
  "#43aa8b",
  "#b8de6f",
  "#9b89ff",
  "#48cae4",
  "#f9844a",
  "#f15bb5",
  "#577590",
  "#adb5bd",
];

type AnalyticsMainTabId = "charts" | "designers" | "taskTypes";
type AnalyticsChartsTabId = "formats" | "productivity";
type DonutSlice = AnalyticsDonutBreakdown["segments"][number] & {
  color: string;
  path: string;
  legendColor: string;
};

const ANALYTICS_MAIN_TAB_STORAGE_KEY = "dtm.analytics.mainTab.v1";
const ANALYTICS_BRAND_LOGO_URL = resolvePublicAssetUrl("dtm_ico_64x64.png");

function readStoredJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeStoredJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function exportJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildDefaultFormatHours(): Record<NormalizedTaskFormatId, number> {
  return {
    grafrolik: 72,
    logo_integration: 72,
    shorts: 50,
    shooting_video: 50,
    logo_3d: 50,
    interactive_ustnik: 35,
    first_person_announce: 36,
    still_frame: 36,
    graphic_transition: 36,
    screencast: 36,
    video_adaptation: 22,
    screen_branding: 22,
    dynamic_logo: 22,
    electronic_logo: 9,
    branded_qr: 14,
    web: 22,
  };
}

function buildDefaultConfig(): DepartmentAnalyticsConfig {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getUTCFullYear();
  return {
    formatHoursById: buildDefaultFormatHours(),
    capacityMode: "auto",
    manualHoursPerDesigner: 151,
    includeOutsource: true,
    includeWebDigital: true,
    donutPeriodMode: "year",
    donutAnchorDate: today,
    donutCustomStart: `${currentYear}-01-01`,
    donutCustomEnd: `${currentYear}-12-31`,
    smoothingWindowMonths: 3,
  };
}

function mergeConfig(
  defaults: DepartmentAnalyticsConfig,
  stored: Partial<DepartmentAnalyticsConfig> | null
): DepartmentAnalyticsConfig {
  return {
    ...defaults,
    ...stored,
    formatHoursById: {
      ...defaults.formatHoursById,
      ...(stored?.formatHoursById ?? {}),
    },
  };
}

function resolveDesignerConfig(imported: AnalyticsDesignerConfig | null): AnalyticsDesignerConfig | null {
  return imported ?? readStoredJson<AnalyticsDesignerConfig>(DESIGNER_SORT_STORAGE_KEY);
}

function formatMetric(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

function buildTooltipContent(lines: string[]) {
  return (
    <div className="analyticsTooltipContent">
      {lines.map((line, index) => (
        <div key={`${line}-${index}`}>{line}</div>
      ))}
    </div>
  );
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleDeg: number) {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

function describeArc(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const endOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const startInner = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const endInner = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

function getQuarterLabel(date: Date): string {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${quarter} кв. ${date.getUTCFullYear()}`;
}

function getDonutPeriodLabel(config: DepartmentAnalyticsConfig): string {
  const anchor = new Date(`${config.donutAnchorDate}T00:00:00Z`);
  if (!Number.isFinite(anchor.getTime())) return "";
  if (config.donutPeriodMode === "month") {
    return anchor.toLocaleDateString("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  if (config.donutPeriodMode === "quarter") {
    return getQuarterLabel(anchor);
  }
  if (config.donutPeriodMode === "year") {
    return String(anchor.getUTCFullYear());
  }
  return `${config.donutCustomStart || "—"} - ${config.donutCustomEnd || "—"}`;
}

function shiftDonutAnchor(value: string, mode: AnalyticsDonutPeriodMode, step: number): string {
  const anchor = new Date(`${value || "1970-01-01"}T00:00:00Z`);
  if (!Number.isFinite(anchor.getTime())) return value;

  if (mode === "month") {
    anchor.setUTCMonth(anchor.getUTCMonth() + step);
  } else if (mode === "quarter") {
    anchor.setUTCMonth(anchor.getUTCMonth() + step * 3);
  } else if (mode === "year") {
    anchor.setUTCFullYear(anchor.getUTCFullYear() + step);
  }

  return anchor.toISOString().slice(0, 10);
}

function buildDonutSlices(breakdown: AnalyticsDonutBreakdown): DonutSlice[] {
  if (!breakdown.segments.length) return [];
  const weightedTotal = breakdown.segments.reduce(
    (sum, segment) => sum + (segment.hours > 0 ? segment.hours : 0.0001),
    0
  );
  let currentAngle = -90;

  return breakdown.segments.map((segment, index) => {
    const weightedHours = segment.hours > 0 ? segment.hours : 0.0001;
    const angleSize = (weightedHours / weightedTotal) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSize;
    currentAngle = endAngle;
    return {
      ...segment,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
      legendColor: DONUT_COLORS[index % DONUT_COLORS.length],
      path: describeArc(160, 160, 132, 76, startAngle, endAngle),
    };
  });
}

function DonutChart(props: {
  breakdown: AnalyticsDonutBreakdown;
  setTooltipState: React.Dispatch<React.SetStateAction<TooltipState>>;
}) {
  const slices = React.useMemo(() => buildDonutSlices(props.breakdown), [props.breakdown]);

  return (
    <div className="analyticsDonutLayout">
      <div className="analyticsDonutWrap">
        <svg
          className="analyticsDonutChart"
          viewBox="0 0 320 320"
          role="img"
          aria-label={`Кольцевая диаграмма форматов за период ${props.breakdown.periodLabel}`}
        >
          <circle cx="160" cy="160" r="132" className="analyticsDonutBase" />
          {slices.length ? (
            slices.map((slice) => (
              <path
                key={slice.formatId}
                d={slice.path}
                fill={slice.color}
                className="analyticsDonutSlice"
                onMouseEnter={(event) =>
                  props.setTooltipState({
                    visible: true,
                    x: event.clientX,
                    y: event.clientY,
                    content: buildTooltipContent([
                      slice.title,
                      `${slice.taskCount} задач | ${formatMetric(slice.hours)} ч`,
                      ...slice.tasks.map((task) => `${task.brand ?? "—"} | ${task.show ?? "—"}`),
                    ]),
                  })
                }
                onMouseMove={(event) =>
                  props.setTooltipState((prev) =>
                    prev.visible ? { ...prev, x: event.clientX, y: event.clientY } : prev
                  )
                }
                onMouseLeave={() => props.setTooltipState({ visible: false })}
              />
            ))
          ) : (
            <circle cx="160" cy="160" r="132" className="analyticsDonutEmptyRing" />
          )}
          <circle cx="160" cy="160" r="75" className="analyticsDonutHole" />
          <foreignObject x="84" y="108" width="152" height="104">
            <div className="analyticsDonutCenter">
              <div className="analyticsDonutCenterLabel">{props.breakdown.periodLabel}</div>
              <div className="analyticsDonutCenterValue">{formatMetric(props.breakdown.totalHours)} ч</div>
              <div className="analyticsDonutCenterSubvalue">{props.breakdown.totalTasks} задач</div>
            </div>
          </foreignObject>
        </svg>
      </div>

      <div className="analyticsDonutLegend">
        {slices.length ? (
          slices.map((slice) => (
            <div key={`${slice.formatId}-legend`} className="analyticsDonutLegendRow">
              <span className="analyticsDonutLegendSwatch" style={{ background: slice.legendColor }} />
              <div className="analyticsDonutLegendBody">
                <div className="analyticsDonutLegendTitle">{slice.title}</div>
                <div className="analyticsDonutLegendMeta">
                  <span>{formatMetric(slice.hours)} ч</span>
                  <span>{Math.round(slice.share * 1000) / 10}%</span>
                  <span>{slice.taskCount} задач</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="analyticsEmpty">За выбранный период пока нет задач с рассчитанными часами.</div>
        )}
      </div>
    </div>
  );
}

function ProductivityChart(props: {
  report: DepartmentAnalyticsReport;
  smoothingWindowMonths: number;
  setTooltipState: React.Dispatch<React.SetStateAction<TooltipState>>;
}) {
  const rows = props.report.rows;
  const loadValues = rows.map((row) => row.practicalHours);
  const capacityValues = rows.map((row) => row.theoreticalCapacityHours);
  const smoothLoad = buildAnalyticsMovingAverage(loadValues, props.smoothingWindowMonths);
  const smoothCapacity = buildAnalyticsMovingAverage(capacityValues, props.smoothingWindowMonths);
  const maxValue = Math.max(1, ...loadValues, ...capacityValues, ...smoothLoad, ...smoothCapacity);
  const chartHeight = 320;
  const baseY = chartHeight - 44;
  const stepX = 78;
  const width = Math.max(920, rows.length * stepX + 120);

  const toY = (value: number) => baseY - (value / maxValue) * (chartHeight - 92);
  const buildLine = (values: number[]) =>
    values
      .map((value, index) => {
        const x = 60 + index * stepX + stepX / 2;
        return `${x},${toY(value)}`;
      })
      .join(" ");

  return (
    <div className="analyticsChartScroll">
      <svg
        className="analyticsChart"
        viewBox={`0 0 ${width} ${chartHeight}`}
        role="img"
        aria-label="График нагрузки и мощности по месяцам"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = baseY - fraction * (chartHeight - 92);
          return <line key={fraction} x1="42" y1={y} x2={width - 24} y2={y} className="analyticsChartGrid" />;
        })}
        {rows.map((row, index) => {
          const x = 60 + index * stepX;
          const loadHeight = (row.practicalHours / maxValue) * (chartHeight - 92);
          const capacityHeight = (row.theoreticalCapacityHours / maxValue) * (chartHeight - 92);
          const loadY = baseY - loadHeight;
          const capacityY = baseY - capacityHeight;

          return (
            <g key={row.monthKey}>
              <rect
                x={x + 8}
                y={capacityY}
                width="22"
                height={capacityHeight}
                rx="9"
                className="analyticsChartBarCapacity"
                onMouseEnter={(event) =>
                  props.setTooltipState({
                    visible: true,
                    x: event.clientX,
                    y: event.clientY,
                    content: buildTooltipContent([
                      `${row.activeDesignerCount} дизайнеров | ${formatMetric(row.theoreticalCapacityHours)} ч`,
                      ...row.activeDesignerNames,
                    ]),
                  })
                }
                onMouseMove={(event) =>
                  props.setTooltipState((prev) =>
                    prev.visible ? { ...prev, x: event.clientX, y: event.clientY } : prev
                  )
                }
                onMouseLeave={() => props.setTooltipState({ visible: false })}
              />
              <rect
                x={x + 34}
                y={loadY}
                width="22"
                height={loadHeight}
                rx="9"
                className="analyticsChartBarLoad"
                onMouseEnter={(event) =>
                  props.setTooltipState({
                    visible: true,
                    x: event.clientX,
                    y: event.clientY,
                    content: buildTooltipContent([
                      `${row.completedTaskCount} задач | ${formatMetric(row.practicalHours)} ч`,
                    ]),
                  })
                }
                onMouseMove={(event) =>
                  props.setTooltipState((prev) =>
                    prev.visible ? { ...prev, x: event.clientX, y: event.clientY } : prev
                  )
                }
                onMouseLeave={() => props.setTooltipState({ visible: false })}
              />
              <text x={x + 32} y={chartHeight - 12} textAnchor="middle" className="analyticsChartLabel">
                {row.monthLabel}
              </text>
            </g>
          );
        })}
        <polyline points={buildLine(smoothCapacity)} fill="none" className="analyticsChartLineCapacity" />
        <polyline points={buildLine(smoothLoad)} fill="none" className="analyticsChartLineLoad" />
      </svg>
    </div>
  );
}

export function AnalyticsPage() {
  const defaultConfig = React.useMemo(() => buildDefaultConfig(), []);
  const navigate = useNavigate();
  const [mainTab, setMainTab] = React.useState<AnalyticsMainTabId>(() => {
    if (typeof window === "undefined") return "charts";
    const stored = window.localStorage.getItem(ANALYTICS_MAIN_TAB_STORAGE_KEY);
    return stored === "designers" || stored === "taskTypes" ? stored : "charts";
  });
  const [chartsTab, setChartsTab] = React.useState<AnalyticsChartsTabId>("formats");
  const [config, setConfig] = React.useState<DepartmentAnalyticsConfig>(() =>
    mergeConfig(defaultConfig, readStoredJson<DepartmentAnalyticsConfig>(ANALYTICS_CONFIG_STORAGE_KEY))
  );
  const [dataset, setDataset] = React.useState<AnalyticsSourceDataset | null>(() =>
    readStoredJson<AnalyticsSourceDataset>(ANALYTICS_DATASET_STORAGE_KEY)
  );
  const [designerConfig, setDesignerConfig] = React.useState<AnalyticsDesignerConfig | null>(() =>
    resolveDesignerConfig(null)
  );
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [tooltipState, setTooltipState] = React.useState<TooltipState>({ visible: false });
  const [autoHoursState, setAutoHoursState] = React.useState<{ hours: number; details: string }>({
    hours: 151,
    details: "Авто-режим ждёт dataset.",
  });
  const designerFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const configFileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    writeStoredJson(ANALYTICS_CONFIG_STORAGE_KEY, config);
  }, [config]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ANALYTICS_MAIN_TAB_STORAGE_KEY, mainTab);
  }, [mainTab]);

  React.useEffect(() => {
    if (!dataset) return;
    writeStoredJson(ANALYTICS_DATASET_STORAGE_KEY, dataset);
  }, [dataset]);

  React.useEffect(() => {
    let cancelled = false;
    if (!dataset || config.capacityMode !== "auto") {
      return;
    }
    void computeAutoHoursPerDesigner(dataset.snapshot)
      .then((next) => {
        if (!cancelled) setAutoHoursState(next);
      })
      .catch(() => {
        if (!cancelled) {
          setAutoHoursState({ hours: 151, details: "Не удалось пересчитать авто-мощность, используем 151 ч/мес." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [config.capacityMode, dataset]);

  const effectiveHoursPerDesigner =
    config.capacityMode === "manual" ? config.manualHoursPerDesigner : autoHoursState.hours;

  const report = React.useMemo(() => {
    if (!dataset) return null;
    return buildDepartmentAnalyticsReport(dataset.snapshot, config, designerConfig, effectiveHoursPerDesigner);
  }, [config, dataset, designerConfig, effectiveHoursPerDesigner]);

  const donutBreakdown = React.useMemo(() => {
    if (!report) return null;
    return buildAnalyticsDonutBreakdown(report, config);
  }, [report, config]);

  async function handleManualRefresh() {
    setIsRefreshing(true);
    setError(null);
    setNotice("Скачиваем полный snapshot для аналитики...");
    try {
      const nextDataset = await downloadAnalyticsSnapshotFromBrowser();
      setDataset(nextDataset);
      setNotice(`Собрано ${nextDataset.tasksTotalCollected} задач. Аналитика обновлена из полного SnapshotV1.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось скачать полный snapshot для аналитики.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleImportAnalyticsConfig(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<DepartmentAnalyticsConfig>;
        setConfig((prev) => mergeConfig(prev, parsed));
        setNotice("Analytics config импортирован.");
        setError(null);
      } catch {
        setError("Не удалось прочитать analytics config JSON.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleImportDesignerConfig(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AnalyticsDesignerConfig> & {
          assignments?: DesignerSortAssignment[];
        };
        setDesignerConfig({ assignments: parsed.assignments ?? [] });
        setNotice("Designer-sort config импортирован.");
        setError(null);
      } catch {
        setError("Не удалось прочитать designer-sort config JSON.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  const topFormats = report?.summary.topFormats ?? [];
  const donutPeriodLabel = getDonutPeriodLabel(config);

  return (
    <div className="analyticsPage">
      <div className="card analyticsShell">
        <div className="analyticsHeader">
          <div className="analyticsHeaderPrimary">
            <div className="analyticsHeaderTopRow">
              <Link to="/" className="analyticsBrand" aria-label="Вернуться на таблицу">
                <img className="analyticsBrandIcon" src={ANALYTICS_BRAND_LOGO_URL} alt="" aria-hidden="true" />
              </Link>
              <button
                type="button"
                className="adminCloseButton analyticsCloseButton"
                onClick={() => navigate("/")}
                aria-label="Вернуться на таблицу"
                title="Вернуться на таблицу"
              >
                &times;
              </button>
            </div>
            <div className="analyticsHeaderText">
            <div className="analyticsEyebrow">Локальная лаборатория аналитики</div>
            <h1 className="pageTitle analyticsTitle">Аналитика отдела</h1>
            <div className="muted">
              Данные обновляются только вручную. Основа расчёта — полный SnapshotV1, нормализованные форматы и
              локальная сортировка дизайнеров.
            </div>
            </div>
          </div>
          <div className="analyticsHeaderMeta">
            <div className="analyticsMetaBadge">Форматов: {taskFormatConfig.catalog.length}</div>
            <div className="analyticsMetaBadge">Задач: {dataset?.tasksTotalCollected ?? 0}</div>
            <div className="analyticsMetaBadge">Контур: {dataset?.contour ?? "-"}</div>
          </div>
        </div>

        <div className="analyticsMainTabs">
          <button
            type="button"
            className={`adminTabButton ${mainTab === "charts" ? "isActive" : ""}`}
            onClick={() => setMainTab("charts")}
          >
            Графики
          </button>
          <button
            type="button"
            className={`adminTabButton ${mainTab === "designers" ? "isActive" : ""}`}
            onClick={() => setMainTab("designers")}
          >
            Дизайнеры
          </button>
          <button
            type="button"
            className={`adminTabButton ${mainTab === "taskTypes" ? "isActive" : ""}`}
            onClick={() => setMainTab("taskTypes")}
          >
            Типы задач
          </button>
        </div>

        {mainTab === "charts" ? (
        <>
        <div className="analyticsToolbar">
          <div className="analyticsToolbarPrimary">
            <button type="button" className="btn" onClick={() => void handleManualRefresh()} disabled={isRefreshing}>
              {isRefreshing ? "Скачиваем..." : "Скачать все задачи"}
            </button>
            <button type="button" className="btn btnGhost" onClick={() => configFileInputRef.current?.click()}>
              Импортировать config
            </button>
            <button type="button" className="btn btnGhost" onClick={() => designerFileInputRef.current?.click()}>
              Импортировать designer-sort
            </button>
            <button
              type="button"
              className="btn btnGhost"
              onClick={() => exportJsonFile("department-analytics-config.local.json", config)}
            >
              Экспортировать config
            </button>
            <button
              type="button"
              className="btn btnGhost"
              onClick={() => report && exportJsonFile("department-analytics-report.local.json", report)}
              disabled={!report}
            >
              Экспортировать отчёт
            </button>
            <button
              type="button"
              className="btn btnGhost"
              onClick={() => dataset && exportJsonFile("department-analytics-snapshot.local.json", dataset)}
              disabled={!dataset}
            >
              Экспортировать snapshot
            </button>
            <input
              ref={configFileInputRef}
              type="file"
              accept={FILE_INPUT_ACCEPT}
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleImportAnalyticsConfig(file);
                event.target.value = "";
              }}
            />
            <input
              ref={designerFileInputRef}
              type="file"
              accept={FILE_INPUT_ACCEPT}
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleImportDesignerConfig(file);
                event.target.value = "";
              }}
            />
          </div>

          <div className="analyticsToolbarSecondary">
            <label className="analyticsCheckbox">
              <input
                type="checkbox"
                checked={config.includeOutsource}
                onChange={(event) => setConfig((prev) => ({ ...prev, includeOutsource: event.target.checked }))}
              />
              <span>Аутсорс</span>
            </label>
            <label className="analyticsCheckbox">
              <input
                type="checkbox"
                checked={config.includeWebDigital}
                onChange={(event) => setConfig((prev) => ({ ...prev, includeWebDigital: event.target.checked }))}
              />
              <span>Веб и диджитал</span>
            </label>
            <label className="analyticsField analyticsFieldSmall">
              <span>Мощность</span>
              <select
                className="input"
                value={config.capacityMode}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    capacityMode: event.target.value as DepartmentAnalyticsConfig["capacityMode"],
                  }))
                }
              >
                <option value="auto">Авто</option>
                <option value="manual">Ручная</option>
              </select>
            </label>
            <label className="analyticsField analyticsFieldSmall">
              <span>Часы / дизайнер</span>
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                value={config.capacityMode === "manual" ? config.manualHoursPerDesigner : autoHoursState.hours}
                disabled={config.capacityMode !== "manual"}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    manualHoursPerDesigner: Number(event.target.value) || 151,
                  }))
                }
              />
            </label>
            <label className="analyticsField analyticsFieldSmall">
              <span>Сглаживание, мес</span>
              <input
                className="input"
                type="number"
                min={1}
                max={12}
                step={1}
                value={config.smoothingWindowMonths}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    smoothingWindowMonths: Math.max(1, Number(event.target.value) || 3),
                  }))
                }
              />
            </label>
          </div>
        </div>

        {notice ? <div className="analyticsNotice">{notice}</div> : null}
        {error ? <div className="analyticsError">{error}</div> : null}
        {!designerConfig?.assignments?.length ? (
          <div className="analyticsNotice">
            Designer-sort config не найден. Пока все дизайнеры считаются штатными, но можно импортировать JSON из
            `/designer-sort`.
          </div>
        ) : null}

        <div className="analyticsStats muted">
          {config.capacityMode === "auto"
            ? `Авто-мощность: ${formatMetric(autoHoursState.hours)} ч/мес на дизайнера. ${autoHoursState.details}`
            : `Ручная мощность: ${formatMetric(config.manualHoursPerDesigner)} ч/мес на дизайнера.`}
        </div>

        <div className="analyticsSummaryGrid">
          <div className="analyticsSummaryCard">
            <div className="analyticsSummaryLabel">Произведено задач</div>
            <div className="analyticsSummaryValue">{formatMetric(report?.summary.totalTasks ?? 0)}</div>
          </div>
          <div className="analyticsSummaryCard">
            <div className="analyticsSummaryLabel">Практическая нагрузка</div>
            <div className="analyticsSummaryValue">{formatMetric(report?.summary.totalPracticalHours ?? 0)} ч</div>
          </div>
          <div className="analyticsSummaryCard">
            <div className="analyticsSummaryLabel">Теоретическая мощность</div>
            <div className="analyticsSummaryValue">{formatMetric(report?.summary.totalTheoreticalHours ?? 0)} ч</div>
          </div>
          <div className="analyticsSummaryCard">
            <div className="analyticsSummaryLabel">Средняя загрузка / активный дизайнер</div>
            <div className="analyticsSummaryValue">
              {formatMetric(report?.summary.averageHoursPerActiveDesigner ?? 0)} ч
            </div>
          </div>
        </div>

        <div className="analyticsTopFormats">
          <span className="analyticsTopFormatsLabel">Топ форматы:</span>
          {topFormats.length ? (
            topFormats.map((entry) => (
              <span key={entry.formatId} className="badge">
                {entry.title}: {entry.count}
              </span>
            ))
          ) : (
            <span className="muted">пока пусто</span>
          )}
        </div>

        <div className="analyticsTabs">
          <button type="button" className={`btn ${chartsTab === "formats" ? "" : "btnGhost"}`} onClick={() => setChartsTab("formats")}>
            Форматы
          </button>
          <button
            type="button"
            className={`btn ${chartsTab === "productivity" ? "" : "btnGhost"}`}
            onClick={() => setChartsTab("productivity")}
          >
            Производительность
          </button>
        </div>

        <div className="analyticsPriceTableWrap">
          <table className="analyticsPriceTable">
            <thead>
              <tr>
                <th>человек/час</th>
                {taskFormatConfig.catalog.map((entry) => (
                  <th key={entry.id}>{entry.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="analyticsPriceHint">Цена продукта</td>
                {taskFormatConfig.catalog.map((entry) => (
                  <td key={entry.id}>
                    <input
                      className="input analyticsPriceInput"
                      type="number"
                      min={0}
                      step={1}
                      value={config.formatHoursById[entry.id] ?? 0}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          formatHoursById: {
                            ...prev.formatHoursById,
                            [entry.id]: Number(event.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {!report ? (
          <div className="analyticsEmpty">Сначала нажми «Скачать все задачи», чтобы построить аналитику.</div>
        ) : chartsTab === "formats" ? (
          <div className="analyticsFormatsView">
            <div className="analyticsPeriodToolbar">
              <div className="analyticsPeriodModeTabs">
                {([
                  ["month", "Месяц"],
                  ["quarter", "Квартал"],
                  ["year", "Год"],
                  ["custom", "Custom"],
                ] as Array<[AnalyticsDonutPeriodMode, string]>).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`btn ${config.donutPeriodMode === mode ? "" : "btnGhost"}`}
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        donutPeriodMode: mode,
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {config.donutPeriodMode === "custom" ? (
                <div className="analyticsPeriodCustomFields">
                  <label className="analyticsField analyticsFieldDate">
                    <span>Начало</span>
                    <input
                      className="input"
                      type="date"
                      value={config.donutCustomStart}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          donutCustomStart: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="analyticsField analyticsFieldDate">
                    <span>Конец</span>
                    <input
                      className="input"
                      type="date"
                      value={config.donutCustomEnd}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          donutCustomEnd: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              ) : (
                <div className="analyticsPeriodStepper">
                  <button
                    type="button"
                    className="btn btnGhost"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        donutAnchorDate: shiftDonutAnchor(prev.donutAnchorDate, prev.donutPeriodMode, -1),
                      }))
                    }
                  >
                    ←
                  </button>
                  <div className="analyticsPeriodStepperLabel">{donutPeriodLabel}</div>
                  <button
                    type="button"
                    className="btn btnGhost"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        donutAnchorDate: shiftDonutAnchor(prev.donutAnchorDate, prev.donutPeriodMode, 1),
                      }))
                    }
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            {donutBreakdown ? <DonutChart breakdown={donutBreakdown} setTooltipState={setTooltipState} /> : null}
          </div>
        ) : (
          <div className="analyticsProductivityView">
            <ProductivityChart
              report={report}
              smoothingWindowMonths={config.smoothingWindowMonths}
              setTooltipState={setTooltipState}
            />
          </div>
        )}
        </>
        ) : mainTab === "designers" ? (
          <div className="analyticsEmbeddedSection">
            <DesignerSortLab embedded />
          </div>
        ) : (
          <div className="analyticsEmbeddedSection">
            <FormatSortLab embedded />
          </div>
        )}
      </div>

      <Tooltip state={tooltipState} />
    </div>
  );
}
