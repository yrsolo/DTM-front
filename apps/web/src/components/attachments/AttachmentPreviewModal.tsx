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

export function AttachmentPreviewModal(props: { state: AttachmentPreviewState }) {
  if (!props.state.open) return null;

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
            <img className="attachmentPreviewImage" src={props.state.src} alt={props.state.title} />
          ) : null}
          {props.state.mode === "docx" && props.state.html ? (
            <div
              className="attachmentPreviewDocx"
              dangerouslySetInnerHTML={{ __html: props.state.html }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
