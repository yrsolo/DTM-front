import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import ydbSdk from "ydb-sdk";

const {
  AlterTableDescription,
  Column,
  CreateTableSettings,
  Driver,
  getCredentialsFromEnv,
  TableDescription,
  Types,
} = ydbSdk;

function parseArgs(argv) {
  const result = { target: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--target") {
      result.target = argv[i + 1] ?? null;
      i += 1;
    }
  }
  if (result.target !== "test" && result.target !== "prod") {
    throw new Error("Usage: node scripts/migrate_auth_ydb.mjs --target test|prod");
  }
  return result;
}

function parseSimpleYaml(yaml) {
  const result = {};
  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^(\s*)([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) continue;
    const [, indent, key, value] = match;
    if (indent.length === 0) {
      result[key] = {};
      result.__current = key;
      continue;
    }
    if (!result.__current) continue;
    result[result.__current][key] = value.trim();
  }
  delete result.__current;
  return result;
}

function loadDeployConfig() {
  const raw = fs.readFileSync(path.resolve("config/deploy.yaml"), "utf8");
  return parseSimpleYaml(raw);
}

function optional(type) {
  return { optionalType: { item: type } };
}

async function ensureSaCredentialsFile() {
  if (process.env.YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS) {
    return null;
  }

  const rawJson = process.env.YC_SA_JSON_CREDENTIALS?.trim();
  if (!rawJson) {
    process.env.YDB_METADATA_CREDENTIALS = "1";
    return null;
  }

  const tempFile = path.join(os.tmpdir(), `dtm-auth-ydb-${Date.now()}.json`);
  fs.writeFileSync(tempFile, rawJson, "utf8");
  process.env.YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS = tempFile;
  return tempFile;
}

async function ensureTable(driver, tableName, description) {
  await driver.tableClient.withSessionRetry(async (session) => {
    try {
      await session.describeTable(tableName);
      return;
    } catch {
      await session.createTable(tableName, description, new CreateTableSettings());
    }
  });
}

async function ensureOptionalColumns(driver, tableName, columns) {
  await driver.tableClient.withSessionRetry(async (session) => {
    const description = await session.describeTable(tableName);
    const existing = new Set((description.columns || []).map((column) => column.name));
    const missing = columns.filter((column) => !existing.has(column.name));
    if (!missing.length) {
      return;
    }
    const alterDescription = new AlterTableDescription();
    alterDescription.addColumns = missing;
    await session.alterTable(tableName, alterDescription);
  });
}

async function main() {
  const { target } = parseArgs(process.argv.slice(2));
  const config = loadDeployConfig();
  const yc = config.yandex_cloud ?? {};

  const endpoint = yc.ydb_endpoint;
  const database = target === "test" ? yc.ydb_database_test : yc.ydb_database_prod;
  if (!endpoint || !database) {
    throw new Error("Missing ydb_endpoint / ydb_database_* in config/deploy.yaml");
  }

  const tempCredentialsFile = await ensureSaCredentialsFile();

  const driver = new Driver({
    endpoint,
    database,
    authService: getCredentialsFromEnv(),
  });

  try {
    await driver.ready(10000);

    const users = new TableDescription()
      .withPrimaryKey("id")
      .withColumns(
        new Column("id", Types.UTF8),
        new Column("yandex_uid", Types.UTF8),
        new Column("email", optional(Types.UTF8)),
        new Column("display_name", optional(Types.UTF8)),
        new Column("avatar_url", optional(Types.UTF8)),
        new Column("person_id", optional(Types.UTF8)),
        new Column("person_name", optional(Types.UTF8)),
        new Column("telegram_id", optional(Types.UTF8)),
        new Column("telegram_username", optional(Types.UTF8)),
        new Column("status", Types.UTF8),
        new Column("role", Types.UTF8),
        new Column("session_version", Types.INT32),
        new Column("created_at", Types.TIMESTAMP),
        new Column("last_login_at", optional(Types.TIMESTAMP)),
      );

    const allowlist = new TableDescription()
      .withPrimaryKey("email")
      .withColumns(
        new Column("email", Types.UTF8),
        new Column("source", Types.UTF8),
        new Column("comment", optional(Types.UTF8)),
        new Column("created_at", Types.TIMESTAMP),
        new Column("created_by", optional(Types.UTF8)),
      );

    const accessRequests = new TableDescription()
      .withPrimaryKey("id")
      .withColumns(
        new Column("id", Types.UTF8),
        new Column("user_id", Types.UTF8),
        new Column("email", optional(Types.UTF8)),
        new Column("state", Types.UTF8),
        new Column("requested_at", Types.TIMESTAMP),
        new Column("note", optional(Types.UTF8)),
      );

    const auditLog = new TableDescription()
      .withPrimaryKey("id")
      .withColumns(
        new Column("id", Types.UTF8),
        new Column("actor_user_id", optional(Types.UTF8)),
        new Column("target_user_id", optional(Types.UTF8)),
        new Column("action", Types.UTF8),
        new Column("payload_json", optional(Types.UTF8)),
        new Column("created_at", Types.TIMESTAMP),
      );

    const adminLayoutPrefs = new TableDescription()
      .withPrimaryKey("admin_user_id")
      .withColumns(
        new Column("admin_user_id", Types.UTF8),
        new Column("pending_users_order", optional(Types.UTF8)),
        new Column("approved_users_order", optional(Types.UTF8)),
        new Column("color_presets_order", optional(Types.UTF8)),
        new Column("layout_presets_order", optional(Types.UTF8)),
        new Column("updated_at", Types.TIMESTAMP),
      );

    const accessLinks = new TableDescription()
      .withPrimaryKey("id")
      .withColumns(
        new Column("id", Types.UTF8),
        new Column("label", Types.UTF8),
        new Column("token_hash", Types.UTF8),
        new Column("status", Types.UTF8),
        new Column("expires_at", Types.TIMESTAMP),
        new Column("created_at", Types.TIMESTAMP),
        new Column("created_by", optional(Types.UTF8)),
        new Column("last_used_at", optional(Types.TIMESTAMP)),
        new Column("use_count", Types.INT32),
      );

    const accessLinkUsage = new TableDescription()
      .withPrimaryKey("id")
      .withColumns(
        new Column("id", Types.UTF8),
        new Column("link_id", Types.UTF8),
        new Column("used_at", Types.TIMESTAMP),
        new Column("ip", optional(Types.UTF8)),
        new Column("city", optional(Types.UTF8)),
        new Column("client_summary", optional(Types.UTF8)),
      );

    await ensureTable(driver, "users", users);
    await ensureTable(driver, "allowlist_emails", allowlist);
    await ensureTable(driver, "access_requests", accessRequests);
    await ensureTable(driver, "audit_log", auditLog);
    await ensureTable(driver, "admin_layout_prefs", adminLayoutPrefs);
    await ensureTable(driver, "access_links", accessLinks);
    await ensureTable(driver, "access_link_usage", accessLinkUsage);
    await ensureOptionalColumns(driver, "users", [
      new Column("avatar_url", optional(Types.UTF8)),
      new Column("person_id", optional(Types.UTF8)),
      new Column("person_name", optional(Types.UTF8)),
      new Column("telegram_id", optional(Types.UTF8)),
      new Column("telegram_username", optional(Types.UTF8)),
    ]);

    console.log(`Auth YDB migration completed for ${target}`);
  } finally {
    await driver.destroy();
    if (tempCredentialsFile) {
      fs.rmSync(tempCredentialsFile, { force: true });
    }
  }
}

await main();
