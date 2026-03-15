import { getAuthRuntimeConfig } from "./config";
import { badRequest, json, notFound } from "./http";
import {
  addAllowlistEmailHandler,
  approveUserHandler,
  listAdminData,
  makeAdminHandler,
  refreshDesignersDirectoryHandler,
  rejectUserHandler,
  removeAdminHandler,
  removeAllowlistEmailHandler,
  revokeApprovedUserHandler,
  saveAdminLayoutOrderHandler,
} from "./handlers/adminHandlers";
import {
  accessLinkUsageHandler,
  activateAccessLinkHandler,
  createAccessLinkHandler,
  listAccessLinksHandler,
  redeemAccessLinkHandler,
  revokeAccessLinkHandler,
  updateAccessLinkHandler,
} from "./handlers/accessLinksHandlers";
import {
  proxyAttachmentAdminRequest,
  proxyAttachmentBinaryUpload,
  proxyAttachmentJobRequest,
  proxyAttachmentReadRequest,
} from "./handlers/attachmentProxy";
import { callback, login, logout, me, telegramSession } from "./handlers/authHandlers";
import { proxyApiRequest } from "./handlers/apiProxy";
import {
  clonePresetHandler,
  createPresetHandler,
  deletePresetHandler,
  exportPresetHandler,
  getPresetHandler,
  importPresetHandler,
  listPresetsHandler,
  setDefaultPresetHandler,
  updatePresetHandler,
} from "./handlers/presetHandlers";
import type { HttpResult, NormalizedRequest } from "./types";

export async function routeRequest(req: NormalizedRequest): Promise<HttpResult> {
  const cfg = getAuthRuntimeConfig();

  if (req.routeKind === "auth") {
    if (req.routePath === "/health") {
      return json(200, {
        ok: true,
        contour: cfg.contour,
        kind: "auth",
      });
    }

    if (req.method === "GET" && req.routePath === "/login") {
      return login(req);
    }
    if (req.method === "GET" && req.routePath === "/callback") {
      return callback(req);
    }
    if (req.method === "GET" && req.routePath === "/me") {
      return me(req);
    }
    if (req.method === "POST" && req.routePath === "/access-links/redeem") {
      return redeemAccessLinkHandler(req);
    }
    if (req.method === "POST" && req.routePath === "/logout") {
      return logout();
    }
    if (req.method === "POST" && req.routePath === "/telegram/session") {
      return telegramSession(req);
    }
    if (req.method === "GET" && req.routePath === "/admin/overview") {
      return listAdminData(req);
    }
    if (req.method === "POST" && req.routePath === "/admin/layout-order") {
      return saveAdminLayoutOrderHandler(req);
    }
    if (req.method === "POST" && req.routePath === "/admin/designers/refresh") {
      return refreshDesignersDirectoryHandler(req);
    }
    if (req.method === "GET" && req.routePath === "/admin/access-links") {
      return listAccessLinksHandler(req);
    }
    if (req.method === "POST" && req.routePath === "/admin/access-links") {
      return createAccessLinkHandler(req);
    }
    if (req.method === "POST" && req.routePath === "/attachments/request-upload") {
      return proxyAttachmentAdminRequest(req, "request-upload");
    }
    if (req.method === "POST" && req.routePath === "/attachments/upload-binary") {
      return proxyAttachmentBinaryUpload(req);
    }
    if (req.method === "POST" && req.routePath === "/attachments/finalize") {
      return proxyAttachmentAdminRequest(req, "finalize");
    }
    if (req.method === "POST" && req.routePath === "/attachments/delete") {
      return proxyAttachmentAdminRequest(req, "delete");
    }
    const attachmentJobMatch = req.routePath.match(/^\/attachments\/jobs\/([^/]+)$/);
    if (req.method === "GET" && attachmentJobMatch) {
      return proxyAttachmentJobRequest(req, attachmentJobMatch[1]);
    }
    if (req.method === "GET" && req.routePath === "/presets") {
      return listPresetsHandler(req);
    }
    if (req.method === "POST" && req.routePath === "/presets") {
      return createPresetHandler(req);
    }
    if (req.method === "POST" && req.routePath === "/presets/import") {
      return importPresetHandler(req);
    }
    if (req.method === "POST" && req.routePath === "/admin/allowlist") {
      return addAllowlistEmailHandler(req);
    }
    if (req.method === "DELETE" && req.routePath === "/admin/allowlist") {
      return removeAllowlistEmailHandler(req);
    }

    const approveMatch = req.routePath.match(/^\/admin\/users\/([^/]+)\/approve$/);
    if (req.method === "POST" && approveMatch) {
      return approveUserHandler(req, approveMatch[1]);
    }

    const rejectMatch = req.routePath.match(/^\/admin\/users\/([^/]+)\/reject$/);
    if (req.method === "POST" && rejectMatch) {
      return rejectUserHandler(req, rejectMatch[1]);
    }

    const revokeMatch = req.routePath.match(/^\/admin\/users\/([^/]+)\/revoke$/);
    if (req.method === "POST" && revokeMatch) {
      return revokeApprovedUserHandler(req, revokeMatch[1]);
    }

    const makeAdminMatch = req.routePath.match(/^\/admin\/users\/([^/]+)\/make-admin$/);
    if (req.method === "POST" && makeAdminMatch) {
      return makeAdminHandler(req, makeAdminMatch[1]);
    }

    const removeAdminMatch = req.routePath.match(/^\/admin\/users\/([^/]+)\/remove-admin$/);
    if (req.method === "POST" && removeAdminMatch) {
      return removeAdminHandler(req, removeAdminMatch[1]);
    }

    const accessLinkMatch = req.routePath.match(/^\/admin\/access-links\/([^/]+)$/);
    if (req.method === "PATCH" && accessLinkMatch) {
      return updateAccessLinkHandler(req, accessLinkMatch[1]);
    }

    const accessLinkRevokeMatch = req.routePath.match(/^\/admin\/access-links\/([^/]+)\/revoke$/);
    if (req.method === "POST" && accessLinkRevokeMatch) {
      return revokeAccessLinkHandler(req, accessLinkRevokeMatch[1]);
    }

    const accessLinkActivateMatch = req.routePath.match(/^\/admin\/access-links\/([^/]+)\/activate$/);
    if (req.method === "POST" && accessLinkActivateMatch) {
      return activateAccessLinkHandler(req, accessLinkActivateMatch[1]);
    }

    const accessLinkUsageMatch = req.routePath.match(/^\/admin\/access-links\/([^/]+)\/usage$/);
    if (req.method === "GET" && accessLinkUsageMatch) {
      return accessLinkUsageHandler(req, accessLinkUsageMatch[1]);
    }

    const presetMatch = req.routePath.match(/^\/presets\/([^/]+)$/);
    if (req.method === "GET" && presetMatch) {
      return getPresetHandler(req, presetMatch[1]);
    }
    if (req.method === "PUT" && presetMatch) {
      return updatePresetHandler(req, presetMatch[1]);
    }
    if (req.method === "DELETE" && presetMatch) {
      return deletePresetHandler(req, presetMatch[1]);
    }

    const presetCloneMatch = req.routePath.match(/^\/presets\/([^/]+)\/clone$/);
    if (req.method === "POST" && presetCloneMatch) {
      return clonePresetHandler(req, presetCloneMatch[1]);
    }

    const presetDefaultMatch = req.routePath.match(/^\/presets\/([^/]+)\/set-default$/);
    if (req.method === "POST" && presetDefaultMatch) {
      return setDefaultPresetHandler(req, presetDefaultMatch[1]);
    }

    const presetExportMatch = req.routePath.match(/^\/presets\/([^/]+)\/export$/);
    if (req.method === "GET" && presetExportMatch) {
      return exportPresetHandler(req, presetExportMatch[1]);
    }

    const attachmentReadMatch = req.routePath.match(/^\/attachments\/([^/]+)\/(view|download)$/);
    if (req.method === "GET" && attachmentReadMatch) {
      return proxyAttachmentReadRequest(req, attachmentReadMatch[1], attachmentReadMatch[2] as "view" | "download");
    }

    return notFound(`Unknown auth route: ${req.routePath}`);
  }

  if (req.routeKind === "api") {
    if (req.routePath === "/health") {
      return json(200, {
        ok: true,
        contour: cfg.contour,
        kind: "api",
      });
    }

    return proxyApiRequest(req);
  }

  return notFound();
}
