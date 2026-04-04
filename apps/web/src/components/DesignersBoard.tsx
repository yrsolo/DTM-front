import React from "react";
import { GroupV1, PersonV1, TaskV1 } from "@dtm/schema/snapshot";
import { InspectorNodeBoundary } from "../inspector-integration/boundary";

const MAX_DESIGNER_COLUMNS = 10;

type DesignerColumn = {
  key: string;
  name: string;
  tasks: TaskV1[];
};

function normalizeText(value?: string | null): string {
  return value?.trim() || "-";
}

function resolveDesignerKey(task: TaskV1): string {
  if (task.ownerId?.trim()) return `id:${task.ownerId.trim()}`;
  if (task.ownerName?.trim()) return `name:${task.ownerName.trim()}`;
  return "unassigned";
}

function resolveDesignerName(task: TaskV1, peopleById: Map<string, string>, unassignedLabel: string): string {
  if (task.ownerId?.trim()) return peopleById.get(task.ownerId.trim()) ?? task.ownerId.trim();
  if (task.ownerName?.trim()) return task.ownerName.trim();
  return unassignedLabel;
}

function splitDesignerName(fullName: string): { firstLine: string; secondLine: string } {
  const clean = fullName.trim();
  if (!clean) return { firstLine: "-", secondLine: "" };
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstLine: parts[0], secondLine: "" };
  return {
    firstLine: parts[parts.length - 1],
    secondLine: parts.slice(0, -1).join(" "),
  };
}

function hashToHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 8;
}

export function DesignersBoard(props: {
  tasks: TaskV1[];
  people: PersonV1[];
  groups?: GroupV1[];
  unassignedLabel: string;
  onTaskClick: (task: TaskV1) => void;
  onTaskHover: (e: React.MouseEvent, task: TaskV1) => void;
  onTaskLeave: () => void;
}) {
  const peopleById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const person of props.people) map.set(person.id, person.name);
    return map;
  }, [props.people]);

  const groupsById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const group of props.groups ?? []) map.set(group.id, group.name);
    return map;
  }, [props.groups]);

  const columns = React.useMemo<DesignerColumn[]>(() => {
    const byDesigner = new Map<string, DesignerColumn>();
    for (const task of props.tasks) {
      const key = resolveDesignerKey(task);
      const name = resolveDesignerName(task, peopleById, props.unassignedLabel);
      const existing = byDesigner.get(key);
      if (existing) {
        existing.tasks.push(task);
      } else {
        byDesigner.set(key, { key, name, tasks: [task] });
      }
    }

    return [...byDesigner.values()]
      .sort((a, b) => {
        if (b.tasks.length !== a.tasks.length) return b.tasks.length - a.tasks.length;
        return a.name.localeCompare(b.name, "ru");
      })
      .slice(0, MAX_DESIGNER_COLUMNS);
  }, [props.tasks, peopleById, props.unassignedLabel]);

  return (
    <InspectorNodeBoundary
      label="Designers board"
      kind="content"
      semanticTargetId="app.designers.board"
      sourcePath="apps/web/src/components/DesignersBoard.tsx"
    >
    <div className="designersBoardScroll" data-inspector-target-id="app.designers.board">
      <div className="designersBoard" style={{ ["--designer-cols" as string]: String(Math.max(1, columns.length)) }}>
        {columns.map((column) => (
          <section key={column.key} className="designerColumn">
            <header className="designerColumnHeader">
              <span className="designerColumnName">
                <span className="designerColumnNameLine">
                  {splitDesignerName(column.name).firstLine}
                </span>
                <span className="designerColumnNameLine">
                  {splitDesignerName(column.name).secondLine}
                </span>
              </span>
              <span className="badge designerColumnCount">{column.tasks.length}</span>
            </header>
            <div className="designerColumnBody">
              {column.tasks.map((task) => {
                const format = normalizeText(task.format_ ?? task.type);
                const brand = normalizeText(task.brand);
                const showName = normalizeText(task.groupId ? groupsById.get(task.groupId) : "");

                return (
                  <button
                    type="button"
                    key={task.id}
                    className="designerTaskCard"
                    style={
                      {
                        ["--designer-task-color" as string]: `var(--task-color-${hashToHue(task.id) + 1}, var(--key-blue, #6897ff))`,
                      } as React.CSSProperties
                    }
                    onClick={() => props.onTaskClick(task)}
                    onMouseMove={(e) => props.onTaskHover(e, task)}
                    onMouseLeave={props.onTaskLeave}
                    title={task.title}
                  >
                    <div className="designerTaskBrand">{brand}</div>
                    <div className="designerTaskMeta">
                      <span className="badge">{format}</span>
                      <span className="designerTaskShow">{showName}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
    </InspectorNodeBoundary>
  );
}
