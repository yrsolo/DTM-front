import { randomUUID } from "node:crypto";

import { executeQuery, executeVoid, optionalUtf8, timestamp, utf8 } from "./query";
import { normalizeEmail } from "./normalization";
import { AUTH_TABLES } from "./schema";

export type AllowlistEntry = {
  email: string;
  source: string;
  comment: string | null;
  createdAt: string;
  createdBy: string | null;
};

type AllowlistRow = {
  email: string;
  source: string;
  comment: string | null;
  created_at: Date;
  created_by: string | null;
};

function mapEntry(row: AllowlistRow): AllowlistEntry {
  return {
    email: row.email,
    source: row.source,
    comment: row.comment,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    createdBy: row.created_by,
  };
}

export async function isEmailAllowed(email: string | null | undefined): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const rows = await executeQuery<AllowlistRow>(
    `
      DECLARE $email AS Utf8;
      SELECT email, source, comment, created_at, created_by
      FROM ${AUTH_TABLES.allowlistEmails}
      WHERE email = $email
      LIMIT 1;
    `,
    { $email: utf8(normalized) }
  );
  return Boolean(rows[0]);
}

export async function listAllowlistEntries(): Promise<AllowlistEntry[]> {
  const rows = await executeQuery<AllowlistRow>(
    `
      SELECT email, source, comment, created_at, created_by
      FROM ${AUTH_TABLES.allowlistEmails}
      ORDER BY created_at DESC;
    `
  );
  return rows.map(mapEntry);
}

export async function addAllowlistEmail(
  email: string,
  createdBy: string | null,
  comment?: string | null
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("Email is required");
  await executeVoid(
    `
      DECLARE $email AS Utf8;
      DECLARE $source AS Utf8;
      DECLARE $comment AS Optional<Utf8>;
      DECLARE $created_at AS Timestamp;
      DECLARE $created_by AS Optional<Utf8>;

      UPSERT INTO ${AUTH_TABLES.allowlistEmails}
      (email, source, comment, created_at, created_by)
      VALUES
      ($email, $source, $comment, $created_at, $created_by);
    `,
    {
      $email: utf8(normalized),
      $source: utf8("manual"),
      $comment: optionalUtf8(comment ?? null),
      $created_at: timestamp(new Date()),
      $created_by: optionalUtf8(createdBy),
    }
  );
}

export async function removeAllowlistEmail(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  await executeVoid(
    `
      DECLARE $email AS Utf8;
      DELETE FROM ${AUTH_TABLES.allowlistEmails}
      WHERE email = $email;
    `,
    { $email: utf8(normalized) }
  );
}
