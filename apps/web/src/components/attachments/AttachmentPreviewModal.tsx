import React from "react";
import { createPortal } from "react-dom";

import { fetchAttachmentArrayBuffer } from "../../data/taskAttachments";

export type AttachmentPreviewState =
  | { open: false }
  | {
      open: true;
      title: string;
      subtitle?: string | null;
      mode: "loading" | "error" | "docx" | "image" | "pdf" | "frame";
      error?: string | null;
      html?: string;
      src?: string;
      downloadUrl?: string | null;
      debugInfo?: string | null;
      closeLabel: string;
      downloadLabel: string;
      unavailableLabel: string;
      onClose: () => void;
    };

type TouchAnchor =
  | {
      mode: "pan";
      x: number;
      y: number;
      translateX: number;
      translateY: number;
    }
  | {
      mode: "pinch";
      distance: number;
      localX: number;
      localY: number;
      scale: number;
      translateX: number;
      translateY: number;
      contentOriginX: number;
      contentOriginY: number;
    };

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
  const [pdfState, setPdfState] = React.useState<{
    status: "idle" | "loading" | "ready" | "error" | "tooLarge";
    message?: string;
    canvases: HTMLCanvasElement[];
  }>({ status: "idle", canvases: [] });
  const touchAnchorRef = React.useRef<TouchAnchor | null>(null);
  const zoomAreaRef = React.useRef<HTMLDivElement | null>(null);
  const zoomContentRef = React.useRef<HTMLDivElement | HTMLImageElement | null>(null);
  const setZoomContentRef = React.useCallback((node: HTMLDivElement | HTMLImageElement | null) => {
    zoomContentRef.current = node;
  }, []);

  React.useEffect(() => {
    if (!props.state.open) return;
    setZoomScale(1);
    setTranslate({ x: 0, y: 0 });
    touchAnchorRef.current = null;
  }, [props.state]);

  React.useEffect(() => {
    if (!props.state.open) {
      setPdfState({ status: "idle", canvases: [] });
      return;
    }

    const state = props.state;
    if (state.mode !== "pdf" || !state.src) {
      setPdfState({ status: "idle", canvases: [] });
      return;
    }

    const src = state.src;
    let isActive = true;
    const abortController = new AbortController();
    setPdfState({ status: "loading", canvases: [] });

    const MAX_PAGES = 40;

    async function renderPdf() {
      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        const workerUrl = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

        if (!src) return;
        const buffer = await fetchAttachmentArrayBuffer(src, abortController.signal);
        if (!isActive) return;

        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        if (!isActive) return;

        if (pdf.numPages > MAX_PAGES) {
          setPdfState({
            status: "tooLarge",
            message: `Файл содержит ${pdf.numPages} страниц. Для стабильной работы используйте скачивание.`,
            canvases: [],
          });
          return;
        }

        const canvases: HTMLCanvasElement[] = [];
        for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
          if (!isActive) return;
          const page = await pdf.getPage(pageIndex);
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          await page.render({ canvasContext: context, viewport }).promise;
          canvases.push(canvas);
          if (isActive) {
            setPdfState({ status: "loading", canvases: [...canvases] });
          }
        }

        if (isActive) {
          setPdfState({ status: "ready", canvases });
        }
      } catch {
        if (isActive) {
          setPdfState({
            status: "error",
            message: "Не удалось открыть PDF. Попробуйте скачать файл.",
            canvases: [],
          });
        }
      }
    }

    void renderPdf();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [props.state]);

  if (!props.state.open) return null;

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const zoomArea = zoomAreaRef.current;
    const zoomContent = zoomContentRef.current;

    if (event.touches.length >= 2 && zoomArea && zoomContent) {
      const distance = getTouchDistance(event);
      const center = getTouchCenter(event);
      if (!distance || !center) return;
      const areaRect = zoomArea.getBoundingClientRect();
      const contentRect = zoomContent.getBoundingClientRect();
      touchAnchorRef.current = {
        mode: "pinch",
        distance,
        localX: center.x - areaRect.left,
        localY: center.y - areaRect.top,
        scale: zoomScale,
        translateX: translate.x,
        translateY: translate.y,
        contentOriginX: contentRect.left - areaRect.left,
        contentOriginY: contentRect.top - areaRect.top,
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
    const zoomArea = zoomAreaRef.current;
    if (!anchor || !zoomArea) return;

    if (anchor.mode === "pinch" && event.touches.length >= 2) {
      const distance = getTouchDistance(event);
      const center = getTouchCenter(event);
      if (!distance || !center) return;
      event.preventDefault();
      const areaRect = zoomArea.getBoundingClientRect();
      const nextScale = Math.min(2.5, Math.max(0.55, (distance / anchor.distance) * anchor.scale));
      const nextLocalX = center.x - areaRect.left;
      const nextLocalY = center.y - areaRect.top;
      const focalContentX = (anchor.localX - anchor.contentOriginX - anchor.translateX) / anchor.scale;
      const focalContentY = (anchor.localY - anchor.contentOriginY - anchor.translateY) / anchor.scale;
      setZoomScale(nextScale);
      setTranslate({
        x: nextLocalX - anchor.contentOriginX - focalContentX * nextScale,
        y: nextLocalY - anchor.contentOriginY - focalContentY * nextScale,
      });
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
    const zoomArea = zoomAreaRef.current;
    const zoomContent = zoomContentRef.current;

    if (event.touches.length >= 2 && zoomArea && zoomContent) {
      const distance = getTouchDistance(event);
      const center = getTouchCenter(event);
      if (!distance || !center) return;
      const areaRect = zoomArea.getBoundingClientRect();
      const contentRect = zoomContent.getBoundingClientRect();
      touchAnchorRef.current = {
        mode: "pinch",
        distance,
        localX: center.x - areaRect.left,
        localY: center.y - areaRect.top,
        scale: zoomScale,
        translateX: translate.x,
        translateY: translate.y,
        contentOriginX: contentRect.left - areaRect.left,
        contentOriginY: contentRect.top - areaRect.top,
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
            {props.state.debugInfo ? (
              <div className="attachmentPreviewSubtitle" style={{ opacity: 0.8, fontSize: 12, lineHeight: 1.35 }}>
                {props.state.debugInfo.split("\n").map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
            ) : null}
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
          {props.state.mode === "loading" ? <div className="miniAppNotice">Загрузка превью...</div> : null}
          {props.state.mode === "error" ? <div className="miniAppNotice">{props.state.error}</div> : null}
          {props.state.mode === "image" && props.state.src ? (
            <div
              ref={zoomAreaRef}
              className="attachmentPreviewZoomArea"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <img
                ref={setZoomContentRef}
                className="attachmentPreviewImage"
                src={props.state.src}
                alt={props.state.title}
                style={{ transform: previewTransform }}
              />
            </div>
          ) : null}
          {props.state.mode === "docx" && props.state.html ? (
            <div
              ref={zoomAreaRef}
              className="attachmentPreviewZoomArea"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <div
                ref={setZoomContentRef}
                className="attachmentPreviewDocx"
                style={{ transform: previewTransform }}
                dangerouslySetInnerHTML={{ __html: props.state.html }}
              />
            </div>
          ) : null}
          {props.state.mode === "pdf" ? (
            <div
              ref={zoomAreaRef}
              className="attachmentPreviewZoomArea"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <div ref={setZoomContentRef} className="attachmentPreviewPdf" style={{ transform: previewTransform }}>
                {pdfState.status === "loading" ? (
                  <div className="attachmentPreviewPdfNotice">Готовим PDF для просмотра...</div>
                ) : null}
                {pdfState.status === "error" ? (
                  <div className="attachmentPreviewPdfNotice">{pdfState.message}</div>
                ) : null}
                {pdfState.status === "tooLarge" ? (
                  <div className="attachmentPreviewPdfNotice">{pdfState.message}</div>
                ) : null}
                {pdfState.canvases.map((canvas, index) => (
                  <div key={index} className="attachmentPreviewPdfPage">
                    <div
                      className="attachmentPreviewPdfCanvas"
                      ref={(node) => {
                        if (node && node.firstChild !== canvas) {
                          node.replaceChildren(canvas);
                        }
                      }}
                    />
                    <div className="attachmentPreviewPdfPageLabel">Страница {index + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {props.state.mode === "frame" && props.state.src ? (
            <iframe className="attachmentPreviewFrame" src={props.state.src} title={props.state.title} />
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
