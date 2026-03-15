import React from "react";
import { TaskAttachmentV1, TaskV1 } from "@dtm/schema/snapshot";

import {
  AttachmentUploadContract,
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
  isDocxAttachment,
  isImageAttachment,
} from "../../utils/attachments";
import { LayoutContext } from "../Layout";
import { Tooltip, TooltipState } from "../Tooltip";
import { AttachmentPreviewModal, AttachmentPreviewState } from "./AttachmentPreviewModal";

type UploadState =
  | { status: "idle" }
  | { status: "requesting" | "uploading" | "finalizing" | "waiting" | "ready"; message: string }
  | { status: "error"; message: string };

function formatContractDebug(contract: AttachmentUploadContract): string {
  const method = contract.method?.trim().toUpperCase() || "PUT";
  const headerKeys = Object.keys(contract.headers ?? {}).sort();
  let host = "unknown";
  try {
    host = new URL(contract.uploadUrl).host;
  } catch {
    host = "invalid-url";
  }
  return `uploadHost=${host} | method=${method} | headerKeys=${headerKeys.join(",") || "none"}`;
}

function formatDiagnosticsDebug(contract: AttachmentUploadContract): string[] {
  const diagnostics = contract.diagnostics;
  if (!diagnostics) return [];

  return [
    diagnostics.uploadContractVersion ? `contractVersion=${diagnostics.uploadContractVersion}` : null,
    diagnostics.signedMethod ? `signedMethod=${diagnostics.signedMethod}` : null,
    diagnostics.signedContentType ? `signedContentType=${diagnostics.signedContentType}` : null,
    diagnostics.requiredHeaders?.length ? `requiredHeaders=${diagnostics.requiredHeaders.join(",")}` : null,
    diagnostics.uploadUrlScheme ? `uploadUrlScheme=${diagnostics.uploadUrlScheme}` : null,
    diagnostics.uploadUrlHost ? `uploadUrlHost=${diagnostics.uploadUrlHost}` : null,
    diagnostics.uploadUrlPath ? `uploadUrlPath=${diagnostics.uploadUrlPath}` : null,
    diagnostics.expiresAtUtc ? `expiresAtUtc=${diagnostics.expiresAtUtc}` : null,
    diagnostics.browserMayRequirePreflight !== null && diagnostics.browserMayRequirePreflight !== undefined
      ? `browserMayRequirePreflight=${diagnostics.browserMayRequirePreflight ? "true" : "false"}`
      : null,
    diagnostics.notes?.length ? `notes=${diagnostics.notes.join(" ; ")}` : null,
  ].filter((value): value is string => Boolean(value));
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
  const [uploadDebug, setUploadDebug] = React.useState<string | null>(null);
  const [uploadDiagnostics, setUploadDiagnostics] = React.useState<string[]>([]);
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

  React.useEffect(() => {
    setExpanded(false);
    setSelectedId(null);
    setUploadState({ status: "idle" });
    setActionError(null);
    setUploadDebug(null);
    setUploadDiagnostics([]);
    setPreviewState({ open: false });
    setTooltipState({ visible: false });
  }, [props.task.id]);

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
        downloadUrl: attachment.links?.download ?? null,
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
          downloadUrl: attachment.links?.download ?? null,
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
          downloadUrl: attachment.links?.download ?? null,
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
        downloadUrl: attachment.links?.download ?? null,
        onClose: () => setPreviewState({ open: false }),
      });
      return;
    }

    if (!openInNewWindow(browserViewUrl)) {
      setActionError(ui.drawer.attachmentsActionFailed);
    }
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

  async function handleFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const userId = authState?.user?.id ?? null;
    if (!file || !userId || !canUpload) return;

    setActionError(null);
    setUploadDiagnostics([]);
    try {
      setUploadState({ status: "requesting", message: ui.drawer.attachmentsUploading });
      const contract = await requestTaskAttachmentUpload({
        taskId: props.task.id,
        filename: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        uploadedBy: userId,
      });
      setUploadDebug(formatContractDebug(contract));
      setUploadDiagnostics(formatDiagnosticsDebug(contract));

      setUploadState({ status: "uploading", message: ui.drawer.attachmentsDropHint });
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
      setUploadState(
        published
          ? { status: "ready", message: ui.drawer.attachmentsUploaded }
          : { status: "waiting", message: ui.drawer.attachmentsWaiting }
      );
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

  return (
    <>
      <div className="card drawerSection">
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
                  onChange={handleFilePicked}
                />
                <button type="button" className="miniAppButton" onClick={() => inputRef.current?.click()}>
                  {ui.drawer.attachmentsUpload}
                </button>
              </div>
            ) : null}

            {uploadState.status !== "idle" ? (
              <div className={`attachmentInlineNotice ${uploadState.status === "error" ? "isError" : ""}`}>
                {uploadState.message}
              </div>
            ) : null}

            {uploadDebug ? <div className="attachmentInlineNotice">{uploadDebug}</div> : null}
            {uploadDiagnostics.map((line) => (
              <div key={line} className="attachmentInlineNotice">
                {line}
              </div>
            ))}

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
                        onClick={() => setSelectedId(attachment.id)}
                        onDoubleClick={() => { void handlePreview(attachment); }}
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
                            prev.visible
                              ? { ...prev, x: event.clientX, y: event.clientY }
                              : prev
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
                      <div className="attachmentInspectorTitle">{selectedAttachment.name}</div>
                      <div className="attachmentInspectorSubline">
                        {[attachmentTypeLabel(selectedAttachment), formatBytes(selectedAttachment.sizeBytes), formatAttachmentUploadedAt(selectedAttachment.uploadedAt ?? null, locale)]
                          .filter(Boolean)
                          .join(" | ")}
                      </div>
                    </div>
                    <div className="attachmentInspectorActions">
                      <button
                        type="button"
                        className="miniAppButton miniAppButtonGhost"
                        onClick={() => { void handlePreview(selectedAttachment); }}
                        disabled={!selectedAttachment.links?.view}
                      >
                        {selectedAttachment.links?.view ? ui.drawer.attachmentsPreview : ui.drawer.attachmentsUnavailable}
                      </button>
                      <button
                        type="button"
                        className="miniAppButton miniAppButtonGhost"
                        onClick={() => handleDownload(selectedAttachment)}
                        disabled={!selectedAttachment.links?.download}
                      >
                        {selectedAttachment.links?.download ? ui.drawer.attachmentsDownload : ui.drawer.attachmentsUnavailable}
                      </button>
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
