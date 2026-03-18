#!/usr/bin/env node
import path from "node:path";

import { createPenpotMcpClient, PenpotMcpError } from "./penpot_mcp_client.mjs";

function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.trim();
    if (!key) {
      throw new Error(`Invalid flag: ${arg}`);
    }

    if (inlineValue != null) {
      flags[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (next == null || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    i += 1;
  }

  return {
    command: positionals[0] ?? null,
    subcommand: positionals[1] ?? null,
    rest: positionals.slice(2),
    flags,
  };
}

function usage() {
  return `
Usage:
  node scripts/penpot_cli.mjs tools:list
  node scripts/penpot_cli.mjs execute-code --code "return { ok: true };"
  node scripts/penpot_cli.mjs run-js-file --file ./debug-local/sample.js
  node scripts/penpot_cli.mjs api-info --type Shape [--member resize]
  node scripts/penpot_cli.mjs export-shape --shape-id selection [--format png] [--mode shape] [--file-path out.png]
  node scripts/penpot_cli.mjs import-image --file ./image.png [--x 10 --y 10 --width 300]
  node scripts/penpot_cli.mjs selection-info [--max-depth 2]
  node scripts/penpot_cli.mjs page-structure [--max-depth 3]
  node scripts/penpot_cli.mjs find-shapes --name Header [--exact] [--limit 20]

Config env:
  PENPOT_MCP_URL
  PENPOT_MCP_TIMEOUT_MS
  PENPOT_MCP_CLIENT_NAME
  PENPOT_MCP_CLIENT_VERSION
  PENPOT_MCP_PROTOCOL_VERSION
`.trim();
}

function requireFlag(flags, name) {
  const value = flags[name];
  if (value == null || value === true || String(value).trim() === "") {
    throw new Error(`Missing required flag --${name}`);
  }
  return String(value);
}

function optionalNumber(flags, name) {
  if (flags[name] == null || flags[name] === true) return undefined;
  const parsed = Number(flags[name]);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for --${name}: ${flags[name]}`);
  }
  return parsed;
}

function optionalInt(flags, name, fallback) {
  if (flags[name] == null || flags[name] === true) return fallback;
  const parsed = Number.parseInt(String(flags[name]), 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer value for --${name}: ${flags[name]}`);
  }
  return parsed;
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const client = createPenpotMcpClient();

  let result;
  switch (parsed.command) {
    case "tools:list":
      result = await client.listTools();
      break;
    case "execute-code":
      result = await client.executeCode(requireFlag(parsed.flags, "code"));
      break;
    case "run-js-file":
      result = await client.runJsFile(requireFlag(parsed.flags, "file"));
      break;
    case "api-info":
      result = await client.getApiInfo(requireFlag(parsed.flags, "type"), parsed.flags.member ? String(parsed.flags.member) : undefined);
      break;
    case "export-shape":
      result = await client.exportShape(
        requireFlag(parsed.flags, "shape-id"),
        parsed.flags.format ? String(parsed.flags.format) : undefined,
        parsed.flags["file-path"] ? path.resolve(String(parsed.flags["file-path"])) : undefined,
        parsed.flags.mode ? String(parsed.flags.mode) : undefined
      );
      break;
    case "import-image":
      result = await client.importImage(
        requireFlag(parsed.flags, "file"),
        optionalNumber(parsed.flags, "x"),
        optionalNumber(parsed.flags, "y"),
        optionalNumber(parsed.flags, "width"),
        optionalNumber(parsed.flags, "height")
      );
      break;
    case "selection-info":
      result = await client.getSelectionInfo(optionalInt(parsed.flags, "max-depth", 2));
      break;
    case "page-structure":
      result = await client.getPageStructure(optionalInt(parsed.flags, "max-depth", 3));
      break;
    case "find-shapes":
      result = await client.findShapesByName(requireFlag(parsed.flags, "name"), {
        exact: Boolean(parsed.flags.exact),
        limit: optionalInt(parsed.flags, "limit", 20),
      });
      break;
    case "help":
    case "--help":
    case "-h":
    case null:
      process.stdout.write(`${usage()}\n`);
      return;
    default:
      throw new Error(`Unknown command: ${parsed.command}`);
  }

  printJson(result);
}

try {
  await main();
} catch (error) {
  if (error instanceof PenpotMcpError) {
    console.error(error.message);
    if (error.code != null) console.error(`MCP code: ${error.code}`);
    if (error.status != null) console.error(`HTTP status: ${error.status}`);
    process.exit(1);
  }
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  console.error("");
  console.error(usage());
  process.exit(2);
}
