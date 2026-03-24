import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const inputPath = path.join(repoRoot, "ref", "02", "land.html");
const outputDir = path.join(repoRoot, "apps", "web", "public", "promo", "penpot-draft");
const assetsDir = path.join(outputDir, "inspector-assets");
const outputHtmlPath = path.join(outputDir, "land.externalized.html");

const dataUriPattern = /data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g;

async function ensureCleanDir(targetDir) {
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
}

function assetFileName(index, extension, payload) {
  const hash = crypto.createHash("sha1").update(payload).digest("hex").slice(0, 10);
  return `asset-${String(index).padStart(2, "0")}-${hash}.${extension}`;
}

async function main() {
  const source = await fs.readFile(inputPath, "utf8");
  await fs.mkdir(outputDir, { recursive: true });
  await ensureCleanDir(assetsDir);

  const assetEntries = [];
  let assetIndex = 0;

  const rewritten = source.replace(dataUriPattern, (_full, extension, base64Payload) => {
    assetIndex += 1;
    const normalizedExtension = String(extension).toLowerCase();
    const fileName = assetFileName(assetIndex, normalizedExtension, base64Payload);
    const filePath = path.join(assetsDir, fileName);
    const buffer = Buffer.from(base64Payload, "base64");
    assetEntries.push({ filePath, buffer });
    return `./inspector-assets/${fileName}`;
  });

  await Promise.all(assetEntries.map((entry) => fs.writeFile(entry.filePath, entry.buffer)));
  await fs.writeFile(outputHtmlPath, rewritten, "utf8");

  const hasInlineImages = dataUriPattern.test(rewritten);
  console.log(
    JSON.stringify(
      {
        inputPath,
        outputHtmlPath,
        outputAssetsDir: assetsDir,
        assetCount: assetEntries.length,
        hasInlineImages,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
