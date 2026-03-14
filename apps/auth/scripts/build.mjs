import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const outdir = resolve(appRoot, "dist");

await mkdir(outdir, { recursive: true });

await build({
  entryPoints: [resolve(appRoot, "src/index.ts")],
  outfile: resolve(outdir, "index.js"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  legalComments: "none",
  logLevel: "info",
});
