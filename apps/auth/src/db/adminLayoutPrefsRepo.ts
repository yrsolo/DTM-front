import { AUTH_TABLES } from "./schema";
import { executeQuery, executeVoid, optionalUtf8, timestamp, utf8 } from "./query";

export type AdminLayoutListKey = "pendingUsers" | "approvedUsers" | "colorPresets" | "layoutPresets";

export type AdminLayoutPrefs = {
  pendingUsers: string[];
  approvedUsers: string[];
  colorPresets: string[];
  layoutPresets: string[];
  updatedAt: string | null;
};

type AdminLayoutPrefsRow = {
  admin_user_id: string;
  pending_users_order: string | null;
  approved_users_order: string | null;
  color_presets_order: string | null;
  layout_presets_order: string | null;
  updated_at: Date | null;
};

function parseOrder(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

function serializeOrder(ids: string[]): string {
  return JSON.stringify(ids);
}

function mapPrefs(row: AdminLayoutPrefsRow | undefined): AdminLayoutPrefs | null {
  if (!row) return null;
  return {
    pendingUsers: parseOrder(row.pending_users_order),
    approvedUsers: parseOrder(row.approved_users_order),
    colorPresets: parseOrder(row.color_presets_order),
    layoutPresets: parseOrder(row.layout_presets_order),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : null,
  };
}

export async function getAdminLayoutPrefs(adminUserId: string): Promise<AdminLayoutPrefs | null> {
  const rows = await executeQuery<AdminLayoutPrefsRow>(
    `
      DECLARE $admin_user_id AS Utf8;
      SELECT admin_user_id, pending_users_order, approved_users_order, color_presets_order, layout_presets_order, updated_at
      FROM ${AUTH_TABLES.adminLayoutPrefs}
      WHERE admin_user_id = $admin_user_id
      LIMIT 1;
    `,
    { $admin_user_id: utf8(adminUserId) }
  );
  return mapPrefs(rows[0]);
}

export async function saveAdminLayoutOrder(
  adminUserId: string,
  list: AdminLayoutListKey,
  ids: string[]
): Promise<AdminLayoutPrefs> {
  const current =
    (await getAdminLayoutPrefs(adminUserId)) ?? {
      pendingUsers: [],
      approvedUsers: [],
      colorPresets: [],
      layoutPresets: [],
      updatedAt: null,
    };

  const next: AdminLayoutPrefs = {
    ...current,
    [list]: ids,
    updatedAt: new Date().toISOString(),
  };

  await executeVoid(
    `
      DECLARE $admin_user_id AS Utf8;
      DECLARE $pending_users_order AS Optional<Utf8>;
      DECLARE $approved_users_order AS Optional<Utf8>;
      DECLARE $color_presets_order AS Optional<Utf8>;
      DECLARE $layout_presets_order AS Optional<Utf8>;
      DECLARE $updated_at AS Timestamp;

      UPSERT INTO ${AUTH_TABLES.adminLayoutPrefs}
      (admin_user_id, pending_users_order, approved_users_order, color_presets_order, layout_presets_order, updated_at)
      VALUES
      ($admin_user_id, $pending_users_order, $approved_users_order, $color_presets_order, $layout_presets_order, $updated_at);
    `,
    {
      $admin_user_id: utf8(adminUserId),
      $pending_users_order: optionalUtf8(serializeOrder(next.pendingUsers)),
      $approved_users_order: optionalUtf8(serializeOrder(next.approvedUsers)),
      $color_presets_order: optionalUtf8(serializeOrder(next.colorPresets)),
      $layout_presets_order: optionalUtf8(serializeOrder(next.layoutPresets)),
      $updated_at: timestamp(new Date()),
    }
  );

  return next;
}
