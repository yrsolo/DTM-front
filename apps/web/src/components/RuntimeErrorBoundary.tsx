import React from "react";

type State = {
  hasError: boolean;
  errorText: string;
};

export class RuntimeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = {
    hasError: false,
    errorText: "",
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorText: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    // Keep console output for debugging in dev/prod.
    // eslint-disable-next-line no-console
    console.error("[runtime-error-boundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", padding: 16 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Ошибка интерфейса</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Произошла runtime-ошибка. Обнови страницу. Если повторяется, пришли этот текст.
            </p>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#ffb8c8",
              }}
            >
              {this.state.errorText || "unknown error"}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

