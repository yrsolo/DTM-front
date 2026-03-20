import React from "react";

import type { DesignerSortAssignment } from "../designerSort/types";
import type { NormalizedTaskFormatId } from "../formatSort/types";
import "../styles/analytics.css";
import {
  buildDepartmentAnalyticsReport,
  computeAutoHoursPerDesigner,
} from "../analytics/calculations";
import { downloadAnalyticsSnapshotFromBrowser } from "../analytics/browserIngestion";
import type {
  AnalyticsDesignerConfig,
  AnalyticsSourceDataset,
  DepartmentAnalyticsConfig,
  DepartmentAnalyticsReport,
} from "../analytics/types";
import { Tooltip, TooltipState } from "../components/Tooltip";
import { taskFormatConfig } from "../formatSort/config";

const ANALYTICS_CONFIG_STORAGE_KEY = "dtm.analytics.config.v1";
const ANALYTICS_DATASET_STORAGE_KEY = "dtm.analytics.dataset.v1";
const DESIGNER_SORT_STORAGE_KEY = "dtm.designerSort.config.v1";
const FILE_INPUT_ACCEPT = "application/json,.json";

type AnalyticsTabId = "table" | "productivity";

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
  return {
    formatHoursById: buildDefaultFormatHours(),
    capacityMode: "auto",
    manualHoursPerDesigner: 151,
    includeOutsource: true,
    includeWebDigital: true,
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

function Chart(props: { report: DepartmentAnalyticsReport }) {
  const rows = props.report.rows;
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.practicalHours, row.theoreticalCapacityHours]));
  const chartHeight = 280;
  const stepX = 74;
  const width = Math.max(840, rows.length * stepX + 80);
  const points = rows
    .map((row, index) => {
      const x = 50 + index * stepX + stepX / 2;
      const y = chartHeight - (row.theoreticalCapacityHours / maxValue) * (chartHeight - 50);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="analyticsChartScroll">
      <svg className="analyticsChart" viewBox={`0 0 ${width} ${chartHeight + 30}`} role="img" aria-label="График продуктивности по месяцам">
        {[0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = chartHeight - fraction * (chartHeight - 50);
          return <line key={fraction} x1="44" y1={y} x2={width - 16} y2={y} className="analyticsChartGrid" />;
        })}
        {rows.map((row, index) => {
          const barHeight = (row.practicalHours / maxValue) * (chartHeight - 50);
          const x = 50 + index * stepX + 10;
          const y = chartHeight - barHeight;
          return (
            <g key={row.monthKey}>
              <rect x={x} y={y} width="28" height={barHeight} rx="10" className="analyticsChartBar" />
              <text x={x + 14} y={chartHeight + 18} textAnchor="middle" className="analyticsChartLabel">
                {row.monthLabel}
              </text>
            </g>
          );
        })}
        <polyline points={points} fill="none" className="analyticsChartLine" />
        {rows.map((row, index) => {
          const x = 50 + index * stepX + stepX / 2;
          const y = chartHeight - (row.theoreticalCapacityHours / maxValue) * (chartHeight - 50);
          return <circle key={`${row.monthKey}-point`} cx={x} cy={y} r="4.5" className="analyticsChartPoint" />;
        })}
      </svg>
    </div>
  );
}

export function AnalyticsPage() {
  const defaultConfig = React.useMemo(() => buildDefaultConfig(), []);
  const [tab, setTab] = React.useState<AnalyticsTabId>("table");
  const [config, setConfig] = React.useState<DepartmentAnalyticsConfig>(() =>
    mergeConfig(defaultConfig, readStoredJson<DepartmentAnalyticsConfig>(ANALYTICS_CONFIG_STORAGE_KEY))
  );
  const [dataset, setDataset] = React.useState<AnalyticsSourceDataset | null>(() =>
    readStoredJson<AnalyticsSourceDataset>(ANALYTICS_DATASET_STORAGE_KEY)
  );
  const [designerConfig, setDesignerConfig] = React.useState<AnalyticsDesignerConfig | null>(() => resolveDesignerConfig(null));
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [tooltipState, setTooltipState] = React.useState<TooltipState>({ visible: false });
  const [autoHoursState, setAutoHoursState] = React.useState<{ hours: number; details: string }>({
    hours: 151,
    details: "Авто-режим ожидает dataset.",
  });
  const designerFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const configFileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    writeStoredJson(ANALYTICS_CONFIG_STORAGE_KEY, config);
  }, [config]);

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

  return (
    <div className="analyticsPage">
      <div className="card analyticsShell">
        <div className="analyticsHeader">
          <div>
            <div className="analyticsEyebrow">Локальная лаборатория аналитики</div>
            <h1 className="pageTitle analyticsTitle">Аналитика отдела</h1>
            <div className="muted">
              Данные обновляются только вручную. Основа расчёта — полный SnapshotV1, нормализованные форматы и локальная сортировка дизайнеров.
            </div>
          </div>
          <div className="analyticsHeaderMeta">
            <div className="analyticsMetaBadge">Форматов: {taskFormatConfig.catalog.length}</div>
            <div className="analyticsMetaBadge">Задач: {dataset?.tasksTotalCollected ?? 0}</div>
            <div className="analyticsMetaBadge">Контур: {dataset?.contour ?? "-"}</div>
          </div>
        </div>

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
            <button type="button" className="btn btnGhost" onClick={() => exportJsonFile("department-analytics-config.local.json", config)}>
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
          </div>
        </div>

        {notice ? <div className="analyticsNotice">{notice}</div> : null}
        {error ? <div className="analyticsError">{error}</div> : null}
        {!designerConfig?.assignments?.length ? (
          <div className="analyticsNotice">
            Designer-sort config не найден. Пока все дизайнеры считаются штатными, но можно импортировать JSON из `/designer-sort`.
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
            <div className="analyticsSummaryValue">{formatMetric(report?.summary.averageHoursPerActiveDesigner ?? 0)} ч</div>
          </div>
        </div>

        <div className="analyticsTopFormats">
          <span className="analyticsTopFormatsLabel">Топ форматы:</span>
          {topFormats.length ? topFormats.map((entry) => (
            <span key={entry.formatId} className="badge">
              {entry.title}: {entry.count}
            </span>
          )) : <span className="muted">пока пусто</span>}
        </div>

        <div className="analyticsTabs">
          <button type="button" className={`btn ${tab === "table" ? "" : "btnGhost"}`} onClick={() => setTab("table")}>
            Таблица
          </button>
          <button type="button" className={`btn ${tab === "productivity" ? "" : "btnGhost"}`} onClick={() => setTab("productivity")}>
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
        ) : tab === "table" ? (
          <div className="analyticsTableScroll">
            <table className="analyticsTable">
              <thead>
                <tr>
                  <th>Месяц</th>
                  {taskFormatConfig.catalog.map((entry) => (
                    <th key={entry.id}>{entry.title}</th>
                  ))}
                  <th>Несорт.</th>
                  <th>Нагрузка, ч</th>
                  <th>Выполнено задач</th>
                  <th>Человеко-часов мощности</th>
                  <th>Активных дизайнеров</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.monthKey}>
                    <td>{row.monthLabel}</td>
                    {taskFormatConfig.catalog.map((entry) => {
                      const tasks = row.tasksByFormat[entry.id] ?? [];
                      return (
                        <td
                          key={`${row.monthKey}-${entry.id}`}
                          onMouseEnter={(event) =>
                            tasks.length
                              ? setTooltipState({
                                  visible: true,
                                  x: event.clientX,
                                  y: event.clientY,
                                  content: buildTooltipContent(
                                    tasks.map((task) => `${task.brand ?? "-"} | ${task.show ?? "-"} | ${task.title}`)
                                  ),
                                })
                              : undefined
                          }
                          onMouseMove={(event) =>
                            tasks.length
                              ? setTooltipState((prev) =>
                                  prev.visible
                                    ? { ...prev, x: event.clientX, y: event.clientY }
                                    : prev
                                )
                              : undefined
                          }
                          onMouseLeave={() => setTooltipState({ visible: false })}
                        >
                          {tasks.length}
                        </td>
                      );
                    })}
                    <td
                      onMouseEnter={(event) =>
                        row.unsortedTasks.length
                          ? setTooltipState({
                              visible: true,
                              x: event.clientX,
                              y: event.clientY,
                              content: buildTooltipContent(
                                row.unsortedTasks.map((task) => `${task.brand ?? "-"} | ${task.show ?? "-"} | ${task.title}`)
                              ),
                            })
                          : undefined
                      }
                      onMouseMove={(event) =>
                        row.unsortedTasks.length
                          ? setTooltipState((prev) => (prev.visible ? { ...prev, x: event.clientX, y: event.clientY } : prev))
                          : undefined
                      }
                      onMouseLeave={() => setTooltipState({ visible: false })}
                    >
                      {row.unsortedTaskCount}
                    </td>
                    <td>{formatMetric(row.practicalHours)}</td>
                    <td>{row.completedTaskCount}</td>
                    <td>{formatMetric(row.theoreticalCapacityHours)}</td>
                    <td
                      onMouseEnter={(event) =>
                        row.activeDesignerNames.length
                          ? setTooltipState({
                              visible: true,
                              x: event.clientX,
                              y: event.clientY,
                              content: buildTooltipContent(row.activeDesignerNames),
                            })
                          : undefined
                      }
                      onMouseMove={(event) =>
                        row.activeDesignerNames.length
                          ? setTooltipState((prev) => (prev.visible ? { ...prev, x: event.clientX, y: event.clientY } : prev))
                          : undefined
                      }
                      onMouseLeave={() => setTooltipState({ visible: false })}
                    >
                      {row.activeDesignerCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="analyticsProductivityView">
            <Chart report={report} />
            <div className="analyticsProductivityTableWrap">
              <table className="analyticsProductivityTable">
                <thead>
                  <tr>
                    <th>Месяц</th>
                    <th>Нагрузка, ч</th>
                    <th>Мощность, ч</th>
                    <th>Активных дизайнеров</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={`${row.monthKey}-productivity`}>
                      <td>{row.monthLabel}</td>
                      <td>{formatMetric(row.practicalHours)}</td>
                      <td>{formatMetric(row.theoreticalCapacityHours)}</td>
                      <td>{row.activeDesignerCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Tooltip state={tooltipState} />
    </div>
  );
}
