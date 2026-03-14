import React from "react";

export type MiniTaskGroupingMode = "designer" | "brand" | "show";

export type MiniTaskListItem = {
  id: string;
  title: string;
  ownerName: string | null;
  brand: string | null;
  format: string | null;
  showName: string | null;
  dueLabel: string;
};

type TaskGroup = {
  key: string;
  label: string;
  items: MiniTaskListItem[];
};

function readGroupingValue(item: MiniTaskListItem, mode: MiniTaskGroupingMode): string | null {
  if (mode === "designer") return item.ownerName;
  if (mode === "brand") return item.brand;
  return item.showName;
}

function buildGroups(items: MiniTaskListItem[], mode: MiniTaskGroupingMode): TaskGroup[] {
  const groups = new Map<string, TaskGroup>();
  for (const item of items) {
    const rawLabel = readGroupingValue(item, mode)?.trim() || "Без группы";
    const key = rawLabel.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(key, {
      key,
      label: rawLabel,
      items: [item],
    });
  }

  return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label, "ru"));
}

function renderField(item: MiniTaskListItem, mode: MiniTaskGroupingMode): string {
  const fields: string[] = [];
  if (mode !== "brand" && item.brand?.trim()) fields.push(item.brand.trim());
  if (mode !== "designer" && item.ownerName?.trim()) fields.push(item.ownerName.trim());
  if (item.format?.trim()) fields.push(item.format.trim());
  if (mode !== "show" && item.showName?.trim()) fields.push(item.showName.trim());
  return fields.join(" | ") || item.title;
}

export function MobileTaskList(props: {
  items: MiniTaskListItem[];
  groupingMode: MiniTaskGroupingMode;
  toggleAllToken?: number;
  onOpenTask: (taskId: string) => void;
}) {
  const groups = React.useMemo(
    () => buildGroups(props.items, props.groupingMode),
    [props.groupingMode, props.items]
  );
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next: Record<string, boolean> = {};
      for (const group of groups) {
        next[group.key] = prev[group.key] ?? true;
      }
      return next;
    });
  }, [groups]);

  React.useEffect(() => {
    if (!props.toggleAllToken || !groups.length) return;
    setOpenGroups((prev) => {
      const areAllOpen = groups.every((group) => prev[group.key] ?? true);
      const nextValue = !areAllOpen;
      const next: Record<string, boolean> = {};
      for (const group of groups) {
        next[group.key] = nextValue;
      }
      return next;
    });
  }, [groups, props.toggleAllToken]);

  if (!props.items.length) {
    return <div className="miniAppEmpty">Нет активных задач.</div>;
  }

  return (
    <div className="miniAppTaskGroups">
      {groups.map((group) => {
        const isOpen = openGroups[group.key] ?? true;
        return (
          <section key={group.key} className="miniAppTaskGroup">
            <button
              type="button"
              className={`miniAppTaskGroupToggle ${isOpen ? "isOpen" : ""}`}
              onClick={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [group.key]: !isOpen,
                }))
              }
            >
              <span className="miniAppTaskGroupLabel">{group.label}</span>
              <span className="miniAppTaskGroupCount">{group.items.length}</span>
            </button>
            {isOpen ? (
              <div className="miniAppTaskList">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="miniAppTaskCard miniAppTaskCardCompact"
                    onClick={() => props.onOpenTask(item.id)}
                    title={item.title}
                  >
                    <div className="miniAppTaskRowMain">
                      <div className="miniAppTaskRowFields">{renderField(item, props.groupingMode)}</div>
                      <span className="miniAppTaskDueBubble">{item.dueLabel}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
