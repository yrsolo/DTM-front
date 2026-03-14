import { randomUUID } from "node:crypto";

import type { AuthUser, LinkedPersonRecord, UserRole, UserStatus, YandexProfile } from "../types";
import { AUTH_TABLES } from "./schema";
import { executeQuery, executeVoid, int32, optionalTimestamp, optionalUtf8, timestamp, utf8 } from "./query";
import { normalizeEmail } from "./normalization";
import { buildYandexAvatarUrl } from "../yandex/oauth";

type UserRow = {
  id: string;
  yandex_uid: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  person_id: string | null;
  person_name: string | null;
  telegram_id: string | null;
  telegram_username: string | null;
  status: UserStatus;
  role: UserRole;
  session_version: number;
  created_at: Date;
  last_login_at: Date | null;
};

function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    yandexUid: row.yandex_uid,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    personId: row.person_id,
    personName: row.person_name,
    telegramId: row.telegram_id,
    telegramUsername: row.telegram_username,
    status: row.status,
    role: row.role,
    sessionVersion: Number(row.session_version ?? 1),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    lastLoginAt:
      row.last_login_at instanceof Date ? row.last_login_at.toISOString() : row.last_login_at ? String(row.last_login_at) : null,
  };
}

export async function getUserByYandexUid(yandexUid: string): Promise<AuthUser | null> {
  const rows = await executeQuery<UserRow>(
    `
      DECLARE $yandex_uid AS Utf8;
      SELECT id, yandex_uid, email, display_name, avatar_url, person_id, person_name, telegram_id, telegram_username, status, role, session_version, created_at, last_login_at
      FROM ${AUTH_TABLES.users}
      WHERE yandex_uid = $yandex_uid
      LIMIT 1;
    `,
    { $yandex_uid: utf8(yandexUid) }
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const rows = await executeQuery<UserRow>(
    `
      DECLARE $id AS Utf8;
      SELECT id, yandex_uid, email, display_name, avatar_url, person_id, person_name, telegram_id, telegram_username, status, role, session_version, created_at, last_login_at
      FROM ${AUTH_TABLES.users}
      WHERE id = $id
      LIMIT 1;
    `,
    { $id: utf8(userId) }
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function listUsersByStatus(status?: UserStatus): Promise<AuthUser[]> {
  const predicate = status ? "WHERE status = $status" : "";
  const params = status ? ({ $status: utf8(status) } as const) : undefined;
  const rows = await executeQuery<UserRow>(
    `
      ${status ? "DECLARE $status AS Utf8;" : ""}
      SELECT id, yandex_uid, email, display_name, avatar_url, person_id, person_name, telegram_id, telegram_username, status, role, session_version, created_at, last_login_at
      FROM ${AUTH_TABLES.users}
      ${predicate}
      ORDER BY created_at DESC;
    `,
    params
  );
  return rows.map(mapUser);
}

export async function createUserFromProfile(
  profile: YandexProfile,
  status: UserStatus,
  role: UserRole
): Promise<AuthUser> {
  const id = randomUUID();
  const now = new Date();
  const email = normalizeEmail(profile.default_email);
  const displayName = profile.real_name?.trim() || profile.display_name?.trim() || profile.login?.trim() || null;
  const avatarUrl = buildYandexAvatarUrl(profile);
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $yandex_uid AS Utf8;
      DECLARE $email AS Optional<Utf8>;
      DECLARE $display_name AS Optional<Utf8>;
      DECLARE $avatar_url AS Optional<Utf8>;
      DECLARE $person_id AS Optional<Utf8>;
      DECLARE $person_name AS Optional<Utf8>;
      DECLARE $telegram_id AS Optional<Utf8>;
      DECLARE $telegram_username AS Optional<Utf8>;
      DECLARE $status AS Utf8;
      DECLARE $role AS Utf8;
      DECLARE $session_version AS Int32;
      DECLARE $created_at AS Timestamp;
      DECLARE $last_login_at AS Optional<Timestamp>;

      UPSERT INTO ${AUTH_TABLES.users}
      (id, yandex_uid, email, display_name, avatar_url, person_id, person_name, telegram_id, telegram_username, status, role, session_version, created_at, last_login_at)
      VALUES
      ($id, $yandex_uid, $email, $display_name, $avatar_url, $person_id, $person_name, $telegram_id, $telegram_username, $status, $role, $session_version, $created_at, $last_login_at);
    `,
    {
      $id: utf8(id),
      $yandex_uid: utf8(profile.id),
      $email: optionalUtf8(email),
      $display_name: optionalUtf8(displayName),
      $avatar_url: optionalUtf8(avatarUrl),
      $person_id: optionalUtf8(null),
      $person_name: optionalUtf8(null),
      $telegram_id: optionalUtf8(null),
      $telegram_username: optionalUtf8(null),
      $status: utf8(status),
      $role: utf8(role),
      $session_version: int32(1),
      $created_at: timestamp(now),
      $last_login_at: optionalTimestamp(null),
    }
  );
  const created = await getUserById(id);
  if (!created) throw new Error("User create verification failed");
  return created;
}

export async function touchUserLogin(userId: string): Promise<void> {
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $last_login_at AS Timestamp;
      UPSERT INTO ${AUTH_TABLES.users}
      SELECT id, yandex_uid, email, display_name, avatar_url, status, role, session_version, created_at, $last_login_at AS last_login_at
      FROM ${AUTH_TABLES.users}
      WHERE id = $id;
    `,
    {
      $id: utf8(userId),
      $last_login_at: timestamp(new Date()),
    }
  );
}

export async function syncUserProfile(userId: string, profile: YandexProfile): Promise<void> {
  const email = normalizeEmail(profile.default_email);
  const displayName = profile.real_name?.trim() || profile.display_name?.trim() || profile.login?.trim() || null;
  const avatarUrl = buildYandexAvatarUrl(profile);
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $email AS Optional<Utf8>;
      DECLARE $display_name AS Optional<Utf8>;
      DECLARE $avatar_url AS Optional<Utf8>;
      DECLARE $last_login_at AS Timestamp;

      UPSERT INTO ${AUTH_TABLES.users}
      SELECT
        id,
        yandex_uid,
        $email AS email,
        $display_name AS display_name,
        $avatar_url AS avatar_url,
        person_id,
        person_name,
        telegram_id,
        telegram_username,
        status,
        role,
        session_version,
        created_at,
        $last_login_at AS last_login_at
      FROM ${AUTH_TABLES.users}
      WHERE id = $id;
    `,
    {
      $id: utf8(userId),
      $email: optionalUtf8(email),
      $display_name: optionalUtf8(displayName),
      $avatar_url: optionalUtf8(avatarUrl),
      $last_login_at: timestamp(new Date()),
    }
  );
}

export async function setUserStatus(userId: string, status: UserStatus): Promise<void> {
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $status AS Utf8;

      UPSERT INTO ${AUTH_TABLES.users}
      SELECT
        id,
        yandex_uid,
        email,
        display_name,
        avatar_url,
        person_id,
        person_name,
        telegram_id,
        telegram_username,
        $status AS status,
        role,
        session_version,
        created_at,
        last_login_at
      FROM ${AUTH_TABLES.users}
      WHERE id = $id;
    `,
    {
      $id: utf8(userId),
      $status: utf8(status),
    }
  );
}

export async function approveUser(userId: string): Promise<void> {
  await setUserStatus(userId, "approved");
}

export async function incrementSessionVersion(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $session_version AS Int32;

      UPSERT INTO ${AUTH_TABLES.users}
      SELECT
        id,
        yandex_uid,
        email,
        display_name,
        avatar_url,
        person_id,
        person_name,
        telegram_id,
        telegram_username,
        status,
        role,
        $session_version AS session_version,
        created_at,
        last_login_at
      FROM ${AUTH_TABLES.users}
      WHERE id = $id;
    `,
    {
      $id: utf8(userId),
      $session_version: int32(user.sessionVersion + 1),
    }
  );
}

export async function upsertRole(userId: string, role: UserRole): Promise<void> {
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $role AS Utf8;

      UPSERT INTO ${AUTH_TABLES.users}
      SELECT
        id,
        yandex_uid,
        email,
        display_name,
        avatar_url,
        person_id,
        person_name,
        telegram_id,
        telegram_username,
        status,
        $role AS role,
        session_version,
        created_at,
        last_login_at
      FROM ${AUTH_TABLES.users}
      WHERE id = $id;
    `,
    {
      $id: utf8(userId),
      $role: utf8(role),
    }
  );
}

export async function linkUserToPerson(userId: string, linkedPerson: LinkedPersonRecord | null): Promise<void> {
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $person_id AS Optional<Utf8>;
      DECLARE $person_name AS Optional<Utf8>;
      DECLARE $telegram_id AS Optional<Utf8>;
      DECLARE $telegram_username AS Optional<Utf8>;

      UPSERT INTO ${AUTH_TABLES.users}
      SELECT
        id,
        yandex_uid,
        email,
        display_name,
        avatar_url,
        $person_id AS person_id,
        $person_name AS person_name,
        $telegram_id AS telegram_id,
        $telegram_username AS telegram_username,
        status,
        role,
        session_version,
        created_at,
        last_login_at
      FROM ${AUTH_TABLES.users}
      WHERE id = $id;
    `,
    {
      $id: utf8(userId),
      $person_id: optionalUtf8(linkedPerson?.personId ?? null),
      $person_name: optionalUtf8(linkedPerson?.personName ?? null),
      $telegram_id: optionalUtf8(linkedPerson?.telegramId ?? null),
      $telegram_username: optionalUtf8(linkedPerson?.telegramUsername ?? null),
    }
  );
}

export async function getUserByTelegramId(telegramId: string): Promise<AuthUser | null> {
  const rows = await executeQuery<UserRow>(
    `
      DECLARE $telegram_id AS Utf8;
      SELECT id, yandex_uid, email, display_name, avatar_url, person_id, person_name, telegram_id, telegram_username, status, role, session_version, created_at, last_login_at
      FROM ${AUTH_TABLES.users}
      WHERE telegram_id = $telegram_id
      LIMIT 1;
    `,
    { $telegram_id: utf8(telegramId) }
  );
  return rows[0] ? mapUser(rows[0]) : null;
}
