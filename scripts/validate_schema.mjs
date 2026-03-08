import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const repoRoot = process.cwd();
const schemaPath = path.join(repoRoot, "packages/schema/snapshot.schema.json");
const snapshotPath = path.join(repoRoot, "data/snapshot.example.json");
const optionalV2Path = path.join(repoRoot, "data/snapshot.v2.sample.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeToSnapshotV1(payload) {
  if (!payload) throw new Error("Empty payload");

  const isV2 =
    payload.meta?.artifact === "dtm_frontend_api_v2" ||
    payload.entities;
  const isV1 = payload.meta?.version === "v1" && Array.isArray(payload.tasks);

  if (isV1) return payload;

  if (isV2) {
    return {
      meta: {
        version: "v1",
        generatedAt: payload.meta?.generatedAt || new Date().toISOString(),
        source: payload.meta?.source?.sheetName,
        hash: payload.meta?.hash
      },
      people: (payload.entities?.people || []).map((p) => ({
        id: String(p.id),
        name: p.name,
        position: p.position ?? null
      })),
      groups: (payload.entities?.groups || []).map((g) => ({
        id: String(g.id),
        name: g.name
      })),
      tasks: (payload.tasks || []).map((t) => ({
        id: String(t.id),
        title: t.title || "Untitled",
        ownerId: t.ownerId ?? null,
        status: t.status || "unknown",
        start: t.date?.start || t.start,
        end: t.date?.end || t.end,
        nextDue: t.date?.nextDue ?? null,
        tags: Array.isArray(t.tags) ? t.tags : [],
        groupId: t.groupId,
        deps: Array.isArray(t.deps) ? t.deps : [],
        links: t.links
          ? {
              sheetRowUrl: t.links.sheetRowUrl ?? null,
              externalUrl: t.links.externalUrl,
              self: t.links.self
            }
          : undefined,
        notes: t.notes,
        milestones: Array.isArray(t.milestones)
          ? t.milestones.map((m) => ({
              type: m.type,
              planned: m.planned,
              actual: m.actual ?? null,
              status: m.status || "unknown"
            }))
          : [],
        hash: t.hash ?? null,
        revision: t.revision ?? null
      })),
      enums: {
        status: payload.entities?.enums?.status,
        statusGroups: payload.entities?.enums?.statusGroups,
        milestoneType: payload.entities?.enums?.milestoneType,
        milestoneStatus: payload.entities?.enums?.milestoneStatus
      }
    };
  }

  throw new Error("Unsupported payload format: expected v1 or v2-like snapshot");
}

function validateFile(validate, filePath, label) {
  const raw = readJson(filePath);
  const normalized = normalizeToSnapshotV1(raw);
  const ok = validate(normalized);
  if (ok) {
    console.log(`[ok] ${label}: valid against snapshot.schema.json`);
    return true;
  }

  console.error(`[fail] ${label}: validation errors`);
  for (const err of validate.errors ?? []) {
    console.error(` - ${err.instancePath || "/"} ${err.message ?? ""}`);
  }
  return false;
}

const schema = readJson(schemaPath);
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

let success = true;
success = validateFile(validate, snapshotPath, "data/snapshot.example.json") && success;

if (fs.existsSync(optionalV2Path)) {
  success = validateFile(validate, optionalV2Path, "data/snapshot.v2.sample.json") && success;
}

if (!success) {
  process.exit(1);
}

console.log("Schema validation passed.");
