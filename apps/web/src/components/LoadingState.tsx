import React from "react";
import { getUiText } from "../i18n/uiText";
import { LayoutContext } from "./Layout";

export function LoadingState() {
  const ctx = React.useContext(LayoutContext);
  const ui = ctx?.ui ?? getUiText("ru");
  return (
    <div className="card">
      <strong>{ui.common.loadingTitle}</strong>
      <div className="muted">{ui.common.loadingHint}</div>
    </div>
  );
}
