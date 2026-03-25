import { randomUUID } from "node:crypto";

import type { AccessLinkRecord, AccessLinkStatus, AccessLinkUsageRecord } from "../types";
import { AUTH_TABLES } from "./schema";
import { executeQuery, executeVoid, int32, optionalBool, optionalTimestamp, optionalUtf8, timestamp, utf8 } from "./query";

type AccessLinkRow = {
  id: string;
  label: string;
  token_hash: string;
  status: AccessLinkStatus;
  expires_at: Date;
  created_at: Date;
  created_by: string | null;
  last_used_at: Date | null;
  use_count: number;
  show_designer_grouping: boolean | null;
};

type AccessLinkUsageRow = {
  id: string;
  link_id: string;
  used_at: Date;
  ip: string | null;
  city: string | null;
  client_summary: string | null;
};

function mapAccessLink(row: AccessLinkRow): AccessLinkRecord {
  return {
    id: row.id,
    label: row.label,
    tokenHash: row.token_hash,
    status: row.status,
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    createdBy: row.created_by,
    lastUsedAt: row.last_used_at instanceof Date ? row.last_used_at.toISOString() : row.last_used_at ? String(row.last_used_at) : null,
    useCount: Number(row.use_count ?? 0),
    showDesignerGrouping: Boolean(row.show_designer_grouping),
  };
}

function mapUsage(row: AccessLinkUsageRow): AccessLinkUsageRecord {
  return {
    id: row.id,
    linkId: row.link_id,
    usedAt: row.used_at instanceof Date ? row.used_at.toISOString() : String(row.used_at),
    ip: row.ip,
    city: row.city,
    clientSummary: row.client_summary,
  };
}

export async function createAccessLink(args: {
  id?: string;
  label: string;
  tokenHash: string;
  expiresAt: Date;
  createdBy: string | null;
  showDesignerGrouping: boolean;
}): Promise<AccessLinkRecord> {
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
      DECLARE $show_designer_grouping AS Optional<Bool>;

      UPSERT INTO ${AUTH_TABLES.accessLinks}
      (id, label, token_hash, status, expires_at, created_at, created_by, last_used_at, use_count, show_designer_grouping)
      VALUES
      ($id, $label, $token_hash, $status, $expires_at, $created_at, $created_by, $last_used_at, $use_count, $show_designer_grouping);
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
      $show_designer_grouping: optionalBool(args.showDesignerGrouping),
    }
  );
  const created = await getAccessLinkById(id);
  if (!created) {
    throw new Error("Access link create verification failed");
  }
  return created;
}

export async function listAccessLinks(): Promise<AccessLinkRecord[]> {
  const rows = await executeQuery<AccessLinkRow>(
    `
      SELECT id, label, token_hash, status, expires_at, created_at, created_by, last_used_at, use_count
      , show_designer_grouping
      FROM ${AUTH_TABLES.accessLinks}
      ORDER BY created_at DESC;
    `
  );
  return rows.map(mapAccessLink);
}

export async function getAccessLinkById(id: string): Promise<AccessLinkRecord | null> {
  const rows = await executeQuery<AccessLinkRow>(
    `
      DECLARE $id AS Utf8;
      SELECT id, label, token_hash, status, expires_at, created_at, created_by, last_used_at, use_count, show_designer_grouping
      FROM ${AUTH_TABLES.accessLinks}
      WHERE id = $id
      LIMIT 1;
    `,
    { $id: utf8(id) }
  );
  return rows[0] ? mapAccessLink(rows[0]) : null;
}

export async function getAccessLinkByTokenHash(tokenHash: string): Promise<AccessLinkRecord | null> {
  const rows = await executeQuery<AccessLinkRow>(
    `
      DECLARE $token_hash AS Utf8;
      SELECT id, label, token_hash, status, expires_at, created_at, created_by, last_used_at, use_count, show_designer_grouping
      FROM ${AUTH_TABLES.accessLinks}
      WHERE token_hash = $token_hash
      LIMIT 1;
    `,
    { $token_hash: utf8(tokenHash) }
  );
  return rows[0] ? mapAccessLink(rows[0]) : null;
}

export async function updateAccessLink(args: {
  id: string;
  label: string;
  expiresAt: Date;
  status: AccessLinkStatus;
  showDesignerGrouping: boolean;
}): Promise<void> {
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $label AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $expires_at AS Timestamp;
      DECLARE $show_designer_grouping AS Optional<Bool>;

      UPSERT INTO ${AUTH_TABLES.accessLinks}
      SELECT
        id,
        $label AS label,
        token_hash,
        $status AS status,
        $expires_at AS expires_at,
        created_at,
        created_by,
        last_used_at,
        use_count,
        $show_designer_grouping AS show_designer_grouping
      FROM ${AUTH_TABLES.accessLinks}
      WHERE id = $id;
    `,
    {
      $id: utf8(args.id),
      $label: utf8(args.label),
      $status: utf8(args.status),
      $expires_at: timestamp(args.expiresAt),
      $show_designer_grouping: optionalBool(args.showDesignerGrouping),
    }
  );
}

export async function revokeAccessLink(id: string): Promise<void> {
  const link = await getAccessLinkById(id);
  if (!link) return;
  await updateAccessLink({
    id,
    label: link.label,
    expiresAt: new Date(link.expiresAt),
    status: "revoked",
    showDesignerGrouping: link.showDesignerGrouping,
  });
}

export async function deleteAccessLink(id: string): Promise<void> {
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DELETE FROM ${AUTH_TABLES.accessLinks}
      WHERE id = $id;
    `,
    {
      $id: utf8(id),
    }
  );

  await executeVoid(
    `
      DECLARE $link_id AS Utf8;
      DELETE FROM ${AUTH_TABLES.accessLinkUsage}
      WHERE link_id = $link_id;
    `,
    {
      $link_id: utf8(id),
    }
  );
}

export async function touchAccessLinkUsage(args: {
  linkId: string;
  ip: string | null;
  city: string | null;
  clientSummary: string | null;
}): Promise<void> {
  const now = new Date();
  const link = await getAccessLinkById(args.linkId);
  if (!link) return;

  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $link_id AS Utf8;
      DECLARE $used_at AS Timestamp;
      DECLARE $ip AS Optional<Utf8>;
      DECLARE $city AS Optional<Utf8>;
      DECLARE $client_summary AS Optional<Utf8>;

      UPSERT INTO ${AUTH_TABLES.accessLinkUsage}
      (id, link_id, used_at, ip, city, client_summary)
      VALUES
      ($id, $link_id, $used_at, $ip, $city, $client_summary);
    `,
    {
      $id: utf8(randomUUID()),
      $link_id: utf8(args.linkId),
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

      UPSERT INTO ${AUTH_TABLES.accessLinks}
      SELECT
        id,
        label,
        token_hash,
        status,
        expires_at,
        created_at,
        created_by,
        $last_used_at AS last_used_at,
        $use_count AS use_count,
        show_designer_grouping
      FROM ${AUTH_TABLES.accessLinks}
      WHERE id = $id;
    `,
    {
      $id: utf8(args.linkId),
      $last_used_at: timestamp(now),
      $use_count: int32(link.useCount + 1),
    }
  );
}

export async function listAccessLinkUsage(linkId: string, limit = 20): Promise<AccessLinkUsageRecord[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await executeQuery<AccessLinkUsageRow>(
    `
      DECLARE $link_id AS Utf8;
      DECLARE $limit AS Int32;
      SELECT id, link_id, used_at, ip, city, client_summary
      FROM ${AUTH_TABLES.accessLinkUsage}
      WHERE link_id = $link_id
      ORDER BY used_at DESC
      LIMIT $limit;
    `,
    {
      $link_id: utf8(linkId),
      $limit: int32(safeLimit),
    }
  );
  return rows.map(mapUsage);
}
