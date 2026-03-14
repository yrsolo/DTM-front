import { SnapshotV1 } from "@dtm/schema/snapshot";

import { AuthSessionState } from "../../auth/useAuthSession";

export type CurrentPersonLink = {
  personId: string | null;
  personName: string | null;
  matchedBy: "auth_link" | "none";
};

export function selectCurrentPersonLink(args: {
  authSession: AuthSessionState;
  snapshot: SnapshotV1 | null;
}): CurrentPersonLink {
  const personId = args.authSession.user?.personId ?? null;
  if (!personId) {
    return {
      personId: null,
      personName: null,
      matchedBy: "none",
    };
  }

  const personName =
    args.snapshot?.people.find((person) => person.id === personId)?.name ??
    args.authSession.user?.personName ??
    null;

  return {
    personId,
    personName,
    matchedBy: "auth_link",
  };
}
