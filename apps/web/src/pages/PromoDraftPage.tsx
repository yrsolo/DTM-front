import React from "react";

import { resolvePublicAssetUrl } from "../config/publicPaths";

const EXTERNALIZED_HTML_URL = resolvePublicAssetUrl("promo/penpot-draft/land.externalized.html");
const STICKY_SLICE_HEIGHT = 108;

function injectFrameStyles(doc: Document) {
  let style = doc.getElementById("promo-draft-frame-overrides") as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement("style");
    style.id = "promo-draft-frame-overrides";
    doc.head.append(style);
  }

  style.textContent = `
    html, body {
      overflow-x: hidden !important;
      overflow-y: hidden !important;
      background: #101013 !important;
      scrollbar-width: none;
    }

    body::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
    }
  `;
}

function measureFrameHeight(iframe: HTMLIFrameElement): number | null {
  const doc = iframe.contentDocument;
  if (!doc) return null;

  injectFrameStyles(doc);

  const body = doc.body;
  const docEl = doc.documentElement;
  const nextHeight = Math.max(
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
    docEl?.scrollHeight ?? 0,
    docEl?.offsetHeight ?? 0
  );

  return nextHeight > 0 ? nextHeight : null;
}

export function PromoDraftPage() {
  const mainFrameRef = React.useRef<HTMLIFrameElement | null>(null);
  const stickyFrameRef = React.useRef<HTMLIFrameElement | null>(null);
  const [frameHeight, setFrameHeight] = React.useState<number>(13056);

  const syncMainFrameHeight = React.useCallback(() => {
    const iframe = mainFrameRef.current;
    if (!iframe) return;
    const nextHeight = measureFrameHeight(iframe);
    if (nextHeight) {
      setFrameHeight(nextHeight);
    }
  }, []);

  const handleMainFrameLoad = React.useCallback(() => {
    syncMainFrameHeight();

    const iframe = mainFrameRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    const observedRoot = doc.documentElement;
    if (!observedRoot || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      syncMainFrameHeight();
    });
    observer.observe(observedRoot);

    const cleanup = () => observer.disconnect();
    iframe.addEventListener("load", cleanup, { once: true });
  }, [syncMainFrameHeight]);

  const handleStickyFrameLoad = React.useCallback(() => {
    const iframe = stickyFrameRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    injectFrameStyles(doc);
  }, []);

  return (
    <div className="promoDraftIsolatedPage">
      <div className="promoDraftStickyShell" aria-hidden="true">
        <iframe
          ref={stickyFrameRef}
          className="promoDraftStickyFrame"
          src={EXTERNALIZED_HTML_URL}
          title="Penpot promo draft sticky preview"
          scrolling="no"
          onLoad={handleStickyFrameLoad}
          tabIndex={-1}
        />
      </div>

      <div className="promoDraftCard">
        <iframe
          ref={mainFrameRef}
          className="promoDraftFrameEmbed"
          src={EXTERNALIZED_HTML_URL}
          title="Penpot promo draft preview"
          scrolling="no"
          onLoad={handleMainFrameLoad}
          style={{ height: `${frameHeight}px` }}
        />
      </div>
    </div>
  );
}
