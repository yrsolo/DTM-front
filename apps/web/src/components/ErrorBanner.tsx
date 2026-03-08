import React from "react";
import { getUiText } from "../i18n/uiText";
import { LayoutContext } from "./Layout";

export function ErrorBanner(props: {
  error: unknown;
  onRetry: () => void;
  title?: string;
  compact?: boolean;
}) {
  const ctx = React.useContext(LayoutContext);
  const ui = ctx?.ui ?? getUiText("ru");

  return (
    <div className={props.compact ? "" : "card"} style={props.compact ? { marginBottom: 10 } : undefined}>
      <strong>{props.title ?? ui.common.errorTitle}</strong>
      <div className="muted" style={{ marginTop: 6 }}>
        {String(props.error)}
      </div>
      <div style={{ marginTop: 10 }}>
        <button onClick={props.onRetry}>{ui.common.retry}</button>
      </div>
    </div>
  );
}
