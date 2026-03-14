import { AgendaDayGroup } from "../../data/selectors/timelineSelectors";

export function MobileAgendaList(props: {
  groups: AgendaDayGroup[];
  onOpenTask: (taskId: string) => void;
}) {
  if (!props.groups.length) {
    return <div className="miniAppEmpty">Нет активных дедлайнов.</div>;
  }

  return (
    <div className="miniAppAgenda">
      {props.groups.map((group) => (
        <section key={group.key} className="miniAppAgendaGroup">
          <h2 className="miniAppAgendaTitle">{group.label}</h2>
          <div className="miniAppAgendaItems">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="miniAppAgendaItem"
                onClick={() => props.onOpenTask(item.taskId)}
              >
                <div className="miniAppAgendaItemTop">
                  <span>{item.date}</span>
                  {item.isToday ? <span className="miniAppAgendaBadge isToday">Сегодня</span> : null}
                </div>
                <div className="miniAppTaskTitle">{item.title}</div>
                <div className="miniAppTaskMeta">
                  {[item.subtitle, item.personLabel].filter(Boolean).join(" • ") || "Без дополнительных метаданных"}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
