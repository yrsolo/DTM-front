import React from "react";

export type TooltipState =
  | { visible: false }
  | { visible: true; x: number; y: number; content: React.ReactNode };

export function Tooltip(props: { state: TooltipState; offsetX?: number; offsetY?: number }) {
  const isVisible = props.state.visible;
  const x = isVisible ? props.state.x : 0;
  const y = isVisible ? props.state.y : 0;
  const content = isVisible ? props.state.content : null;
  const offsetX = props.offsetX ?? 8;
  const offsetY = props.offsetY ?? 8;
  const tooltipRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ left: number; top: number }>({
    left: x + offsetX,
    top: y + offsetY,
  });

  React.useLayoutEffect(() => {
    if (!isVisible) return;
    const node = tooltipRef.current;
    if (!node) return;
    const margin = 10;
    const rect = node.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const desiredLeft = x + offsetX;
    const desiredTop = y + offsetY;
    const clampedLeft = Math.max(margin, Math.min(vw - rect.width - margin, desiredLeft));
    const clampedTop = Math.max(margin, Math.min(vh - rect.height - margin, desiredTop));
    setPos({ left: clampedLeft, top: clampedTop });
  }, [isVisible, x, y, offsetX, offsetY, content]);

  if (!isVisible) return null;

  return (
    <div ref={tooltipRef} className="tooltip" style={{ left: pos.left, top: pos.top }}>
      {content}
    </div>
  );
}
