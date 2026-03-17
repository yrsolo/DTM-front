import React from "react";
import { TaskAttachmentV1, TaskV1 } from "@dtm/schema/snapshot";

import {
  deleteTaskAttachment,
  requestTaskAttachmentUpload,
  uploadTaskAttachmentBinary,
  finalizeTaskAttachmentUpload,
  pollAttachmentJob,
  fetchAttachmentArrayBuffer,
  getBrowserAttachmentUrl,
  TaskAttachmentUploadError,
} from "../../data/taskAttachments";
import { getUiText } from "../../i18n/uiText";
import { formatBytes } from "../../utils/formatBytes";
import {
  attachmentIconLabel,
  attachmentToneClass,
  attachmentTypeLabel,
  formatAttachmentUploadedAt,
  inferUploadMimeType,
  isDocxAttachment,
  isImageAttachment,
  isLegacyWordAttachment,
  isPdfAttachment,
} from "../../utils/attachments";
import { LayoutContext } from "../Layout";
import { Tooltip, TooltipState } from "../Tooltip";
import { AttachmentPreviewModal, AttachmentPreviewState } from "./AttachmentPreviewModal";

type UploadState =
  | { status: "idle" }
  | { status: "requesting" | "uploading" | "finalizing" | "waiting"; message: string }
  | { status: "error"; message: string };

function AttachmentActionIcon(props: { kind: "preview" | "download" | "delete" }) {
  if (props.kind === "preview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="attachmentActionIconSvg">
        <path
          d="M2.5 12s3.8-6.5 9.5-6.5S21.5 12 21.5 12s-3.8 6.5-9.5 6.5S2.5 12 2.5 12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (props.kind === "download") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="attachmentActionIconSvg">
        <path
          d="M12 4.5v9.5m0 0 3.6-3.6M12 14l-3.6-3.6M5 18.5h14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="attachmentActionIconSvg">
      <path
        d="M6.5 6.5 17.5 17.5M17.5 6.5l-11 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function openInNewWindow(url: string): boolean {
  if (typeof window === "undefined") return false;
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  return Boolean(popup);
}

function formatUploadError(error: unknown, fallback: string): string {
  if (error instanceof TaskAttachmentUploadError) {
    const parts = [
      `step=${error.stage}`,
      error.status !== null ? `status=${error.status}` : null,
      error.host ? `host=${error.host}` : null,
      error.method ? `method=${error.method}` : null,
      error.details ? `details=${error.details}` : null,
    ].filter(Boolean);
    return parts.join(" | ");
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function TaskAttachmentsSection(props: {
  task: TaskV1;
  compact?: boolean;
  dragActive?: boolean;
  droppedFile?: File | null;
  onDroppedFileHandled?: () => void;
}) {
  const ctx = React.useContext(LayoutContext);
  const ui = ctx?.ui ?? getUiText("ru");
  const locale = ctx?.locale ?? "ru";
  const authState = ctx?.authSession.state;
  const canUpload = authState?.authenticated && authState.accessMode === "full" && authState.user?.role === "admin";
  const attachments = props.task.attachments ?? [];
  const shouldRender = attachments.length > 0 || Boolean(canUpload);

  const [expanded, setExpanded] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [uploadState, setUploadState] = React.useState<UploadState>({ status: "idle" });
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [tooltipState, setTooltipState] = React.useState<TooltipState>({ visible: false });
  const [previewState, setPreviewState] = React.useState<AttachmentPreviewState>({ open: false });
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function refetchUntilAttachmentVisible(expectedAttachmentId: string): Promise<boolean> {
    if (!ctx?.snapshotState.syncFromApi) return false;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await ctx.snapshotState.syncFromApi();
      const currentTask = ctx.snapshotState.snapshot?.tasks.find((task) => task.id === props.task.id);
      if (currentTask?.attachments?.some((attachment) => attachment.id === expectedAttachmentId)) {
        return true;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
    return false;
  }

  async function refetchUntilAttachmentMissing(expectedAttachmentId: string): Promise<boolean> {
    if (!ctx?.snapshotState.syncFromApi) return false;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await ctx.snapshotState.syncFromApi();
      const currentTask = ctx.snapshotState.snapshot?.tasks.find((task) => task.id === props.task.id);
      if (!currentTask?.attachments?.some((attachment) => attachment.id === expectedAttachmentId)) {
        return true;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
    return false;
  }

  React.useEffect(() => {
    setExpanded(false);
    setSelectedId(null);
    setUploadState({ status: "idle" });
    setActionError(null);
    setPreviewState({ open: false });
    setTooltipState({ visible: false });
  }, [props.task.id]);

  React.useEffect(() => {
    if (!props.droppedFile || !canUpload) return;
    setExpanded(true);
    void processAttachmentFile(props.droppedFile);
    props.onDroppedFileHandled?.();
  }, [props.droppedFile, canUpload]);

  const selectedAttachment = React.useMemo(
    () => attachments.find((attachment) => attachment.id === selectedId) ?? attachments[0] ?? null,
    [attachments, selectedId]
  );

  if (!shouldRender) return null;

  async function handlePreview(attachment: TaskAttachmentV1) {
    setActionError(null);
    const viewUrl = attachment.links?.view?.trim();
    if (!viewUrl) {
      setActionError(ui.drawer.attachmentsUnavailable);
      return;
    }

    const browserViewUrl = getBrowserAttachmentUrl(viewUrl);
    const browserDownloadUrl = attachment.links?.download ? getBrowserAttachmentUrl(attachment.links.download) : null;
    const lowerViewUrl = browserViewUrl.toLowerCase();
    const lowerDownloadUrl = browserDownloadUrl?.toLowerCase() ?? "";
    const isPdfByUrl =
      lowerViewUrl.includes(".pdf") ||
      lowerDownloadUrl.includes(".pdf") ||
      lowerViewUrl.includes("application/pdf") ||
      lowerDownloadUrl.includes("application/pdf");
    const subtitleParts = [
      attachmentTypeLabel(attachment),
      formatBytes(attachment.sizeBytes),
      formatAttachmentUploadedAt(attachment.uploadedAt ?? null, locale),
    ].filter(Boolean);
    const subtitle = subtitleParts.join(" | ");

    if (isDocxAttachment(attachment)) {
      setPreviewState({
        open: true,
        title: attachment.name,
        subtitle,
        mode: "loading",
        closeLabel: ui.drawer.close,
        downloadLabel: ui.drawer.attachmentsDownload,
        unavailableLabel: ui.drawer.attachmentsUnavailable,
        downloadUrl: browserDownloadUrl,
        onClose: () => setPreviewState({ open: false }),
      });

      try {
        const arrayBuffer = await fetchAttachmentArrayBuffer(browserViewUrl);
        const mammoth = await import("mammoth/mammoth.browser");
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewState({
          open: true,
          title: attachment.name,
          subtitle,
          mode: "docx",
          html: result.value,
          closeLabel: ui.drawer.close,
          downloadLabel: ui.drawer.attachmentsDownload,
          unavailableLabel: ui.drawer.attachmentsUnavailable,
          downloadUrl: browserDownloadUrl,
          onClose: () => setPreviewState({ open: false }),
        });
      } catch {
        setPreviewState({
          open: true,
          title: attachment.name,
          subtitle,
          mode: "error",
          error: ui.drawer.attachmentsPreviewFailed,
          closeLabel: ui.drawer.close,
          downloadLabel: ui.drawer.attachmentsDownload,
          unavailableLabel: ui.drawer.attachmentsUnavailable,
          downloadUrl: browserDownloadUrl,
          onClose: () => setPreviewState({ open: false }),
        });
      }
      return;
    }

    if (isImageAttachment(attachment)) {
      setPreviewState({
        open: true,
        title: attachment.name,
        subtitle,
        mode: "image",
        src: browserViewUrl,
        closeLabel: ui.drawer.close,
        downloadLabel: ui.drawer.attachmentsDownload,
        unavailableLabel: ui.drawer.attachmentsUnavailable,
        downloadUrl: browserDownloadUrl,
        onClose: () => setPreviewState({ open: false }),
      });
      return;
    }

    if (isPdfAttachment(attachment) || isPdfByUrl) {
      setPreviewState({
        open: true,
        title: attachment.name,
        subtitle,
        mode: "pdf",
        src: browserViewUrl,
        closeLabel: ui.drawer.close,
        downloadLabel: ui.drawer.attachmentsDownload,
        unavailableLabel: ui.drawer.attachmentsUnavailable,
        downloadUrl: browserDownloadUrl,
        onClose: () => setPreviewState({ open: false }),
      });
      return;
    }

    if (isLegacyWordAttachment(attachment)) {
      setPreviewState({
        open: true,
        title: attachment.name,
        subtitle,
        mode: "frame",
        src: browserViewUrl,
        closeLabel: ui.drawer.close,
        downloadLabel: ui.drawer.attachmentsDownload,
        unavailableLabel: ui.drawer.attachmentsUnavailable,
        downloadUrl: browserDownloadUrl,
        onClose: () => setPreviewState({ open: false }),
      });
      return;
    }

    // Try to resolve unknown attachments as PDF by inspecting headers.
    try {
      setPreviewState({
        open: true,
        title: attachment.name,
        subtitle,
        mode: "loading",
        closeLabel: ui.drawer.close,
        downloadLabel: ui.drawer.attachmentsDownload,
        unavailableLabel: ui.drawer.attachmentsUnavailable,
        downloadUrl: browserDownloadUrl,
        onClose: () => setPreviewState({ open: false }),
      });
      const res = await fetch(browserViewUrl, {
        method: "HEAD",
        credentials: "include",
        redirect: "follow",
        cache: "no-store",
      });
      const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType.includes("application/pdf")) {
        setPreviewState({
          open: true,
          title: attachment.name,
          subtitle,
          mode: "pdf",
          src: browserViewUrl,
          closeLabel: ui.drawer.close,
          downloadLabel: ui.drawer.attachmentsDownload,
          unavailableLabel: ui.drawer.attachmentsUnavailable,
          downloadUrl: browserDownloadUrl,
          onClose: () => setPreviewState({ open: false }),
        });
        return;
      }
    } catch {
      // fall through to browser handling
    }

    setPreviewState({
      open: true,
      title: attachment.name,
      subtitle,
      mode: "pdf",
      src: browserViewUrl,
      closeLabel: ui.drawer.close,
      downloadLabel: ui.drawer.attachmentsDownload,
      unavailableLabel: ui.drawer.attachmentsUnavailable,
      downloadUrl: browserDownloadUrl,
      onClose: () => setPreviewState({ open: false }),
    });
  }

  function handleDownload(attachment: TaskAttachmentV1) {
    setActionError(null);
    const downloadUrl = attachment.links?.download?.trim();
    if (!downloadUrl) {
      setActionError(ui.drawer.attachmentsUnavailable);
      return;
    }
    const browserDownloadUrl = getBrowserAttachmentUrl(downloadUrl);
    if (openInNewWindow(browserDownloadUrl)) {
      return;
    }
    if (typeof document === "undefined") return;
    const anchor = document.createElement("a");
    anchor.href = browserDownloadUrl;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function processAttachmentFile(file: File) {
    const userId = authState?.user?.id ?? null;
    if (!file || !userId || !canUpload) return;

    setActionError(null);
    try {
      setUploadState({ status: "requesting", message: ui.drawer.attachmentsUploading });
      const contract = await requestTaskAttachmentUpload({
        taskId: props.task.id,
        filename: file.name,
        mime: inferUploadMimeType(file),
        size: file.size,
        uploadedBy: userId,
      });

      setUploadState({ status: "uploading", message: ui.drawer.attachmentsUploadingBinary });
      await uploadTaskAttachmentBinary(contract, file);

      setUploadState({ status: "finalizing", message: ui.drawer.attachmentsFinalize });
      const finalize = await finalizeTaskAttachmentUpload({
        taskId: props.task.id,
        attachmentId: contract.attachment_id,
        uploadedBy: userId,
      });

      setUploadState({ status: "waiting", message: ui.drawer.attachmentsWaiting });
      await pollAttachmentJob(finalize.jobId);
      const published = await refetchUntilAttachmentVisible(contract.attachment_id);
      setUploadState(published ? { status: "idle" } : { status: "waiting", message: ui.drawer.attachmentsWaiting });
    } catch (error) {
      setUploadState({
        status: "error",
        message: formatUploadError(error, ui.drawer.attachmentsActionFailed),
      });
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void processAttachmentFile(file);
  }

  async function handleDelete(attachment: TaskAttachmentV1) {
    const userId = authState?.user?.id ?? null;
    if (!canUpload || !userId) return;

    setActionError(null);
    try {
      setUploadState({ status: "waiting", message: ui.drawer.attachmentsDeleting });
      const deletion = await deleteTaskAttachment({
        taskId: props.task.id,
        attachmentId: attachment.id,
        deletedBy: userId,
      });
      await pollAttachmentJob(deletion.jobId);
      const removed = await refetchUntilAttachmentMissing(attachment.id);
      setUploadState(removed ? { status: "idle" } : { status: "waiting", message: ui.drawer.attachmentsDeleting });
      if (removed) {
        setSelectedId(null);
      }
    } catch (error) {
      setUploadState({
        status: "error",
        message: formatUploadError(error, ui.drawer.attachmentsActionFailed),
      });
    }
  }

  return (
    <>
      <div
        className={`card drawerSection ${props.dragActive ? "attachmentDropZoneActive" : ""}`}
      >
        <button
          type="button"
          className={`attachmentPanelToggle ${expanded ? "isOpen" : ""}`}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="drawerSectionTitle">{ui.drawer.attachments}</span>
          <span className="attachmentPanelToggleMeta">
            <span className="badge attachmentCountBadge">{attachments.length}</span>
            <span className="attachmentPanelChevron">{expanded ? "-" : "+"}</span>
          </span>
        </button>

        {expanded ? (
          <div className="attachmentPanelBody">
            {canUpload ? (
              <div className={`attachmentUploadRow ${props.compact ? "isCompact" : ""}`}>
                <input
                  ref={inputRef}
                  type="file"
                  className="attachmentFileInput"
                  accept=".doc,.docx,.pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFilePicked}
                />
                <button type="button" className="miniAppButton attachmentUploadButton" onClick={() => inputRef.current?.click()}>
                  {ui.drawer.attachmentsUpload}
                </button>
              </div>
            ) : null}

            {uploadState.status !== "idle" ? (
              <div className={`attachmentInlineNotice ${uploadState.status === "error" ? "isError" : ""}`}>
                {uploadState.message}
              </div>
            ) : null}

            {attachments.length ? (
              <>
                <div className={`attachmentIconGrid ${props.compact ? "isCompact" : ""}`}>
                  {attachments.map((attachment) => {
                    const uploadedAt = formatAttachmentUploadedAt(attachment.uploadedAt ?? null, locale);
                    return (
                      <button
                        key={attachment.id}
                        type="button"
                        className={`attachmentIconTile ${attachmentToneClass(attachment)} ${selectedAttachment?.id === attachment.id ? "isActive" : ""}`}
                        onClick={() => {
                          if (selectedAttachment?.id === attachment.id) {
                            void handlePreview(attachment);
                            return;
                          }
                          setSelectedId(attachment.id);
                        }}
                        onDoubleClick={() => {
                          void handlePreview(attachment);
                        }}
                        onMouseEnter={(event) =>
                          setTooltipState({
                            visible: true,
                            x: event.clientX,
                            y: event.clientY,
                            content: (
                              <div className="attachmentTooltipContent">
                                <div className="attachmentTooltipTitle">{attachment.name}</div>
                                {uploadedAt ? (
                                  <div className="attachmentTooltipMeta">
                                    {ui.drawer.attachmentsUploadedAt}: {uploadedAt}
                                  </div>
                                ) : null}
                              </div>
                            ),
                          })
                        }
                        onMouseMove={(event) =>
                          setTooltipState((prev) =>
                            prev.visible ? { ...prev, x: event.clientX, y: event.clientY } : prev
                          )
                        }
                        onMouseLeave={() => setTooltipState({ visible: false })}
                      >
                        <span className="attachmentIconGlyph">{attachmentIconLabel(attachment)}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedAttachment ? (
                  <div className={`attachmentInspector ${props.compact ? "isCompact" : ""}`}>
                    <div className="attachmentInspectorMeta">
                      <button
                        type="button"
                        className="attachmentInspectorTitleButton"
                        title={selectedAttachment.name}
                        onClick={() => {
                          void handlePreview(selectedAttachment);
                        }}
                      >
                        {selectedAttachment.name}
                      </button>
                      <div className="attachmentInspectorSubline">
                        {[
                          attachmentTypeLabel(selectedAttachment),
                          formatBytes(selectedAttachment.sizeBytes),
                          formatAttachmentUploadedAt(selectedAttachment.uploadedAt ?? null, locale),
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </div>
                    </div>
                    <div className="attachmentInspectorActions">
                      <button
                        type="button"
                        className="miniAppButton miniAppButtonGhost attachmentActionIconButton isPreview"
                        onClick={() => {
                          void handlePreview(selectedAttachment);
                        }}
                        disabled={!selectedAttachment.links?.view}
                        title={selectedAttachment.links?.view ? ui.drawer.attachmentsPreview : ui.drawer.attachmentsUnavailable}
                        aria-label={selectedAttachment.links?.view ? ui.drawer.attachmentsPreview : ui.drawer.attachmentsUnavailable}
                      >
                        <AttachmentActionIcon kind="preview" />
                      </button>
                      <button
                        type="button"
                        className="miniAppButton miniAppButtonGhost attachmentActionIconButton isDownload"
                        onClick={() => handleDownload(selectedAttachment)}
                        disabled={!selectedAttachment.links?.download}
                        title={selectedAttachment.links?.download ? ui.drawer.attachmentsDownload : ui.drawer.attachmentsUnavailable}
                        aria-label={selectedAttachment.links?.download ? ui.drawer.attachmentsDownload : ui.drawer.attachmentsUnavailable}
                      >
                        <AttachmentActionIcon kind="download" />
                      </button>
                      {canUpload ? (
                        <button
                          type="button"
                          className="miniAppButton miniAppButtonGhost attachmentActionIconButton isDelete"
                          onClick={() => {
                            void handleDelete(selectedAttachment);
                          }}
                          title={ui.drawer.attachmentsDelete}
                          aria-label={ui.drawer.attachmentsDelete}
                        >
                          <AttachmentActionIcon kind="delete" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="muted attachmentEmptyState">{ui.drawer.attachmentsEmpty}</div>
            )}

            {actionError ? <div className="attachmentInlineNotice isError">{actionError}</div> : null}
          </div>
        ) : null}
      </div>

      <Tooltip state={tooltipState} />
      <AttachmentPreviewModal state={previewState} />
    </>
  );
}
