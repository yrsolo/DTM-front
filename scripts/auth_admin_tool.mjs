import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import ydbSdk from "ydb-sdk";

const { AUTO_TX, Driver, getCredentialsFromEnv, TypedValues, Types } = ydbSdk;

function parseArgs(argv) {
  const result = {
    target: null,
    command: null,
    userId: null,
    email: null,
    comment: null,
    status: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--target":
        result.target = argv[++i] ?? null;
        break;
      case "--command":
        result.command = argv[++i] ?? null;
        break;
      case "--user-id":
        result.userId = argv[++i] ?? null;
        break;
      case "--email":
        result.email = argv[++i] ?? null;
        break;
      case "--comment":
        result.comment = argv[++i] ?? null;
        break;
      case "--status":
        result.status = argv[++i] ?? null;
        break;
      default:
        throw new Error(`Unknown arg: ${arg}`);
    }
  }

  if (result.target !== "test" && result.target !== "prod") {
    throw new Error("Usage: --target test|prod");
  }
  if (!result.command) {
    throw new Error("Usage: --command list-users|approve-user|block-user|make-admin|add-allowlist|list-allowlist");
  }

  return result;
}

function parseSimpleYaml(yaml) {
  const result = {};
  let current = null;
  for (const rawLine of yaml.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
    const m = rawLine.match(/^(\s*)([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const [, indent, key, value] = m;
    if (indent.length === 0) {
      result[key] = {};
      current = key;
    } else if (current) {
      result[current][key] = value.trim();
    }
  }
  return result;
}

function utf8(value) {
  return TypedValues.fromNative(Types.UTF8, value);
}

function int32(value) {
  return TypedValues.fromNative(Types.INT32, value);
}

function timestamp(value) {
  return TypedValues.fromNative(Types.TIMESTAMP, value);
}

function optionalUtf8(value) {
  if (value == null || value === "") {
    return { type: { optionalType: { item: Types.UTF8 } }, value: { nullFlagValue: 0 } };
  }
  return { type: { optionalType: { item: Types.UTF8 } }, value: TypedValues.fromNative(Types.UTF8, value).value };
}

function optionalTimestamp(value) {
  if (value == null) {
    return { type: { optionalType: { item: Types.TIMESTAMP } }, value: { nullFlagValue: 0 } };
  }
  return { type: { optionalType: { item: Types.TIMESTAMP } }, value: TypedValues.fromNative(Types.TIMESTAMP, value).value };
}

function toDateFromMicros(value) {
  if (value == null) return null;
  const numeric = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return new Date(Math.floor(numeric / 1000));
}

function convertYdbValueToNative(type, value) {
  if (type?.optionalType) {
    if (value?.nullFlagValue != null) return null;
    return convertYdbValueToNative(type.optionalType.item, value?.nestedValue ?? value);
  }
  switch (type?.typeId) {
    case Types.UTF8.typeId:
      return value?.textValue ?? null;
    case Types.INT32.typeId:
      return value?.int32Value ?? 0;
    case Types.TIMESTAMP.typeId:
      return toDateFromMicros(value?.uint64Value);
    default:
      if (value?.textValue != null) return value.textValue;
      if (value?.int32Value != null) return value.int32Value;
      if (value?.uint64Value != null) return value.uint64Value;
      return value ?? null;
  }
}

function rowsFromResultSet(resultSet) {
  if (!resultSet?.columns || !resultSet?.rows) return [];
  return resultSet.rows.map((row) => {
    const nativeRow = {};
    row.items.forEach((value, index) => {
      const column = resultSet.columns[index];
      if (!column?.name || !column?.type) return;
      nativeRow[column.name] = convertYdbValueToNative(column.type, value);
    });
    return nativeRow;
  });
}

async function ensureCredentialsFile() {
  if (process.env.YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS) return null;
  if (process.env.YC_SA_JSON_CREDENTIALS?.trim()) {
    const tempFile = path.join(os.tmpdir(), `dtm-auth-tool-${Date.now()}.json`);
    fs.writeFileSync(tempFile, process.env.YC_SA_JSON_CREDENTIALS, "utf8");
    process.env.YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS = tempFile;
    return tempFile;
  }
  process.env.YDB_METADATA_CREDENTIALS = "1";
  return null;
}

async function executeQuery(driver, query, params = {}) {
  const result = await driver.tableClient.withSessionRetry(async (session) =>
    session.executeQuery(query, params, AUTO_TX)
  );
  return rowsFromResultSet(result?.resultSets?.[0]);
}

async function executeVoid(driver, query, params = {}) {
  await executeQuery(driver, query, params);
}

function normalizeEmail(email) {
  const value = email?.trim().toLowerCase();
  return value || null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = parseSimpleYaml(fs.readFileSync(path.resolve("config/deploy.yaml"), "utf8"));
  const yc = config.yandex_cloud ?? {};
  const database = args.target === "test" ? yc.ydb_database_test : yc.ydb_database_prod;
  const endpoint = yc.ydb_endpoint;
  if (!database || !endpoint) throw new Error("Missing YDB config in config/deploy.yaml");

  const tempCredentialsFile = await ensureCredentialsFile();
  const driver = new Driver({
    endpoint,
    database,
    authService: getCredentialsFromEnv(),
  });

  try {
    await driver.ready(10000);

    switch (args.command) {
      case "list-users": {
        const predicate = args.status ? "WHERE status = $status" : "";
        const params = args.status ? { $status: utf8(args.status) } : {};
        const rows = await executeQuery(
          driver,
          `
            ${args.status ? "DECLARE $status AS Utf8;" : ""}
            SELECT id, yandex_uid, email, display_name, status, role, session_version, created_at, last_login_at
            FROM users
            ${predicate}
            ORDER BY created_at DESC;
          `,
          params
        );
        console.log(JSON.stringify(rows, null, 2));
        break;
      }
      case "list-allowlist": {
        const rows = await executeQuery(
          driver,
          `SELECT email, source, comment, created_at, created_by FROM allowlist_emails ORDER BY created_at DESC;`
        );
        console.log(JSON.stringify(rows, null, 2));
        break;
      }
      case "add-allowlist": {
        const email = normalizeEmail(args.email);
        if (!email) throw new Error("--email is required");
        await executeVoid(
          driver,
          `
            DECLARE $email AS Utf8;
            DECLARE $source AS Utf8;
            DECLARE $comment AS Optional<Utf8>;
            DECLARE $created_at AS Timestamp;
            DECLARE $created_by AS Optional<Utf8>;

            UPSERT INTO allowlist_emails (email, source, comment, created_at, created_by)
            VALUES ($email, $source, $comment, $created_at, $created_by);
          `,
          {
            $email: utf8(email),
            $source: utf8("manual"),
            $comment: optionalUtf8(args.comment),
            $created_at: timestamp(new Date()),
            $created_by: optionalUtf8("local-tool"),
          }
        );
        console.log(`Allowlist email added: ${email}`);
        break;
      }
      case "approve-user": {
        if (!args.userId) throw new Error("--user-id is required");
        await executeVoid(
          driver,
          `
            DECLARE $id AS Utf8;
            UPSERT INTO users
            SELECT id, yandex_uid, email, display_name, "approved" AS status, role, session_version, created_at, last_login_at
            FROM users
            WHERE id = $id;
          `,
          { $id: utf8(args.userId) }
        );
        await executeVoid(
          driver,
          `
            DECLARE $user_id AS Utf8;
            DECLARE $closed_at_state AS Utf8;
            UPSERT INTO access_requests
            SELECT id, user_id, email, $closed_at_state AS state, requested_at, note
            FROM access_requests
            WHERE user_id = $user_id AND state = "open";
          `,
          { $user_id: utf8(args.userId), $closed_at_state: utf8("approved") }
        );
        console.log(`User approved: ${args.userId}`);
        break;
      }
      case "block-user": {
        if (!args.userId) throw new Error("--user-id is required");
        const rows = await executeQuery(
          driver,
          `DECLARE $id AS Utf8; SELECT session_version FROM users WHERE id = $id LIMIT 1;`,
          { $id: utf8(args.userId) }
        );
        const nextVersion = Number(rows[0]?.session_version ?? 1) + 1;
        await executeVoid(
          driver,
          `
            DECLARE $id AS Utf8;
            DECLARE $session_version AS Int32;
            UPSERT INTO users
            SELECT id, yandex_uid, email, display_name, "blocked" AS status, role, $session_version AS session_version, created_at, last_login_at
            FROM users
            WHERE id = $id;
          `,
          { $id: utf8(args.userId), $session_version: int32(nextVersion) }
        );
        await executeVoid(
          driver,
          `
            DECLARE $user_id AS Utf8;
            DECLARE $closed_state AS Utf8;
            UPSERT INTO access_requests
            SELECT id, user_id, email, $closed_state AS state, requested_at, note
            FROM access_requests
            WHERE user_id = $user_id AND state = "open";
          `,
          { $user_id: utf8(args.userId), $closed_state: utf8("closed") }
        );
        console.log(`User blocked: ${args.userId}`);
        break;
      }
      case "make-admin": {
        if (!args.userId) throw new Error("--user-id is required");
        await executeVoid(
          driver,
          `
            DECLARE $id AS Utf8;
            UPSERT INTO users
            SELECT id, yandex_uid, email, display_name, "approved" AS status, "admin" AS role, session_version, created_at, last_login_at
            FROM users
            WHERE id = $id;
          `,
          { $id: utf8(args.userId) }
        );
        console.log(`User promoted to admin: ${args.userId}`);
        break;
      }
      default:
        throw new Error(`Unsupported command: ${args.command}`);
    }
  } finally {
    await driver.destroy();
    if (tempCredentialsFile) {
      fs.rmSync(tempCredentialsFile, { force: true });
    }
  }
}

await main();
