
export function ErrorBanner(props: { error: unknown; onRetry: () => void }) {
  return (
    <div className="card">
      <strong>Error loading data</strong>
      <div className="muted" style={{ marginTop: 6 }}>{String(props.error)}</div>
      <div style={{ marginTop: 10 }}>
        <button onClick={props.onRetry}>Retry</button>
      </div>
    </div>
  );
}
