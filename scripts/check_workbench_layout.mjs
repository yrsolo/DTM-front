import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dtm-workbench-check-"));
const bundlePath = path.join(tempDir, "workbench-layout.mjs");

function pickEnglishTitle(value) {
  const parts = String(value).split(" / ");
  return parts.length > 1 ? parts[1].trim() : String(value).trim();
}

try {
  await build({
    entryPoints: [path.join(repoRoot, "apps/web/src/design/workbenchLayout.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundlePath,
    logLevel: "silent",
  });

  const mod = await import(pathToFileURL(bundlePath).href);
  const layout = mod.WORKBENCH_LAYOUT ?? [];
  const validateWorkbenchLayout = mod.validateWorkbenchLayout;

  const issues = typeof validateWorkbenchLayout === "function" ? validateWorkbenchLayout() : [];
  const docFiles = [
    path.join(repoRoot, "docs/design/WORKBENCH_CONTROLS.md"),
    path.join(repoRoot, "docs/design/WORKBENCH_TAXONOMY.md"),
  ];

  const missingDocs = docFiles.filter((file) => !fs.existsSync(file));
  for (const file of missingDocs) {
    issues.push({ severity: "error", code: "missing-doc", message: `Required workbench doc is missing: ${path.relative(repoRoot, file)}` });
  }

  const canonicalTabs = layout.map((section) => pickEnglishTitle(section.title));
  for (const file of docFiles.filter((candidate) => fs.existsSync(candidate))) {
    const text = fs.readFileSync(file, "utf8");
    for (const tab of canonicalTabs) {
      if (!text.includes(`\`${tab}\``)) {
        issues.push({
          severity: "error",
          code: "missing-tab-doc",
          message: `${path.relative(repoRoot, file)} does not mention canonical tab \`${tab}\`.`,
        });
      }
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      const level = issue.severity === "error" ? "ERROR" : "WARN";
      console.error(`[${level}] ${issue.code}: ${issue.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Workbench layout OK. Tabs: ${canonicalTabs.join(", ")}`);
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
