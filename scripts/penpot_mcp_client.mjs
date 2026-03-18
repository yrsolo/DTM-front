import fs from "node:fs";
import path from "node:path";

import { getPenpotConfig } from "./penpot_config.mjs";

export class PenpotMcpError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "PenpotMcpError";
    this.code = options.code ?? null;
    this.cause = options.cause;
    this.payload = options.payload ?? null;
    this.status = options.status ?? null;
  }
}

function createAbortSignal(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
    },
  };
}

function parseSsePayload(raw) {
  const text = raw?.trim();
  if (!text) {
    throw new PenpotMcpError("Empty event-stream response from Penpot MCP server");
  }

  const events = [];
  const chunks = text.split(/\r?\n\r?\n/);
  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/);
    const dataLines = [];
    let eventName = "message";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim() || "message";
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length === 0) continue;
    const data = dataLines.join("\n");
    try {
      events.push({
        event: eventName,
        data: JSON.parse(data),
      });
    } catch (error) {
      throw new PenpotMcpError("Failed to parse JSON from Penpot MCP event-stream", {
        cause: error,
        payload: data,
      });
    }
  }

  if (events.length === 0) {
    throw new PenpotMcpError("No MCP messages found in Penpot event-stream response", {
      payload: text,
    });
  }

  return events;
}

function parseJsonContent(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function extractContentText(result) {
  if (!result || typeof result !== "object") return null;
  if (!Array.isArray(result.content)) return null;
  const texts = result.content
    .filter((item) => item && item.type === "text" && typeof item.text === "string")
    .map((item) => item.text);
  return texts.length > 0 ? texts.join("\n") : null;
}

export function unwrapToolResult(result) {
  const text = extractContentText(result);
  if (text == null) return result;
  return parseJsonContent(text);
}

export function createPenpotMcpClient(options = {}) {
  return new PenpotMcpClient(options);
}

export class PenpotMcpClient {
  constructor(options = {}) {
    const config = { ...getPenpotConfig(), ...options };
    this.url = config.url;
    this.timeoutMs = config.timeoutMs;
    this.clientName = config.clientName;
    this.clientVersion = config.clientVersion;
    this.protocolVersion = config.protocolVersion;
    this.sessionId = null;
    this._requestId = 1;
    this._initialized = false;
  }

  async initialize() {
    if (this._initialized && this.sessionId) {
      return { sessionId: this.sessionId };
    }

    const response = await this._request("initialize", {
      protocolVersion: this.protocolVersion,
      capabilities: {},
      clientInfo: {
        name: this.clientName,
        version: this.clientVersion,
      },
    });

    if (!this.sessionId) {
      throw new PenpotMcpError("Penpot MCP server did not provide mcp-session-id during initialize");
    }

    await this._notify("notifications/initialized");
    this._initialized = true;

    return {
      sessionId: this.sessionId,
      serverInfo: response.result?.serverInfo ?? null,
      capabilities: response.result?.capabilities ?? null,
      protocolVersion: response.result?.protocolVersion ?? null,
    };
  }

  async listTools() {
    await this.initialize();
    const response = await this._request("tools/list", {});
    return response.result?.tools ?? [];
  }

  async callTool(name, args = {}) {
    if (!name) {
      throw new PenpotMcpError("Tool name is required");
    }
    await this.initialize();
    const response = await this._request("tools/call", {
      name,
      arguments: args,
    });
    return response.result;
  }

  async executeCode(code) {
    if (!code || !String(code).trim()) {
      throw new PenpotMcpError("executeCode requires non-empty code");
    }
    const result = await this.callTool("execute_code", { code });
    return unwrapToolResult(result);
  }

  async getApiInfo(type, member) {
    if (!type) {
      throw new PenpotMcpError("getApiInfo requires a type");
    }
    const args = member ? { type, member } : { type };
    const result = await this.callTool("penpot_api_info", args);
    return unwrapToolResult(result);
  }

  async exportShape(shapeId, format, filePath, mode) {
    if (!shapeId) {
      throw new PenpotMcpError("exportShape requires shapeId");
    }
    const args = { shapeId };
    if (format) args.format = format;
    if (filePath) args.filePath = filePath;
    if (mode) args.mode = mode;
    const result = await this.callTool("export_shape", args);
    return unwrapToolResult(result);
  }

  async importImage(filePath, x, y, width, height) {
    if (!filePath) {
      throw new PenpotMcpError("importImage requires filePath");
    }
    const args = { filePath: path.resolve(filePath) };
    if (x != null) args.x = x;
    if (y != null) args.y = y;
    if (width != null) args.width = width;
    if (height != null) args.height = height;
    const result = await this.callTool("import_image", args);
    return unwrapToolResult(result);
  }

  async runJsFile(filePath) {
    const absolutePath = path.resolve(filePath);
    const code = fs.readFileSync(absolutePath, "utf8");
    return this.executeCode(code);
  }

  async getSelectionInfo(maxDepth = 2) {
    const safeDepth = Number.isFinite(maxDepth) ? Math.max(0, Math.trunc(maxDepth)) : 2;
    return this.executeCode(`
const selected = [...penpot.selection];
return {
  selectionCount: selected.length,
  shapes: selected.map((shape) => penpotUtils.shapeStructure(shape, ${safeDepth}))
};
`);
  }

  async getPageStructure(maxDepth = 3) {
    const safeDepth = Number.isFinite(maxDepth) ? Math.max(0, Math.trunc(maxDepth)) : 3;
    return this.executeCode(`
const pages = penpotUtils.getPages();
return pages.map((pageInfo) => {
  const page = penpotUtils.getPageById(pageInfo.id);
  return {
    id: pageInfo.id,
    name: pageInfo.name,
    structure: page ? penpotUtils.shapeStructure(page.root, ${safeDepth}) : null
  };
});
`);
  }

  async findShapesByName(name, options = {}) {
    if (!name || !String(name).trim()) {
      throw new PenpotMcpError("findShapesByName requires a non-empty name");
    }
    const mode = options.exact ? "exact" : "includes";
    const limit = Number.isFinite(options.limit) ? Math.max(1, Math.trunc(options.limit)) : 20;
    return this.executeCode(`
const needle = ${JSON.stringify(String(name))};
const mode = ${JSON.stringify(mode)};
const limit = ${limit};
const matches = penpotUtils
  .findShapes((shape) => {
    if (typeof shape.name !== "string") return false;
    return mode === "exact" ? shape.name === needle : shape.name.includes(needle);
  })
  .slice(0, limit)
  .map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type,
    parentId: shape.parent?.id ?? null,
    pageId: shape.page?.id ?? null
  }));
return { needle, mode, limit, matches };
`);
  }

  async _notify(method, params) {
    await this._send({
      jsonrpc: "2.0",
      method,
      ...(params == null ? {} : { params }),
    }, { allowEmptyTextResponse: true });
  }

  async _request(method, params) {
    const id = this._requestId++;
    const response = await this._send({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });
    if (response.id !== id) {
      throw new PenpotMcpError(`Unexpected MCP response id: expected ${id}, got ${response.id}`);
    }
    if (response.error) {
      throw new PenpotMcpError(`Penpot MCP error for ${method}: ${response.error.message}`, {
        code: response.error.code,
        payload: response.error,
      });
    }
    return response;
  }

  async _send(payload, options = {}) {
    const { signal, cleanup } = createAbortSignal(this.timeoutMs);
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: this._buildHeaders(),
        body: JSON.stringify(payload),
        signal,
      });

      const contentType = response.headers.get("content-type") || "";
      const sessionId = response.headers.get("mcp-session-id");
      if (sessionId) {
        this.sessionId = sessionId;
      }

      const raw = await response.text();
      if (!response.ok) {
        throw new PenpotMcpError(
          `HTTP ${response.status} from Penpot MCP server`,
          { status: response.status, payload: raw }
        );
      }

      if (contentType.includes("text/event-stream")) {
        const events = parseSsePayload(raw);
        const messageEvent = events.find((event) => event.event === "message") ?? events[0];
        return messageEvent.data;
      }

      if (options.allowEmptyTextResponse && contentType.includes("text/plain") && raw.trim() === "") {
        return {};
      }

      if (contentType.includes("application/json")) {
        try {
          return JSON.parse(raw);
        } catch (error) {
          throw new PenpotMcpError("Failed to parse JSON from Penpot MCP response", {
            cause: error,
            payload: raw,
          });
        }
      }

      throw new PenpotMcpError(`Unsupported Penpot MCP response type: ${contentType || "unknown"}`, {
        payload: raw,
      });
    } catch (error) {
      if (error instanceof PenpotMcpError) throw error;
      if (error?.name === "AbortError") {
        throw new PenpotMcpError(`Timed out after ${this.timeoutMs}ms calling Penpot MCP server`);
      }
      throw new PenpotMcpError("Failed to reach Penpot MCP server", { cause: error });
    } finally {
      cleanup();
    }
  }

  _buildHeaders() {
    const headers = {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    };
    if (this.sessionId) {
      headers["mcp-session-id"] = this.sessionId;
    }
    return headers;
  }
}
