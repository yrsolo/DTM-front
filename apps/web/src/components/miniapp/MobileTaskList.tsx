import { TaskV1 } from "@dtm/schema/snapshot";

function taskDueDate(task: TaskV1): string {
  return task.nextDue ?? task.end ?? task.start ?? "—";
}

export function MobileTaskList(props: {
  tasks: TaskV1[];
  onOpenTask: (taskId: string) => void;
}) {
  if (!props.tasks.length) {
    return <div className="miniAppEmpty">Нет задач для текущего фильтра.</div>;
  }

  return (
    <div className="miniAppTaskList">
      {props.tasks.map((task) => (
        <button
          key={task.id}
          type="button"
          className="miniAppTaskCard"
          onClick={() => props.onOpenTask(task.id)}
        >
          <div className="miniAppTaskCardTop">
            <span className="miniAppTaskDue">{taskDueDate(task)}</span>
            <span className={`miniAppTaskStatus is-${task.status}`}>{task.status}</span>
          </div>
          <div className="miniAppTaskTitle">{task.title}</div>
          <div className="miniAppTaskMeta">
            {[task.brand, task.format_, task.ownerName].filter(Boolean).join(" • ") || "Без дополнительных метаданных"}
          </div>
        </button>
      ))}
    </div>
  );
}
