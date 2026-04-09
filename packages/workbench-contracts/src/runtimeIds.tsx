import React from "react";

import { __wbNextScope, __wbNodeId } from "./sourceNodeIds";

const WorkbenchScopeContext = React.createContext<string | null>(null);

export function WorkbenchScopeBoundary(props: {
  scope: string;
  children: React.ReactNode;
}) {
  return <WorkbenchScopeContext.Provider value={props.scope}>{props.children}</WorkbenchScopeContext.Provider>;
}

export function useWorkbenchScope(fallbackScope: string, isolate = false): string {
  if (isolate) return fallbackScope;
  return React.useContext(WorkbenchScopeContext) ?? fallbackScope;
}

export { __wbNextScope, __wbNodeId };
