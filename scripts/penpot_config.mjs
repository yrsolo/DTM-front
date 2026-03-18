const DEFAULT_URL = "http://localhost:4401/mcp";
const DEFAULT_TIMEOUT_MS = 15000;

function parsePositiveInt(value, fallback) {
  if (value == null || value === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getPenpotConfig(env = process.env) {
  return {
    url: env.PENPOT_MCP_URL?.trim() || DEFAULT_URL,
    timeoutMs: parsePositiveInt(env.PENPOT_MCP_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    clientName: env.PENPOT_MCP_CLIENT_NAME?.trim() || "dtm-penpot-cli",
    clientVersion: env.PENPOT_MCP_CLIENT_VERSION?.trim() || "1.0.0",
    protocolVersion: env.PENPOT_MCP_PROTOCOL_VERSION?.trim() || "2025-03-26",
  };
}
