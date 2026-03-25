import { analyzeSourceFile } from "../packages/workbench-source-analysis/src/analyzeSourceFile.mjs";

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/workbench_source_identity_probe.mjs <file.tsx>");
    process.exit(1);
  }

  const report = analyzeSourceFile(inputPath);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
