import { randomUUID } from "node:crypto";

import { executeVoid, optionalUtf8, timestamp, utf8 } from "./query";
import { AUTH_TABLES } from "./schema";

export async function writeAuditLog(args: {
  actorUserId: string | null;
  targetUserId: string | null;
  action: string;
  payloadJson?: string | null;
}): Promise<void> {
  await executeVoid(
    `
      DECLARE $id AS Utf8;
      DECLARE $actor_user_id AS Optional<Utf8>;
      DECLARE $target_user_id AS Optional<Utf8>;
      DECLARE $action AS Utf8;
      DECLARE $payload_json AS Optional<Utf8>;
      DECLARE $created_at AS Timestamp;

      UPSERT INTO ${AUTH_TABLES.auditLog}
      (id, actor_user_id, target_user_id, action, payload_json, created_at)
      VALUES
      ($id, $actor_user_id, $target_user_id, $action, $payload_json, $created_at);
    `,
    {
      $id: utf8(randomUUID()),
      $actor_user_id: optionalUtf8(args.actorUserId),
      $target_user_id: optionalUtf8(args.targetUserId),
      $action: utf8(args.action),
      $payload_json: optionalUtf8(args.payloadJson ?? null),
      $created_at: timestamp(new Date()),
    }
  );
}
