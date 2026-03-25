import fs from "node:fs";
import path from "node:path";

import { createPenpotMcpClient } from "./penpot_mcp_client.mjs";

const repoRoot = process.cwd();
const outputPath = path.join(repoRoot, "apps/web/src/content/promoDraftLayout.json");

const assetBindingsByName = {
  "dtm_ico_256x256": "dtmLogo",
  "hf_20260316_210039_9166e0bd-06cb-4985-a597-7053558176f8": "heroFull",
  "hf_20260317_192815_b610f131-2d6a-42ec-ad75-91680ffaaccd": "scene192815",
  "hf_20260317_192939_d92165da-8558-4c87-9074-f0c0ede19a38": "systemScene",
  "hf_20260317_192941_0eb5f40f-1a12-4982-a0e8-d174fbd1c462": "mobileScene",
  "hf_20260317_192813_d73583d4-31d6-4fc1-b9fc-23789543eba1": "problemScene",
  "hf_20260317_031324_f832d7bf-5a55-4dbb-8b3e-cd2b9c6d7734": "scene031324",
  "hf_20260317_192812_8d370bb5-0550-4073-8990-5b0741229e98": "scene192812",
  "hf_20260317_192920_4869906f-b198-487e-9d8d-cefd3ce54483": "benefitsScene",
  "hf_20260317_192933_fb330689-1f22-49c3-8642-37fe97297435": "scene192933",
  "hf_20260317_192947_02ff1162-ebe4-4107-9357-045f42fd8841": "scene192947",
  "hf_20260317_032638_61105319-f625-47f5-b76f-3fe5f7a6d7f4": "scene032638",
  "hf_20260317_032640_849c29bb-3222-4ba8-abec-3b7a606c04fb": "scene032640",
  "hf_20260317_221330_6f543a8f-5276-4b71-b906-3d168aa6e480": "scene221330",
  "hf_20260317_221336_a8fb8077-ba77-4984-87f3-6388a4f7353e": "scene221336",
};

const assetBindingsById = {
  "fdb99022-94ba-80ca-8007-b9a86a12ef29": "heroGlow",
  "c7342233-b819-80da-8007-bb963bc7a90c": "topStrip",
  "c7342233-b819-80da-8007-bbcc26cd5f1a": "topStrip",
  "c7342233-b819-80da-8007-bba488eeedc2": "videoFrame",
};

const extractionCode = `
const board = penpotUtils.findShape((shape) => shape.name === "PROMO");
if (!board) throw new Error("PROMO not found");

let zIndex = 0;

function numberOr(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeFill(fill) {
  if (!fill) return null;
  const gradient = fill.fillColorGradient
    ? {
        type: fill.fillColorGradient.type,
        startX: fill.fillColorGradient.startX,
        startY: fill.fillColorGradient.startY,
        endX: fill.fillColorGradient.endX,
        endY: fill.fillColorGradient.endY,
        width: fill.fillColorGradient.width,
        stops: Array.isArray(fill.fillColorGradient.stops)
          ? fill.fillColorGradient.stops.map((stop) => ({
              color: stop.color,
              opacity: stop.opacity,
              offset: stop.offset
            }))
          : []
      }
    : null;

  return {
    color: fill.fillColor ?? null,
    opacity: fill.fillOpacity ?? null,
    gradient
  };
}

function normalizeStroke(stroke) {
  if (!stroke) return null;
  return {
    color: stroke.strokeColor ?? "#000000",
    opacity: stroke.strokeOpacity ?? 1,
    width: stroke.strokeWidth ?? 1
  };
}

function common(shape, kind) {
  return {
    id: shape.id,
    kind,
    name: shape.name ?? "",
    x: numberOr(shape.x - board.x),
    y: numberOr(shape.y - board.y),
    width: numberOr(shape.width),
    height: numberOr(shape.height),
    rotation: numberOr(shape.rotation),
    opacity: typeof shape.opacity === "number" ? shape.opacity : 1,
    blendMode: shape.blendMode ?? "normal",
    zIndex: zIndex++,
    visible: shape.visible !== false
  };
}

function isMaskGroup(shape) {
  if (!shape || shape.type !== "group" || !Array.isArray(shape.children) || shape.children.length !== 2) {
    return false;
  }
  const pathChild = shape.children.find((child) => child.type === "path");
  const imageChild = shape.children.find((child) => Array.isArray(child.fills) && child.fills.some((fill) => fill.fillImage));
  return Boolean(pathChild && imageChild);
}

function serializeMaskGroup(shape) {
  const pathChild = shape.children.find((child) => child.type === "path");
  const imageChild = shape.children.find((child) => Array.isArray(child.fills) && child.fills.some((fill) => fill.fillImage));
  if (!pathChild || !imageChild) return null;

  return {
    ...common(shape, "masked-image"),
    assetSourceName: imageChild.name ?? "",
    assetSourceId: imageChild.id,
    maskPath: pathChild.d ?? "",
    maskPathBounds: {
      x: numberOr(pathChild.x - board.x),
      y: numberOr(pathChild.y - board.y),
      width: numberOr(pathChild.width),
      height: numberOr(pathChild.height)
    },
    imageRect: {
      x: numberOr(imageChild.x - board.x),
      y: numberOr(imageChild.y - board.y),
      width: numberOr(imageChild.width),
      height: numberOr(imageChild.height)
    }
  };
}

function serializeShape(shape) {
  if (!shape || shape.visible === false) return [];

  if (isMaskGroup(shape)) {
    const masked = serializeMaskGroup(shape);
    return masked ? [masked] : [];
  }

  const nodes = [];
  const fills = Array.isArray(shape.fills) ? shape.fills.map(normalizeFill).filter(Boolean) : [];
  const strokes = Array.isArray(shape.strokes) ? shape.strokes.map(normalizeStroke).filter(Boolean) : [];
  const hasImageFill = Array.isArray(shape.fills) && shape.fills.some((fill) => fill.fillImage);

  if (shape.type === "text") {
    nodes.push({
      ...common(shape, "text"),
      text: shape.characters ?? "",
      fontFamily: shape.fontFamily ?? null,
      fontSize: Number(shape.fontSize ?? 16),
      fontWeight: shape.fontWeight ?? null,
      lineHeight: shape.lineHeight ?? null,
      letterSpacing: shape.letterSpacing ?? null,
      textTransform: shape.textTransform ?? null,
      textAlign: shape.align ?? null,
      fills
    });
  } else if (shape.type === "path") {
    nodes.push({
      ...common(shape, "path"),
      path: shape.d ?? "",
      fills,
      strokes
    });
  } else if (hasImageFill) {
    nodes.push({
      ...common(shape, "image"),
      assetSourceName: shape.name ?? "",
      assetSourceId: shape.id
    });
  } else if (["rectangle", "ellipse", "board"].includes(shape.type)) {
    nodes.push({
      ...common(shape, "shape"),
      shapeType: shape.type === "rectangle" ? "rect" : shape.type === "ellipse" ? "ellipse" : "board",
      fills,
      strokes,
      cornerRadius: typeof shape.borderRadius === "number" ? shape.borderRadius : null,
      blur: shape.blur?.value ?? null
    });
  }

  if (Array.isArray(shape.children)) {
    for (const child of shape.children) {
      nodes.push(...serializeShape(child));
    }
  }

  return nodes;
}

const nodes = [];
for (const child of board.children) {
  nodes.push(...serializeShape(child));
}

return {
  board: {
    name: board.name,
    width: numberOr(board.width),
    height: numberOr(board.height)
  },
  nodes
};
`;

function bindAssetKey(node) {
  const byId = assetBindingsById[node.assetSourceId];
  if (byId) return byId;
  const byName = assetBindingsByName[node.assetSourceName];
  if (byName) return byName;
  return null;
}

function withAssetBinding(node) {
  if (node.kind === "image" || node.kind === "masked-image") {
    const assetKey = bindAssetKey(node);
    if (!assetKey) {
      throw new Error(`No asset binding for ${node.kind} node ${node.id} (${node.assetSourceName})`);
    }
    return {
      ...node,
      assetKey,
    };
  }
  return node;
}

function buildScenes(boardHeight, sceneHeight = 1080) {
  const scenes = [];
  let cursor = 0;
  let index = 1;
  while (cursor < boardHeight) {
    const remaining = boardHeight - cursor;
    scenes.push({
      id: `scene-${String(index).padStart(2, "0")}`,
      y: cursor,
      height: Math.min(sceneHeight, remaining),
    });
    cursor += sceneHeight;
    index += 1;
  }
  return scenes;
}

async function main() {
  const client = createPenpotMcpClient({ timeoutMs: 60000 });
  const extracted = await client.executeCode(extractionCode);
  const nodes = extracted.result?.nodes ?? extracted.nodes ?? [];
  const board = extracted.result?.board ?? extracted.board;

  if (!board || !Array.isArray(nodes)) {
    throw new Error("Unexpected extraction result");
  }

  const boundNodes = nodes.map(withAssetBinding);
  const payload = {
    board,
    sceneHeight: 1080,
    scenes: buildScenes(board.height, 1080),
    nodes: boundNodes,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Promo draft layout written to ${outputPath}`);
  console.log(`Board: ${board.width}x${board.height}`);
  console.log(`Nodes: ${boundNodes.length}`);
}

await main();
