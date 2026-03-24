import React from "react";

import type { InspectorActivation, InspectorAdapter, InspectorState } from "../contracts/types";
import { createInitialInspectorState } from "../model/createInitialState";

type InspectorContextValue = {
  activation: InspectorActivation;
  adapter: InspectorAdapter;
  state: InspectorState;
  setHoveredTargetId: (targetId: string | null) => void;
  setSelectedTargetId: (targetId: string | null) => void;
  setPanelOpen: (open: boolean) => void;
};

const InspectorContext = React.createContext<InspectorContextValue | null>(null);

const DISABLED_ACTIVATION: InspectorActivation = {
  enabled: false,
  source: "disabled",
};

const DISABLED_ADAPTER: InspectorAdapter = {
  isEnabled() {
    return false;
  },
  resolveTargetFromElement() {
    return null;
  },
  getTargetById() {
    return null;
  },
  getParentTarget() {
    return null;
  },
  getChildTargets() {
    return [];
  },
  openTargetInWorkbench() {
    // foundation no-op
  },
};

export function InspectorProvider(props: {
  activation?: InspectorActivation;
  adapter?: InspectorAdapter;
  children: React.ReactNode;
}) {
  const activation = props.activation ?? DISABLED_ACTIVATION;
  const adapter = props.adapter ?? DISABLED_ADAPTER;
  const [state, setState] = React.useState<InspectorState>(() => createInitialInspectorState(activation));

  React.useEffect(() => {
    setState((prev) => ({
      ...prev,
      enabled: activation.enabled && adapter.isEnabled(),
      debug: activation.debug ?? false,
    }));
  }, [activation, adapter]);

  const value = React.useMemo<InspectorContextValue>(
    () => ({
      activation,
      adapter,
      state,
      setHoveredTargetId: (targetId) => {
        setState((prev) => (prev.hoveredTargetId === targetId ? prev : { ...prev, hoveredTargetId: targetId }));
      },
      setSelectedTargetId: (targetId) => {
        setState((prev) => (prev.selectedTargetId === targetId ? prev : { ...prev, selectedTargetId: targetId }));
      },
      setPanelOpen: (open) => {
        setState((prev) => (prev.panelOpen === open ? prev : { ...prev, panelOpen: open }));
      },
    }),
    [activation, adapter, state]
  );

  return <InspectorContext.Provider value={value}>{props.children}</InspectorContext.Provider>;
}

export function useInspectorContext(): InspectorContextValue {
  const ctx = React.useContext(InspectorContext);
  if (!ctx) {
    throw new Error("Inspector components must be used inside InspectorProvider");
  }
  return ctx;
}
