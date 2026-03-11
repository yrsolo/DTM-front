import { getAuthRuntimeConfig } from "./config";
import { badRequest, json, notFound } from "./http";
import {
  addAllowlistEmailHandler,
  approveUserHandler,
  listAdminData,
  makeAdminHandler,
  rejectUserHandler,
  removeAdminHandler,
  removeAllowlistEmailHandler,
  revokeApprovedUserHandler,
} from "./handlers/adminHandlers";
import { callback, login, logout, me } from "./handlers/authHandlers";
import { proxyApiRequest } from "./handlers/apiProxy";
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
    if (req.method === "POST" && req.routePath === "/logout") {
      return logout();
    }
    if (req.method === "GET" && req.routePath === "/admin/overview") {
      return listAdminData(req);
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
