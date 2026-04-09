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
import generatedSnapshotJson from "../content/formatSort/taskFormatSourceSnapshot.generated.json";
import { getAuthRequestBase } from "../config/runtimeContour";
import { fetchPersonNamesByOwnerIds } from "../data/api";
import { downloadFullTaskSnapshotFromBrowser } from "../formatSort/browserIngestion";
import { normalizeFormatText } from "../formatSort/resolver";
import type { TaskFormatSourceSnapshot } from "../formatSort/types";
import type {
  BrowserDesignerSortDataset,
  DesignerSortAssignment,
  DesignerSortBucket,
  DesignerSortBucketId,
  DesignerSortConfig,
  DesignerSortEntry,
} from "../designerSort/types";

const DESIGNER_CONFIG_STORAGE_KEY = "dtm.designerSort.config.v1";
const DESIGNER_DATASET_STORAGE_KEY = "dtm.designerSort.dataset.v1";
const SNAPSHOT_STORAGE_KEY = "dtm.snapshot.v1";
const FILE_INPUT_ACCEPT = "application/json,.json";

type AdminOverviewUser = {
  displayName?: string | null;
  personName?: string | null;
  status?: string | null;
};

type SnapshotPerson = NonNullable<TaskFormatSourceSnapshot["people"]>[number];

const DESIGNER_BUCKETS: DesignerSortBucket[] = [
  {
    id: "unsorted",
    title: "Несортировано",
    description: "Все дизайнеры без ручного назначения категории.",
    sortOrder: 10,
  },
  {
    id: "staff",
    title: "В штате",
    description: "Команда, которая работает внутри штата.",
    sortOrder: 20,
  },
  {
    id: "outsource",
    title: "Аутсорс",
    description: "Фрилансеры, студии и внешний продакшн.",
    sortOrder: 30,
  },
  {
    id: "web_digital",
    title: "Веб и диджитал",
    description: "Специалисты по сайту, digital и web-задачам.",
    sortOrder: 40,
  },
];

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

function readPersistedPeopleNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { people?: Array<{ id?: string; name?: string }> };
    return (parsed.people ?? []).reduce<Record<string, string>>((acc, person) => {
      const id = typeof person?.id === "string" ? person.id.trim() : "";
      const name = typeof person?.name === "string" ? person.name.trim() : "";
      if (id && name) {
        acc[id] = name;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function buildPeopleNameMap(people: SnapshotPerson[] | undefined): Record<string, string> {
  return (people ?? []).reduce<Record<string, string>>((acc, person) => {
    const id = typeof person?.id === "string" ? person.id.trim() : "";
    const name = typeof person?.name === "string" ? person.name.trim() : "";
    if (id && name) {
      acc[id] = name;
    }
    return acc;
  }, {});
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

function buildDefaultDataset(): BrowserDesignerSortDataset {
  return {
    snapshot: generatedSnapshotJson as TaskFormatSourceSnapshot,
  };
}

function buildAuthUrl(path: string): string {
  return `${getAuthRequestBase()}${path}`;
}

function normalizeDesignerKey(designerId: string | null, displayName: string | null): string {
  const normalizedName = normalizeFormatText(displayName);
  if (designerId?.trim()) {
    return `id:${designerId.trim()}`;
  }
  return `name:${normalizedName || "unknown"}`;
}

function normalizeDesignerNameVariants(value: string | null | undefined): string[] {
  const base = normalizeFormatText(value);
  if (!base) return [];
  const parts = base.split(" ").filter(Boolean);
  const variants = new Set<string>([base]);
  if (parts.length >= 2) {
    variants.add(`${parts[0]} ${parts[1]}`);
    variants.add(`${parts[1]} ${parts[0]}`);
    variants.add(`${parts[0]} ${parts[1][0] ?? ""}`.trim());
    variants.add(`${parts[1]} ${parts[0][0] ?? ""}`.trim());
  }
  return [...variants].filter(Boolean);
}

async function fetchStaffDesignerNamesFromAdminOverview(): Promise<Set<string>> {
  const response = await fetch(buildAuthUrl("/admin/overview"), {
    credentials: "include",
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = (await response.json()) as { approvedUsers?: AdminOverviewUser[] };
  const names = new Set<string>();
  for (const user of payload.approvedUsers ?? []) {
    for (const candidate of [user.personName, user.displayName]) {
      for (const variant of normalizeDesignerNameVariants(candidate)) {
        names.add(variant);
      }
    }
  }
  return names;
}

function buildDesignerInventory(
  snapshot: TaskFormatSourceSnapshot,
  resolvedOwnerNames: Record<string, string>
): DesignerSortEntry[] {
  const grouped = new Map<string, DesignerSortEntry>();
  const snapshotPeopleNames = buildPeopleNameMap(snapshot.people);

  for (const task of snapshot.tasks) {
    const resolvedName = task.ownerId
      ? snapshotPeopleNames[task.ownerId]?.trim() || resolvedOwnerNames[task.ownerId]?.trim() || ""
      : "";
    const displayName = task.ownerName?.trim() || resolvedName || task.ownerId?.trim() || "[Не назначен]";
    const designerKey = normalizeDesignerKey(task.ownerId, displayName);
    const normalizedName = normalizeFormatText(displayName);
    const existing = grouped.get(designerKey);
    if (existing) {
      existing.taskCount += 1;
      if (existing.sampleTasks.length < 3) {
        existing.sampleTasks.push({ id: task.id, title: task.title });
      }
      if (task.brand && existing.sampleBrands.length < 3 && !existing.sampleBrands.includes(task.brand)) {
        existing.sampleBrands.push(task.brand);
      }
      continue;
    }

    grouped.set(designerKey, {
      designerKey,
      designerId: task.ownerId,
      displayName,
      normalizedName,
      taskCount: 1,
      sampleTasks: [{ id: task.id, title: task.title }],
      sampleBrands: task.brand ? [task.brand] : [],
    });
  }

  return [...grouped.values()].sort((left, right) => {
    if (right.taskCount !== left.taskCount) return right.taskCount - left.taskCount;
    return left.displayName.localeCompare(right.displayName, "ru");
  });
}

function mergeAssignments(
  defaults: DesignerSortAssignment[],
  stored: DesignerSortAssignment[] | undefined
): DesignerSortAssignment[] {
  const byDesignerKey = new Map<string, DesignerSortAssignment>();
  for (const entry of defaults ?? []) {
    byDesignerKey.set(entry.designerKey, entry);
  }
  for (const entry of stored ?? []) {
    byDesignerKey.set(entry.designerKey, entry);
  }
  return [...byDesignerKey.values()].sort((left, right) => left.designerKey.localeCompare(right.designerKey));
}

function mergeConfig(defaultConfig: DesignerSortConfig, storedConfig: DesignerSortConfig | null): DesignerSortConfig {
  if (!storedConfig) return defaultConfig;
  return {
    assignments: mergeAssignments(defaultConfig.assignments, storedConfig.assignments),
  };
}

function visibleBucketId(
  entry: DesignerSortEntry,
  config: DesignerSortConfig,
  inferredStaffNames: Set<string>
): DesignerSortBucketId {
  const manual = config.assignments.find((assignment) => assignment.designerKey === entry.designerKey)?.bucketId;
  if (manual) return manual;
  if (normalizeDesignerNameVariants(entry.displayName).some((variant) => inferredStaffNames.has(variant))) {
    return "staff";
  }
  return "unsorted";
}

function upsertAssignment(
  assignments: DesignerSortAssignment[],
  designerKey: string,
  bucketId: DesignerSortBucketId
): DesignerSortAssignment[] {
  const next = assignments.filter((entry) => entry.designerKey !== designerKey);
  if (bucketId !== "unsorted") {
    next.push({ designerKey, bucketId });
  }
  return next.sort((left, right) => left.designerKey.localeCompare(right.designerKey));
}

function DesignerChip(props: { entry: DesignerSortEntry }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.entry.designerKey,
    data: props.entry,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  const sampleTitles = props.entry.sampleTasks.map((item) => item.title).join("\n");
  const sampleBrands = props.entry.sampleBrands.length ? `\nБренды: ${props.entry.sampleBrands.join(", ")}` : "";
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`formatSortChip ${isDragging ? "isDragging" : ""}`}
      style={style}
      title={`${props.entry.displayName}\nЗадач: ${props.entry.taskCount}${sampleBrands}\n\n${sampleTitles}`}
      {...listeners}
      {...attributes}
    >
      <span className="formatSortChipLabel">{props.entry.displayName}</span>
      <span className="formatSortChipCount">{props.entry.taskCount}</span>
    </button>
  );
}

function DesignerPanel(props: {
  droppableId: DesignerSortBucketId;
  title: string;
  subtitle: string;
  entries: DesignerSortEntry[];
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
          props.entries.map((entry) => <DesignerChip key={entry.designerKey} entry={entry} />)
        ) : (
          <div className="formatSortPanelEmpty">Пусто</div>
        )}
      </div>
    </section>
  );
}

export function DesignerSortPage() {
  return <DesignerSortLab />;
}

export function DesignerSortLab(props: { embedded?: boolean } = {}) {
  const defaultConfig = React.useMemo<DesignerSortConfig>(() => ({ assignments: [] }), []);
  const [config, setConfig] = React.useState<DesignerSortConfig>(() =>
    mergeConfig(defaultConfig, readStoredJson<DesignerSortConfig>(DESIGNER_CONFIG_STORAGE_KEY))
  );
  const [dataset, setDataset] = React.useState<BrowserDesignerSortDataset>(() => {
    const stored = readStoredJson<BrowserDesignerSortDataset>(DESIGNER_DATASET_STORAGE_KEY);
    return stored ?? buildDefaultDataset();
  });
  const [search, setSearch] = React.useState("");
  const [hideSorted, setHideSorted] = React.useState(false);
  const [displayLimit, setDisplayLimit] = React.useState(100);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [draggingEntry, setDraggingEntry] = React.useState<DesignerSortEntry | null>(null);
  const [resolvedOwnerNames, setResolvedOwnerNames] = React.useState<Record<string, string>>(() => ({
    ...buildPeopleNameMap((generatedSnapshotJson as TaskFormatSourceSnapshot).people),
    ...readPersistedPeopleNames(),
  }));
  const [inferredStaffNames, setInferredStaffNames] = React.useState<Set<string>>(() => new Set());
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  React.useEffect(() => {
    writeStoredJson(DESIGNER_CONFIG_STORAGE_KEY, config);
  }, [config]);

  React.useEffect(() => {
    writeStoredJson(DESIGNER_DATASET_STORAGE_KEY, dataset);
  }, [dataset]);

  React.useEffect(() => {
    let cancelled = false;
    const ownerIds = [...new Set(dataset.snapshot.tasks.map((task) => task.ownerId?.trim() ?? "").filter(Boolean))];
    if (!ownerIds.length) return;
    const snapshotPeopleNames = buildPeopleNameMap(dataset.snapshot.people);
    const persistedPeopleNames = readPersistedPeopleNames();
    if (Object.keys(snapshotPeopleNames).length || Object.keys(persistedPeopleNames).length) {
      setResolvedOwnerNames((prev) => ({ ...snapshotPeopleNames, ...persistedPeopleNames, ...prev }));
    }

    void fetchPersonNamesByOwnerIds(ownerIds).then((next) => {
      if (!cancelled && Object.keys(next).length) {
        setResolvedOwnerNames((prev) => ({ ...snapshotPeopleNames, ...persistedPeopleNames, ...prev, ...next }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dataset.snapshot]);

  React.useEffect(() => {
    let cancelled = false;
    void fetchStaffDesignerNamesFromAdminOverview()
      .then((names) => {
        if (!cancelled) setInferredStaffNames(names);
      })
      .catch(() => {
        if (!cancelled) setInferredStaffNames(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inventory = React.useMemo(
    () => buildDesignerInventory(dataset.snapshot, resolvedOwnerNames),
    [dataset.snapshot, resolvedOwnerNames]
  );

  const filteredEntries = React.useMemo(() => {
    const normalizedSearch = normalizeFormatText(search);
    return inventory.filter((entry) => {
      const assignedBucket = visibleBucketId(entry, config, inferredStaffNames);
      if (hideSorted && assignedBucket !== "unsorted") return false;
      if (!normalizedSearch) return true;
      const haystack = [
        entry.displayName,
        entry.normalizedName,
        entry.designerId ?? "",
        ...entry.sampleTasks.map((item) => item.title),
        ...entry.sampleBrands,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [config, hideSorted, inferredStaffNames, inventory, search]);

  const limitedEntries = React.useMemo(
    () => filteredEntries.slice(0, Math.max(1, Math.min(1000, displayLimit))),
    [displayLimit, filteredEntries]
  );

  const groupedEntries = React.useMemo(() => {
    const grouped = new Map<DesignerSortBucketId, DesignerSortEntry[]>();
    for (const bucket of DESIGNER_BUCKETS) {
      grouped.set(bucket.id, []);
    }
    for (const entry of limitedEntries) {
      grouped.get(visibleBucketId(entry, config, inferredStaffNames))?.push(entry);
    }
    return grouped;
  }, [config, inferredStaffNames, limitedEntries]);

  async function handleManualRefresh() {
    setIsRefreshing(true);
    setError(null);
    setNotice("Качаем полный набор задач и пересобираем список дизайнеров...");
    try {
      const snapshot = await downloadFullTaskSnapshotFromBrowser();
      setDataset({ snapshot });
      setNotice(
        `Собрано ${snapshot.tasksTotalCollected} задач и ${buildDesignerInventory(snapshot, resolvedOwnerNames).length} дизайнеров.`
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось скачать полный набор задач.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleExportConfig() {
    exportJsonFile("designer-sort-config.local.json", {
      buckets: DESIGNER_BUCKETS,
      assignments: config.assignments,
    });
    setNotice("Локальный config дизайнеров экспортирован в JSON.");
  }

  function handleExportSnapshot() {
    exportJsonFile("designer-sort-snapshot.local.json", dataset.snapshot);
    setNotice("Текущий слепок задач экспортирован в JSON.");
  }

  function handleImportConfig(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<DesignerSortConfig> & {
          assignments?: DesignerSortAssignment[];
        };
        setConfig(mergeConfig(defaultConfig, { assignments: parsed.assignments ?? [] }));
        setNotice("Config дизайнеров импортирован.");
        setError(null);
      } catch {
        setError("Не удалось прочитать JSON config дизайнеров.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleResetLocalState() {
    setConfig(defaultConfig);
    setDataset(buildDefaultDataset());
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DESIGNER_CONFIG_STORAGE_KEY);
      window.localStorage.removeItem(DESIGNER_DATASET_STORAGE_KEY);
    }
    setNotice("Локальная сортировка дизайнеров сброшена до пустого состояния.");
    setError(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingEntry((event.active.data.current ?? null) as DesignerSortEntry | null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingEntry(null);
    const entry = (event.active.data.current ?? null) as DesignerSortEntry | null;
    if (!entry || !event.over) return;
    const nextBucket = String(event.over.id) as DesignerSortBucketId;
    setConfig((prev) => ({
      assignments: upsertAssignment(prev.assignments, entry.designerKey, nextBucket),
    }));
  }

  const content = (
    <div className={props.embedded ? "formatSortShell formatSortShellEmbedded" : "card formatSortShell"}>
        {!props.embedded ? (
        <div className="formatSortHeader">
          <div>
            <div className="formatSortEyebrow">Локальная лаборатория дизайнеров</div>
            <h1 className="pageTitle formatSortTitle">Сортировка дизайнеров</h1>
            <div className="muted">
              Автообновление отключено. Полный dataset обновляется только по кнопке <strong>Скачать всех дизайнеров</strong>.
            </div>
          </div>
          <div className="formatSortHeaderMeta">
            <div className="formatSortMetaBadge">Дизайнеров: {inventory.length}</div>
            <div className="formatSortMetaBadge">Задач: {dataset.snapshot.tasksTotalCollected}</div>
            <div className="formatSortMetaBadge">Контур: {dataset.snapshot.contour}</div>
          </div>
        </div>
        ) : null}

        <div className="formatSortToolbar">
          <div className="formatSortToolbarPrimary">
            <button type="button" className="btn" onClick={() => void handleManualRefresh()} disabled={isRefreshing}>
              {isRefreshing ? "Скачиваем..." : "Скачать всех дизайнеров"}
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
                placeholder="Карнаухов, студия, веб, digital..."
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
              <span>Скрыть уже отсортированных</span>
            </label>
          </div>
        </div>

        {notice ? <div className="formatSortNotice">{notice}</div> : null}
        {error ? <div className="formatSortError">{error}</div> : null}

        <div className="formatSortStats muted">
          На экране: {limitedEntries.length} из {filteredEntries.length} дизайнеров. Repo snapshot: {dataset.snapshot.generatedAt}.
        </div>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="formatSortGrid">
            <div className="formatSortCatalogGrid">
              {DESIGNER_BUCKETS.map((bucket) => (
                <DesignerPanel
                  key={bucket.id}
                  droppableId={bucket.id}
                  title={bucket.title}
                  subtitle={bucket.description}
                  entries={groupedEntries.get(bucket.id) ?? []}
                  isPrimary={bucket.id === "unsorted"}
                />
              ))}
            </div>
          </div>

          <DragOverlay>{draggingEntry ? <DesignerChip entry={draggingEntry} /> : null}</DragOverlay>
        </DndContext>

        <div className="formatSortRepoInfo">
          <div className="muted">
            Экспортированный JSON можно использовать как рабочую ручную раскладку, а следующий шаг уже спокойно перевести в YAML-конфиг.
          </div>
        </div>
    </div>
  );

  if (props.embedded) {
    return content;
  }

  return <div className="formatSortPage">{content}</div>;
}
