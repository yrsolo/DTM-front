import React from "react";
import { createPortal } from "react-dom";

export type AttachmentPreviewState =
  | { open: false }
  | {
      open: true;
      title: string;
      subtitle?: string | null;
      mode: "loading" | "error" | "docx" | "image";
      error?: string | null;
      html?: string;
      src?: string;
      downloadUrl?: string | null;
      closeLabel: string;
      downloadLabel: string;
      unavailableLabel: string;
      onClose: () => void;
    };

function getTouchDistance(event: React.TouchEvent<HTMLDivElement>): number | null {
  if (event.touches.length < 2) return null;
  const [first, second] = [event.touches[0], event.touches[1]];
  const dx = second.clientX - first.clientX;
  const dy = second.clientY - first.clientY;
  return Math.hypot(dx, dy);
}

export function AttachmentPreviewModal(props: { state: AttachmentPreviewState }) {
  const [zoomScale, setZoomScale] = React.useState(1);
  const pinchRef = React.useRef<{ distance: number; scale: number } | null>(null);

  React.useEffect(() => {
    if (!props.state.open) return;
    setZoomScale(1);
    pinchRef.current = null;
  }, [props.state]);

  if (!props.state.open) return null;

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const distance = getTouchDistance(event);
    if (!distance) return;
    pinchRef.current = { distance, scale: zoomScale };
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const pinch = pinchRef.current;
    const distance = getTouchDistance(event);
    if (!pinch || !distance) return;
    event.preventDefault();
    const nextScale = Math.min(2.5, Math.max(0.55, (distance / pinch.distance) * pinch.scale));
    setZoomScale(nextScale);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length >= 2) {
      const distance = getTouchDistance(event);
      if (distance) {
        pinchRef.current = { distance, scale: zoomScale };
      }
      return;
    }
    pinchRef.current = null;
  }

  const modal = (
    <div className="attachmentPreviewBackdrop" onClick={props.state.onClose}>
      <div className="attachmentPreviewModal" onClick={(event) => event.stopPropagation()}>
        <div className="attachmentPreviewHeader">
          <div className="attachmentPreviewHeaderText">
            <div className="attachmentPreviewTitle">{props.state.title}</div>
            {props.state.subtitle ? <div className="attachmentPreviewSubtitle">{props.state.subtitle}</div> : null}
          </div>
          <div className="attachmentPreviewHeaderActions">
            {props.state.downloadUrl ? (
              <a
                className="miniAppButton miniAppButtonGhost"
                href={props.state.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                {props.state.downloadLabel}
              </a>
            ) : (
              <button type="button" className="miniAppButton miniAppButtonGhost" disabled>
                {props.state.unavailableLabel}
              </button>
            )}
            <button type="button" className="miniAppButton" onClick={props.state.onClose}>
              {props.state.closeLabel}
            </button>
          </div>
        </div>

        <div className="attachmentPreviewBody">
          {props.state.mode === "loading" ? <div className="miniAppNotice">Загрузка preview...</div> : null}
          {props.state.mode === "error" ? <div className="miniAppNotice">{props.state.error}</div> : null}
          {props.state.mode === "image" && props.state.src ? (
            <div
              className="attachmentPreviewZoomArea"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <img
                className="attachmentPreviewImage"
                src={props.state.src}
                alt={props.state.title}
                style={{ transform: `scale(${zoomScale})` }}
              />
            </div>
          ) : null}
          {props.state.mode === "docx" && props.state.html ? (
            <div
              className="attachmentPreviewZoomArea"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <div
                className="attachmentPreviewDocx"
                style={{ transform: `scale(${zoomScale})` }}
                dangerouslySetInnerHTML={{ __html: props.state.html }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
