import { AgendaDayGroup } from "../data/selectors/timelineSelectors";
import { MobileAgendaList } from "../components/miniapp/MobileAgendaList";

export function MiniAppTimelinePage(props: {
  groups: AgendaDayGroup[];
  onOpenTask: (taskId: string) => void;
}) {
  return (
    <div className="miniAppSection">
      <MobileAgendaList groups={props.groups} onOpenTask={props.onOpenTask} />
    </div>
  );
}
