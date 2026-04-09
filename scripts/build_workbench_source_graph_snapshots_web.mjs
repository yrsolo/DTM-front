import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeSourceFile } from "../packages/workbench-source-analysis/src/analyzeSourceFile.mjs";
import { buildSourceGraphSnapshot } from "../packages/workbench-source-analysis/src/buildSourceGraphSnapshot.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.resolve(repoRoot, "apps/web/src/inspector-integration/workbench-source-surfaces.json");

function loadSurfaceRegistry() {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function buildSnapshot(entryPath, outputPath, snapshotId) {
  const report = analyzeSourceFile(entryPath);
  if (!report) {
    throw new Error(`Failed to analyze source file: ${entryPath}`);
  }

  const snapshot = buildSourceGraphSnapshot({
    snapshotId,
    entry: report.file,
    report,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${outputPath}\n`);
}

function main() {
  const surfaces = loadSurfaceRegistry().filter((surface) => surface.enabled);
  for (const surface of surfaces) {
    const entryPath = path.resolve(repoRoot, surface.entry);
    const outputPath = path.resolve(repoRoot, surface.snapshotOutputPath);
    buildSnapshot(entryPath, outputPath, `snapshot:${surface.id}`);
  }
}

main();
