import { randomUUID } from "node:crypto";

import type {
  DeveloperTokenRecord,
  DeveloperTokenStatus,
  DeveloperTokenUsageRecord,
} from "../types";
import { AUTH_TABLES } from "./schema";
import {
  executeQuery,
  executeVoid,
  int32,
  optionalTimestamp,
  optionalUtf8,
  timestamp,
  utf8,
} from "./query";

type DeveloperTokenRow = {
  id: string;
  label: string;
  token_hash: string;
  status: DeveloperTokenStatus;
  expires_at: Date;
  created_at: Date;
  created_by: string | null;
  last_used_at: Date | null;
  use_count: number;
};

type DeveloperTokenUsageRow = {
  id: string;
  developer_token_id: string;
  used_at: Date;
  ip: string | null;
  city: string | null;
  client_summary: string | null;
};

function mapDeveloperToken(row: DeveloperTokenRow): DeveloperTokenRecord {
  return {
    id: row.id,
    label: row.label,
    tokenHash: row.token_hash,
    status: row.status,
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    createdBy: row.created_by,
    lastUsedAt:
      row.last_used_at instanceof Date
        ? row.last_used_at.toISOString()
        : row.last_used_at
          ? String(row.last_used_at)
          : null,
    useCount: Number(row.use_count ?? 0),
  };
}

function mapUsage(row: DeveloperTokenUsageRow): DeveloperTokenUsageRecord {
  return {
    id: row.id,
    developerTokenId: row.developer_token_id,
    usedAt: row.used_at instanceof Date ? row.used_at.toISOString() : String(row.used_at),
    ip: row.ip,
    city: row.city,
    clientSummary: row.client_summary,
  };
}

export async function createDeveloperToken(args: {
  id?: string;
  label: string;
  tokenHash: string;
  expiresAt: Date;
  createdBy: string | null;
}): Promise<DeveloperTokenRecord> {
  const id = args.id ?? randomUUID();
  const now = new Date();
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $label AS Utf8;
      DECLARE $token_hash AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $expires_at AS Timestamp;
      DECLARE $created_at AS Timestamp;
      DECLARE $created_by AS Optional<Utf8>;
      DECLARE $last_used_at AS Optional<Timestamp>;
      DECLARE $use_count AS Int32;

      UPSERT INTO ${AUTH_TABLES.developerTokens}
      (id, label, token_hash, status, expires_at, created_at, created_by, last_used_at, use_count)
      VALUES
      ($id, $label, $token_hash, $status, $expires_at, $created_at, $created_by, $last_used_at, $use_count);
    `,
    {
      $id: utf8(id),
      $label: utf8(args.label),
      $token_hash: utf8(args.tokenHash),
      $status: utf8("active"),
      $expires_at: timestamp(args.expiresAt),
      $created_at: timestamp(now),
      $created_by: optionalUtf8(args.createdBy),
      $last_used_at: optionalTimestamp(null),
      $use_count: int32(0),
    }
  );
  const created = await getDeveloperTokenById(id);
  if (!created) {
    throw new Error("Developer token create verification failed");
  }
  return created;
}

export async function listDeveloperTokens(): Promise<DeveloperTokenRecord[]> {
  const rows = await executeQuery<DeveloperTokenRow>(
    `
      SELECT id, label, token_hash, status, expires_at, created_at, created_by, last_used_at, use_count
      FROM ${AUTH_TABLES.developerTokens}
      ORDER BY created_at DESC;
    `
  );
  return rows.map(mapDeveloperToken);
}

export async function getDeveloperTokenById(id: string): Promise<DeveloperTokenRecord | null> {
  const rows = await executeQuery<DeveloperTokenRow>(
    `
      DECLARE $id AS Utf8;
      SELECT id, label, token_hash, status, expires_at, created_at, created_by, last_used_at, use_count
      FROM ${AUTH_TABLES.developerTokens}
      WHERE id = $id
      LIMIT 1;
    `,
    {
      $id: utf8(id),
    }
  );
  return rows[0] ? mapDeveloperToken(rows[0]) : null;
}

export async function getDeveloperTokenByHash(tokenHash: string): Promise<DeveloperTokenRecord | null> {
  const rows = await executeQuery<DeveloperTokenRow>(
    `
      DECLARE $token_hash AS Utf8;
      SELECT id, label, token_hash, status, expires_at, created_at, created_by, last_used_at, use_count
      FROM ${AUTH_TABLES.developerTokens}
      WHERE token_hash = $token_hash
      LIMIT 1;
    `,
    {
      $token_hash: utf8(tokenHash),
    }
  );
  return rows[0] ? mapDeveloperToken(rows[0]) : null;
}

export async function updateDeveloperToken(args: {
  id: string;
  label: string;
  expiresAt: Date;
  status: DeveloperTokenStatus;
}): Promise<void> {
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $label AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $expires_at AS Timestamp;

      UPSERT INTO ${AUTH_TABLES.developerTokens}
      SELECT
        id,
        $label AS label,
        token_hash,
        $status AS status,
        $expires_at AS expires_at,
        created_at,
        created_by,
        last_used_at,
        use_count
      FROM ${AUTH_TABLES.developerTokens}
      WHERE id = $id;
    `,
    {
      $id: utf8(args.id),
      $label: utf8(args.label),
      $status: utf8(args.status),
      $expires_at: timestamp(args.expiresAt),
    }
  );
}

export async function revokeDeveloperToken(id: string): Promise<void> {
  const existing = await getDeveloperTokenById(id);
  if (!existing) return;
  await updateDeveloperToken({
    id,
    label: existing.label,
    expiresAt: new Date(existing.expiresAt),
    status: "revoked",
  });
}

export async function deleteDeveloperToken(id: string): Promise<void> {
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DELETE FROM ${AUTH_TABLES.developerTokens}
      WHERE id = $id;
    `,
    {
      $id: utf8(id),
    }
  );

  await executeVoid(
    `
      DECLARE $developer_token_id AS Utf8;
      DELETE FROM ${AUTH_TABLES.developerTokenUsage}
      WHERE developer_token_id = $developer_token_id;
    `,
    {
      $developer_token_id: utf8(id),
    }
  );
}

export async function touchDeveloperTokenUsage(args: {
  developerTokenId: string;
  ip: string | null;
  city: string | null;
  clientSummary: string | null;
}): Promise<void> {
  const now = new Date();
  const token = await getDeveloperTokenById(args.developerTokenId);
  if (!token) return;

  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $developer_token_id AS Utf8;
      DECLARE $used_at AS Timestamp;
      DECLARE $ip AS Optional<Utf8>;
      DECLARE $city AS Optional<Utf8>;
      DECLARE $client_summary AS Optional<Utf8>;

      UPSERT INTO ${AUTH_TABLES.developerTokenUsage}
      (id, developer_token_id, used_at, ip, city, client_summary)
      VALUES
      ($id, $developer_token_id, $used_at, $ip, $city, $client_summary);
    `,
    {
      $id: utf8(randomUUID()),
      $developer_token_id: utf8(args.developerTokenId),
      $used_at: timestamp(now),
      $ip: optionalUtf8(args.ip),
      $city: optionalUtf8(args.city),
      $client_summary: optionalUtf8(args.clientSummary),
    }
  );

  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $last_used_at AS Timestamp;
      DECLARE $use_count AS Int32;

      UPSERT INTO ${AUTH_TABLES.developerTokens}
      SELECT
        id,
        label,
        token_hash,
        status,
        expires_at,
        created_at,
        created_by,
        $last_used_at AS last_used_at,
        $use_count AS use_count
      FROM ${AUTH_TABLES.developerTokens}
      WHERE id = $id;
    `,
    {
      $id: utf8(args.developerTokenId),
      $last_used_at: timestamp(now),
      $use_count: int32(token.useCount + 1),
    }
  );
}

export async function listDeveloperTokenUsage(developerTokenId: string, limit = 20): Promise<DeveloperTokenUsageRecord[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await executeQuery<DeveloperTokenUsageRow>(
    `
      DECLARE $developer_token_id AS Utf8;
      DECLARE $limit AS Int32;
      SELECT id, developer_token_id, used_at, ip, city, client_summary
      FROM ${AUTH_TABLES.developerTokenUsage}
      WHERE developer_token_id = $developer_token_id
      ORDER BY used_at DESC
      LIMIT $limit;
    `,
    {
      $developer_token_id: utf8(developerTokenId),
      $limit: int32(safeLimit),
    }
  );
  return rows.map(mapUsage);
}
