import { randomUUID } from "node:crypto";

import { executeQuery, executeVoid, optionalUtf8, timestamp, utf8 } from "./query";
import { AUTH_TABLES } from "./schema";

export type AccessRequestRecord = {
  id: string;
  userId: string;
  email: string | null;
  state: "open" | "approved" | "rejected" | "closed";
  requestedAt: string;
  note: string | null;
};

type AccessRequestRow = {
  id: string;
  user_id: string;
  email: string | null;
  state: "open" | "approved" | "rejected" | "closed";
  requested_at: Date;
  note: string | null;
};

function mapRecord(row: AccessRequestRow): AccessRequestRecord {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    state: row.state,
    requestedAt: row.requested_at instanceof Date ? row.requested_at.toISOString() : String(row.requested_at),
    note: row.note,
  };
}

export async function ensureOpenAccessRequest(userId: string, email: string | null): Promise<void> {
  const existing = await executeQuery<AccessRequestRow>(
    `
      DECLARE $user_id AS Utf8;
      SELECT id, user_id, email, state, requested_at, note
      FROM ${AUTH_TABLES.accessRequests}
      WHERE user_id = $user_id AND state = "open"
      LIMIT 1;
    `,
    { $user_id: utf8(userId) }
  );
  if (existing[0]) return;

  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $user_id AS Utf8;
      DECLARE $email AS Optional<Utf8>;
      DECLARE $state AS Utf8;
      DECLARE $requested_at AS Timestamp;
      DECLARE $note AS Optional<Utf8>;

      UPSERT INTO ${AUTH_TABLES.accessRequests}
      (id, user_id, email, state, requested_at, note)
      VALUES
      ($id, $user_id, $email, $state, $requested_at, $note);
    `,
    {
      $id: utf8(randomUUID()),
      $user_id: utf8(userId),
      $email: optionalUtf8(email),
      $state: utf8("open"),
      $requested_at: timestamp(new Date()),
      $note: optionalUtf8(null),
    }
  );
}

export async function closeAccessRequestsForUser(
  userId: string,
  nextState: "approved" | "rejected" | "closed"
): Promise<void> {
  const requests = await executeQuery<AccessRequestRow>(
    `
      DECLARE $user_id AS Utf8;
      SELECT id, user_id, email, state, requested_at, note
      FROM ${AUTH_TABLES.accessRequests}
      WHERE user_id = $user_id AND state = "open";
    `,
    { $user_id: utf8(userId) }
  );

  for (const request of requests) {
    await executeVoid(
      `
        DECLARE $id AS Utf8;
        DECLARE $state AS Utf8;

        UPSERT INTO ${AUTH_TABLES.accessRequests}
        SELECT id, user_id, email, $state AS state, requested_at, note
        FROM ${AUTH_TABLES.accessRequests}
        WHERE id = $id;
      `,
      {
        $id: utf8(request.id),
        $state: utf8(nextState),
      }
    );
  }
}

export async function listOpenAccessRequests(): Promise<AccessRequestRecord[]> {
  const rows = await executeQuery<AccessRequestRow>(
    `
      SELECT id, user_id, email, state, requested_at, note
      FROM ${AUTH_TABLES.accessRequests}
      WHERE state = "open"
      ORDER BY requested_at DESC;
    `
  );
  return rows.map(mapRecord);
}

export async function listAccessRequests(): Promise<AccessRequestRecord[]> {
  const rows = await executeQuery<AccessRequestRow>(
    `
      SELECT id, user_id, email, state, requested_at, note
      FROM ${AUTH_TABLES.accessRequests}
      ORDER BY requested_at DESC;
    `
  );
  return rows.map(mapRecord);
}
