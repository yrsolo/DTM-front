import { TaskV1 } from "@dtm/schema/snapshot";

import { MobileTaskList } from "../components/miniapp/MobileTaskList";
import { TaskQuickFilter, TaskScopeMode } from "../data/selectors/taskSelectors";

function filterLabel(filter: TaskQuickFilter): string {
  if (filter === "today") return "Сегодня";
  if (filter === "overdue") return "Просрочено";
  if (filter === "week") return "Неделя";
  return "Все";
}

export function MiniAppTasksPage(props: {
  tasks: TaskV1[];
  scopeMode: TaskScopeMode;
  quickFilter: TaskQuickFilter;
  stats: Record<TaskQuickFilter, number>;
  canViewAllTasks: boolean;
  onChangeScope: (mode: TaskScopeMode) => void;
  onChangeQuickFilter: (filter: TaskQuickFilter) => void;
  onOpenTask: (taskId: string) => void;
  unresolvedPersonLink: boolean;
}) {
  return (
    <div className="miniAppSection">
      <div className="miniAppControls">
        <div className="miniAppSegmented">
          <button
            type="button"
            className={`miniAppChip ${props.scopeMode === "mine" ? "isActive" : ""}`}
            onClick={() => props.onChangeScope("mine")}
          >
            Мои
          </button>
          {props.canViewAllTasks ? (
            <button
              type="button"
              className={`miniAppChip ${props.scopeMode === "all" ? "isActive" : ""}`}
              onClick={() => props.onChangeScope("all")}
            >
              Все
            </button>
          ) : null}
        </div>
        <div className="miniAppQuickFilters">
          {(["all", "today", "overdue", "week"] as TaskQuickFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`miniAppChip ${props.quickFilter === filter ? "isActive" : ""}`}
              onClick={() => props.onChangeQuickFilter(filter)}
            >
              {filterLabel(filter)} {props.stats[filter]}
            </button>
          ))}
        </div>
      </div>
      {props.unresolvedPersonLink && props.scopeMode === "mine" ? (
        <div className="miniAppNotice">
          Для режима “Мои” пока нет подтверждённой связи с дизайнером. Показан пустой список до обновления linkage.
        </div>
      ) : null}
      <MobileTaskList tasks={props.tasks} onOpenTask={props.onOpenTask} />
    </div>
  );
}
