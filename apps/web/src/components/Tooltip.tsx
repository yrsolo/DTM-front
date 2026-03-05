import React from "react";

export type TooltipState =
  | { visible: false }
  | { visible: true; x: number; y: number; content: React.ReactNode };

export function Tooltip(props: { state: TooltipState }) {
  if (!props.state.visible) return null;
  const { x, y, content } = props.state;
  return (
    <div className="tooltip" style={{ left: x + 8, top: y + 8 }}>
      {content}
    </div>
  );
}
