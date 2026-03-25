import fs from "node:fs";
import path from "node:path";
import { analyzeSourceFile } from "../packages/workbench-source-analysis/src/analyzeSourceFile.mjs";
import { buildSourceGraphSnapshot } from "../packages/workbench-source-analysis/src/buildSourceGraphSnapshot.mjs";

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error("Usage: node scripts/build_workbench_source_graph_snapshot.mjs <entry.tsx> <output.json>");
    process.exit(1);
  }

  const report = analyzeSourceFile(inputPath);
  if (!report) {
    console.error("Failed to analyze source file");
    process.exit(1);
  }

  const snapshot = buildSourceGraphSnapshot({
    snapshotId: `snapshot:${path.basename(inputPath)}`,
    entry: report.file,
    report,
  });

  const absoluteOutputPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${absoluteOutputPath}\n`);
}

main();
