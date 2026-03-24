import React from "react";

import { useInspectorContext } from "../runtime/InspectorContext";

export function InspectorSidebar() {
  const { state } = useInspectorContext();

  if (!state.enabled || !state.panelOpen) return null;

  return (
    <aside
      aria-label="Workbench inspector"
      data-workbench-inspector-sidebar="foundation"
      style={{ display: "none" }}
    />
  );
}
