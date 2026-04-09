import React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import "../styles/formatSort.css";
import generatedInventoryJson from "../content/formatSort/taskFormatInventory.generated.json";
import generatedSnapshotJson from "../content/formatSort/taskFormatSourceSnapshot.generated.json";
import { taskFormatConfig } from "../formatSort/config";
import { downloadAllTasksFromBrowser } from "../formatSort/browserIngestion";
import { buildRawTaskFormatInventory, normalizeFormatText, UNSORTED_FORMAT_ID } from "../formatSort/resolver";
import type {
  BrowserFormatSortDataset,
  NormalizedTaskFormatId,
  RawTaskFormatEntry,
  TaskFormatAliasRule,
  TaskFormatCatalogEntry,
  TaskFormatConfig,
  TaskFormatManualOverride,
  TaskFormatSourceSnapshot,
} from "../formatSort/types";

const CONFIG_STORAGE_KEY = "dtm.formatSort.config.v1";
const DATASET_STORAGE_KEY = "dtm.formatSort.dataset.v1";
const FILE_INPUT_ACCEPT = "application/json,.json";

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

function mergeCatalog(
  defaults: TaskFormatCatalogEntry[],
  stored: TaskFormatCatalogEntry[] | undefined
): TaskFormatCatalogEntry[] {
  const byId = new Map(defaults.map((entry) => [entry.id, entry]));
  for (const entry of stored ?? []) {
    if (!byId.has(entry.id)) {
      byId.set(entry.id, entry);
    }
  }
  return [...byId.values()].sort((left, right) => left.sortOrder - right.sortOrder);
}

function mergeAliasRules(defaults: TaskFormatAliasRule[], stored: TaskFormatAliasRule[] | undefined): TaskFormatAliasRule[] {
  const seen = new Set<string>();
  const merged: TaskFormatAliasRule[] = [];

  for (const rule of [...(defaults ?? []), ...(stored ?? [])]) {
    const aliases = [...(rule.aliases ?? [])].sort();
    const containsAll = [...(rule.containsAll ?? [])].map((entry) => [...entry].sort()).sort();
    const excludes = [...(rule.excludes ?? [])].sort();
    const key = JSON.stringify({
      formatId: rule.formatId,
      aliases,
      containsAll,
      excludes,
      priority: rule.priority ?? 0,
    });
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(rule);
  }

  return merged.sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
}

function mergeManualOverrides(
  defaults: TaskFormatManualOverride[],
  stored: TaskFormatManualOverride[] | undefined
): TaskFormatManualOverride[] {
  const byRaw = new Map<string, TaskFormatManualOverride>();
  for (const entry of defaults ?? []) {
    byRaw.set(normalizeFormatText(entry.rawValue), entry);
  }
  for (const entry of stored ?? []) {
    byRaw.set(normalizeFormatText(entry.rawValue), entry);
  }
  return [...byRaw.values()].sort((left, right) => left.rawValue.localeCompare(right.rawValue, "ru"));
}

function mergeConfig(defaultConfig: TaskFormatConfig, storedConfig: TaskFormatConfig | null): TaskFormatConfig {
  if (!storedConfig) return defaultConfig;
  return {
    catalog: mergeCatalog(defaultConfig.catalog, storedConfig.catalog),
    aliasRules: mergeAliasRules(defaultConfig.aliasRules, storedConfig.aliasRules),
    manualOverrides: mergeManualOverrides(defaultConfig.manualOverrides, storedConfig.manualOverrides),
  };
}

function buildDefaultDataset(config: TaskFormatConfig): BrowserFormatSortDataset {
  const snapshot = generatedSnapshotJson as TaskFormatSourceSnapshot;
  const generatedInventory = generatedInventoryJson as RawTaskFormatEntry[];
  return {
    snapshot,
    inventory: generatedInventory.length ? generatedInventory : buildRawTaskFormatInventory(snapshot, config),
  };
}

function visibleFormatId(entry: RawTaskFormatEntry): NormalizedTaskFormatId | typeof UNSORTED_FORMAT_ID {
  return entry.manualFormatId ?? entry.autoMatchFormatId ?? UNSORTED_FORMAT_ID;
}

function upsertManualOverride(
  overrides: TaskFormatManualOverride[],
  rawValue: string,
  formatId: NormalizedTaskFormatId | typeof UNSORTED_FORMAT_ID
) {
  const normalizedRawValue = normalizeFormatText(rawValue);
  const next = overrides.filter((entry) => normalizeFormatText(entry.rawValue) !== normalizedRawValue);
  if (formatId !== UNSORTED_FORMAT_ID) {
    next.push({ rawValue, formatId });
  }
  return next.sort((left, right) => left.rawValue.localeCompare(right.rawValue, "ru"));
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

function FormatChip(props: { entry: RawTaskFormatEntry }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.entry.normalizedRawValue,
    data: props.entry,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  const sampleTitles = props.entry.sampleTasks.map((item) => item.title).join("\n");
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`formatSortChip ${isDragging ? "isDragging" : ""}`}
      style={style}
      title={`${props.entry.rawValue}\nCount: ${props.entry.count}\n\n${sampleTitles}`}
      {...listeners}
      {...attributes}
    >
      <span className="formatSortChipLabel">{props.entry.rawValue}</span>
      <span className="formatSortChipCount">{props.entry.count}</span>
    </button>
  );
}

function FormatPanel(props: {
  droppableId: string;
  title: string;
  subtitle: string;
  entries: RawTaskFormatEntry[];
  isPrimary?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: props.droppableId,
  });
  return (
    <section ref={setNodeRef} className={`formatSortPanel ${props.isPrimary ? "isPrimary" : ""} ${isOver ? "isOver" : ""}`}>
      <div className="formatSortPanelHeader">
        <div>
          <h3 className="formatSortPanelTitle">{props.title}</h3>
          <div className="formatSortPanelSubtitle">{props.subtitle}</div>
        </div>
        <span className="formatSortPanelCount">{props.entries.length}</span>
      </div>
      <div className="formatSortPanelBody">
        {props.entries.length ? (
          props.entries.map((entry) => <FormatChip key={entry.normalizedRawValue} entry={entry} />)
        ) : (
          <div className="formatSortPanelEmpty">Пусто</div>
        )}
      </div>
    </section>
  );
}

export function FormatSortPage() {
  return <FormatSortLab />;
}

export function FormatSortLab(props: { embedded?: boolean } = {}) {
  const defaultConfig = taskFormatConfig as TaskFormatConfig;
  const [config, setConfig] = React.useState<TaskFormatConfig>(() =>
    mergeConfig(defaultConfig, readStoredJson<TaskFormatConfig>(CONFIG_STORAGE_KEY))
  );
  const [dataset, setDataset] = React.useState<BrowserFormatSortDataset>(() => {
    const stored = readStoredJson<BrowserFormatSortDataset>(DATASET_STORAGE_KEY);
    return stored ?? buildDefaultDataset(defaultConfig);
  });
  const [search, setSearch] = React.useState("");
  const [hideSorted, setHideSorted] = React.useState(false);
  const [displayLimit, setDisplayLimit] = React.useState(100);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [draggingEntry, setDraggingEntry] = React.useState<RawTaskFormatEntry | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  React.useEffect(() => {
    setConfig((prev) => mergeConfig(defaultConfig, prev));
  }, [defaultConfig]);

  React.useEffect(() => {
    writeStoredJson(CONFIG_STORAGE_KEY, config);
  }, [config]);

  React.useEffect(() => {
    writeStoredJson(DATASET_STORAGE_KEY, dataset);
  }, [dataset]);

  const inventory = React.useMemo(() => buildRawTaskFormatInventory(dataset.snapshot, config), [config, dataset.snapshot]);

  const filteredEntries = React.useMemo(() => {
    const normalizedSearch = normalizeFormatText(search);
    return inventory.filter((entry) => {
      const assignedId = visibleFormatId(entry);
      if (hideSorted && assignedId !== UNSORTED_FORMAT_ID) return false;
      if (!normalizedSearch) return true;
      const haystack = [
        entry.rawValue,
        entry.normalizedRawValue,
        entry.autoMatchFormatId ?? "",
        entry.manualFormatId ?? "",
        ...entry.sampleTasks.map((item) => item.title),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [hideSorted, inventory, search]);

  const limitedEntries = React.useMemo(
    () => filteredEntries.slice(0, Math.max(1, Math.min(1000, displayLimit))),
    [displayLimit, filteredEntries]
  );

  const groupedEntries = React.useMemo(() => {
    const grouped = new Map<string, RawTaskFormatEntry[]>();
    grouped.set(UNSORTED_FORMAT_ID, []);
    for (const entry of limitedEntries) {
      const targetId = visibleFormatId(entry);
      if (!grouped.has(targetId)) grouped.set(targetId, []);
      grouped.get(targetId)?.push(entry);
    }
    return grouped;
  }, [limitedEntries]);

  async function handleManualRefresh() {
    setIsRefreshing(true);
    setError(null);
    setNotice("Качаем полный набор задач и пересобираем inventory...");
    try {
      const nextDataset = await downloadAllTasksFromBrowser(config);
      setDataset(nextDataset);
      setNotice(`Скачано ${nextDataset.snapshot.tasksTotalCollected} задач. Raw форматов: ${nextDataset.inventory.length}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось скачать полный набор задач.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleExportConfig() {
    exportJsonFile("task-format-config.local.json", config);
    setNotice("Локальный config экспортирован в JSON.");
  }

  function handleExportSnapshot() {
    exportJsonFile("task-format-snapshot.local.json", dataset.snapshot);
    setNotice("Текущий слепок задач экспортирован в JSON.");
  }

  function handleImportConfig(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as TaskFormatConfig;
        setConfig(mergeConfig(defaultConfig, parsed));
        setNotice("Config импортирован.");
        setError(null);
      } catch {
        setError("Не удалось прочитать JSON config.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleResetLocalState() {
    const nextConfig = mergeConfig(defaultConfig, null);
    const nextDataset = buildDefaultDataset(nextConfig);
    setConfig(nextConfig);
    setDataset(nextDataset);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CONFIG_STORAGE_KEY);
      window.localStorage.removeItem(DATASET_STORAGE_KEY);
    }
    setNotice("Локальные правки сброшены до repo-версии.");
    setError(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingEntry((event.active.data.current ?? null) as RawTaskFormatEntry | null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingEntry(null);
    const entry = (event.active.data.current ?? null) as RawTaskFormatEntry | null;
    if (!entry || !event.over) return;
    const nextTarget = String(event.over.id);
    const nextManualOverrides = upsertManualOverride(
      config.manualOverrides,
      entry.rawValue,
      nextTarget === UNSORTED_FORMAT_ID ? UNSORTED_FORMAT_ID : (nextTarget as NormalizedTaskFormatId)
    );
    setConfig((prev) => ({
      ...prev,
      manualOverrides: nextManualOverrides,
    }));
  }

  const content = (
    <div className={props.embedded ? "formatSortShell formatSortShellEmbedded" : "card formatSortShell"}>
        {!props.embedded ? (
        <div className="formatSortHeader">
          <div>
            <div className="formatSortEyebrow">Локальная лаборатория нормализации</div>
            <h1 className="pageTitle formatSortTitle">Сортировка форматов задач</h1>
            <div className="muted">
              Автообновление отключено. Полный dataset обновляется только по кнопке <strong>Скачать все задачи</strong>.
            </div>
          </div>
          <div className="formatSortHeaderMeta">
            <div className="formatSortMetaBadge">Задач: {dataset.snapshot.tasksTotalCollected}</div>
            <div className="formatSortMetaBadge">Raw форматов: {inventory.length}</div>
            <div className="formatSortMetaBadge">Контур: {dataset.snapshot.contour}</div>
          </div>
        </div>
        ) : null}

        <div className="formatSortToolbar">
          <div className="formatSortToolbarPrimary">
            <button type="button" className="btn" onClick={() => void handleManualRefresh()} disabled={isRefreshing}>
              {isRefreshing ? "Скачиваем..." : "Скачать все задачи"}
            </button>
            <button type="button" className="btn btnGhost" onClick={handleExportConfig}>
              Экспортировать config
            </button>
            <button type="button" className="btn btnGhost" onClick={handleExportSnapshot}>
              Экспортировать слепок
            </button>
            <button type="button" className="btn btnGhost" onClick={() => fileInputRef.current?.click()}>
              Импортировать config
            </button>
            <button type="button" className="btn btnGhost" onClick={handleResetLocalState}>
              Сбросить локальное
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_INPUT_ACCEPT}
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleImportConfig(file);
                }
                event.target.value = "";
              }}
            />
          </div>

          <div className="formatSortToolbarSecondary">
            <label className="formatSortField">
              <span>Поиск</span>
              <input
                className="input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="дин лого, граф ролик, брендинг..."
              />
            </label>
            <label className="formatSortField isSmall">
              <span>Лимит</span>
              <input
                className="input"
                type="number"
                min={1}
                max={1000}
                value={displayLimit}
                onChange={(event) => setDisplayLimit(Number(event.target.value) || 100)}
              />
            </label>
            <label className="formatSortCheckbox">
              <input type="checkbox" checked={hideSorted} onChange={(event) => setHideSorted(event.target.checked)} />
              <span>Скрыть уже отсортированные</span>
            </label>
          </div>
        </div>

        {notice ? <div className="formatSortNotice">{notice}</div> : null}
        {error ? <div className="formatSortError">{error}</div> : null}

        <div className="formatSortStats muted">
          На экране: {limitedEntries.length} из {filteredEntries.length} форматов. Repo snapshot: {dataset.snapshot.generatedAt}.
        </div>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="formatSortGrid">
            <FormatPanel
              droppableId={UNSORTED_FORMAT_ID}
              title="Несортированные"
              subtitle="Сюда попадают raw-значения без уверенного match или без ручного назначения."
              entries={groupedEntries.get(UNSORTED_FORMAT_ID) ?? []}
              isPrimary
            />
            <div className="formatSortCatalogGrid">
              {[...config.catalog]
                .sort((left, right) => left.sortOrder - right.sortOrder)
                .map((entry) => (
                  <FormatPanel
                    key={entry.id}
                    droppableId={entry.id}
                    title={entry.title}
                    subtitle={entry.description ?? "Нормализованный формат"}
                    entries={groupedEntries.get(entry.id) ?? []}
                  />
                ))}
            </div>
          </div>

          <DragOverlay>{draggingEntry ? <FormatChip entry={draggingEntry} /> : null}</DragOverlay>
        </DndContext>

        <div className="formatSortRepoInfo">
          <div className="muted">
            Repo-owned артефакты уже лежат в `apps/web/src/content/formatSort/`: config, generated inventory и полный слепок
            задач.
          </div>
        </div>
    </div>
  );

  if (props.embedded) {
    return content;
  }

  return <div className="formatSortPage">{content}</div>;
}
