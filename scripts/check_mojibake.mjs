#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INCLUDE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".scss",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".html",
]);
const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".vite",
  "coverage",
]);

const BAD_PATTERNS = [
  /Ð/g,
  /Ñ/g,
  /\uFFFD/g, // replacement char �
];

const findings = [];

function shouldScan(filePath) {
  return INCLUDE_EXT.has(path.extname(filePath).toLowerCase());
}

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(fullPath);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!shouldScan(fullPath)) continue;
    scanFile(fullPath);
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (BAD_PATTERNS.some((re) => re.test(line))) {
      findings.push({
        file: path.relative(ROOT, filePath),
        line: i + 1,
        text: line.trim().slice(0, 160),
      });
    }
  }
}

walk(ROOT);

if (findings.length > 0) {
  console.error("Mojibake check failed. Suspicious lines found:");
  for (const item of findings) {
    console.error(`- ${item.file}:${item.line} ${item.text}`);
  }
  process.exit(1);
}

console.log("Mojibake check passed.");
