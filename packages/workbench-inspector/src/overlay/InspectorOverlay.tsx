import React from "react";

import { useInspectorContext } from "../runtime/InspectorContext";

export function InspectorOverlay() {
  const { state } = useInspectorContext();

  if (!state.enabled) return null;

  return (
    <div
      aria-hidden="true"
      data-workbench-inspector-overlay="foundation"
      style={{ display: "none" }}
    />
  );
}
