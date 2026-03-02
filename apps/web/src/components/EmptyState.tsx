
export function EmptyState(props: { title: string; description?: string }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      {props.description ? <p className="muted">{props.description}</p> : null}
    </div>
  );
}
