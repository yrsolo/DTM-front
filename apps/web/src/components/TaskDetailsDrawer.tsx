import { GroupV1, PersonV1, TaskV1 } from "@dtm/schema/snapshot";

export function TaskDetailsDrawer(props: {
  task: TaskV1 | null;
  people: PersonV1[];
  groups?: GroupV1[];
  statusLabels?: Record<string, string>;
  onClose: () => void;
}) {
  const t = props.task;
  if (!t) return null;

  const owner = props.people.find((p) => p.id === t.ownerId);
  const group = props.groups?.find((g) => g.id === t.groupId);
  const statusLabel = props.statusLabels?.[t.status] ?? t.status;

  return (
    <div className="drawerBackdrop" onClick={props.onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{t.title}</h2>
          <button onClick={props.onClose}>Close</button>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <span className="badge">ID: {t.id}</span>
            <span className="badge">Status: {statusLabel}</span>
            <span className="badge">Owner: {owner ? owner.name : "Unassigned"}</span>
            {group ? <span className="badge">Group: {group.name}</span> : null}
          </div>
        </div>

        <div style={{ marginTop: 12 }} className="card">
          <div><strong>Dates</strong></div>
          <div className="muted" style={{ marginTop: 6 }}>
            Start: {t.start ?? "—"}<br />
            End: {t.end ?? "—"}
          </div>
        </div>

        {t.tags?.length ? (
          <div style={{ marginTop: 12 }} className="card">
            <div><strong>Tags</strong></div>
            <div className="row" style={{ flexWrap: "wrap", marginTop: 8 }}>
              {t.tags.map((tag) => <span key={tag} className="badge">{tag}</span>)}
            </div>
          </div>
        ) : null}

        {t.notes ? (
          <div style={{ marginTop: 12 }} className="card">
            <div><strong>Notes</strong></div>
            <div className="muted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{t.notes}</div>
          </div>
        ) : null}

        {t.links?.sheetRowUrl ? (
          <div style={{ marginTop: 12 }} className="card">
            <div><strong>Links</strong></div>
            <div style={{ marginTop: 8 }}>
              <a href={t.links.sheetRowUrl} target="_blank" rel="noreferrer">Open sheet row</a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
