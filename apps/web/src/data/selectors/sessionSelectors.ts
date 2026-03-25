import { SnapshotV1 } from "@dtm/schema/snapshot";

import { AuthSessionState } from "../../auth/useAuthSession";

export type CurrentPersonLink = {
  personId: string | null;
  personName: string | null;
  matchedBy: "auth_link" | "auth_name" | "none";
};

function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

export function selectCurrentPersonLink(args: {
  authSession: AuthSessionState;
  snapshot: SnapshotV1 | null;
}): CurrentPersonLink {
  const personId = args.authSession.user?.personId ?? null;
  const personNameFromAuth =
    args.authSession.user?.personName?.trim() ??
    args.authSession.user?.displayName?.trim() ??
    null;
  if (!personId) {
    if (personNameFromAuth) {
      const normalizedAuthName = normalizeIdentity(personNameFromAuth);
      const matchedPerson =
        args.snapshot?.people.find((person) => person.name.trim() === personNameFromAuth) ??
        args.snapshot?.people.find((person) => person.name.trim().toLowerCase() === personNameFromAuth.toLowerCase()) ??
        args.snapshot?.people.find((person) => normalizeIdentity(person.name) === normalizedAuthName) ??
        null;
      if (matchedPerson) {
        return {
          personId: matchedPerson.id,
          personName: matchedPerson.name,
          matchedBy: "auth_name",
        };
      }
    }
    return {
      personId: null,
      personName: personNameFromAuth,
      matchedBy: "none",
    };
  }

  const personName =
    args.snapshot?.people.find((person) => person.id === personId)?.name ??
    personNameFromAuth ??
    null;

  return {
    personId,
    personName,
    matchedBy: "auth_link",
  };
}
