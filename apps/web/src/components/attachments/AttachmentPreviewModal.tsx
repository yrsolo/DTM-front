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

type TouchAnchor =
  | { mode: "pan"; x: number; y: number; translateX: number; translateY: number }
  | { mode: "pinch"; distance: number; centerX: number; centerY: number; scale: number; translateX: number; translateY: number };

function getTouchDistance(event: React.TouchEvent<HTMLDivElement>): number | null {
  if (event.touches.length < 2) return null;
  const [first, second] = [event.touches[0], event.touches[1]];
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function getTouchCenter(event: React.TouchEvent<HTMLDivElement>): { x: number; y: number } | null {
  if (event.touches.length < 2) return null;
  const [first, second] = [event.touches[0], event.touches[1]];
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
}

export function AttachmentPreviewModal(props: { state: AttachmentPreviewState }) {
  const [zoomScale, setZoomScale] = React.useState(1);
  const [translate, setTranslate] = React.useState({ x: 0, y: 0 });
  const touchAnchorRef = React.useRef<TouchAnchor | null>(null);

  React.useEffect(() => {
    if (!props.state.open) return;
    setZoomScale(1);
    setTranslate({ x: 0, y: 0 });
    touchAnchorRef.current = null;
  }, [props.state]);

  if (!props.state.open) return null;

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length >= 2) {
      const distance = getTouchDistance(event);
      const center = getTouchCenter(event);
      if (!distance || !center) return;
      touchAnchorRef.current = {
        mode: "pinch",
        distance,
        centerX: center.x,
        centerY: center.y,
        scale: zoomScale,
        translateX: translate.x,
        translateY: translate.y,
      };
      return;
    }

    if (event.touches.length === 1) {
      touchAnchorRef.current = {
        mode: "pan",
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        translateX: translate.x,
        translateY: translate.y,
      };
    }
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const anchor = touchAnchorRef.current;
    if (!anchor) return;

    if (anchor.mode === "pinch" && event.touches.length >= 2) {
      const distance = getTouchDistance(event);
      const center = getTouchCenter(event);
      if (!distance || !center) return;
      event.preventDefault();
      const nextScale = Math.min(2.5, Math.max(0.55, (distance / anchor.distance) * anchor.scale));
      const nextTranslate = {
        x: anchor.translateX + (center.x - anchor.centerX),
        y: anchor.translateY + (center.y - anchor.centerY),
      };
      setZoomScale(nextScale);
      setTranslate(nextTranslate);
      return;
    }

    if (anchor.mode === "pan" && event.touches.length === 1) {
      event.preventDefault();
      setTranslate({
        x: anchor.translateX + (event.touches[0].clientX - anchor.x),
        y: anchor.translateY + (event.touches[0].clientY - anchor.y),
      });
    }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length >= 2) {
      const distance = getTouchDistance(event);
      const center = getTouchCenter(event);
      if (!distance || !center) return;
      touchAnchorRef.current = {
        mode: "pinch",
        distance,
        centerX: center.x,
        centerY: center.y,
        scale: zoomScale,
        translateX: translate.x,
        translateY: translate.y,
      };
      return;
    }

    if (event.touches.length === 1) {
      touchAnchorRef.current = {
        mode: "pan",
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        translateX: translate.x,
        translateY: translate.y,
      };
      return;
    }

    touchAnchorRef.current = null;
  }

  const previewTransform = `translate(${translate.x}px, ${translate.y}px) scale(${zoomScale})`;

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
                style={{ transform: previewTransform }}
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
                style={{ transform: previewTransform }}
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
