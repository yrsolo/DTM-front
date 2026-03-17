export type Contour = "test" | "prod";

export type UserStatus = "pending" | "approved" | "blocked";
export type UserRole = "admin" | "viewer";
export type AccessMode = "masked" | "full";
export type SessionKind = "yandex" | "telegram" | "temp_link";
export type AccessLinkStatus = "active" | "expired" | "revoked";

export type UserSessionClaims = {
  kind?: "user";
  provider?: Exclude<SessionKind, "temp_link">;
  userId: string;
  yandexUid: string;
  role: UserRole;
  status: UserStatus;
  sv: number;
  iat: number;
  exp: number;
};

export type TempLinkSessionClaims = {
  kind: "temp_link";
  linkId: string;
  iat: number;
  exp: number;
};

export type SessionClaims = UserSessionClaims | TempLinkSessionClaims;

export type AuthUser = {
  id: string;
  yandexUid: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  personId: string | null;
  personName: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  canViewAllTasks: boolean;
  status: UserStatus;
  role: UserRole;
  sessionVersion: number;
  createdAt: string;
  lastLoginAt: string | null;
};

export type SessionUser = AuthUser & {
  sessionKind: SessionKind;
  expiresAt: string | null;
  temporaryAccessLabel: string | null;
  sourceAccessLinkId?: string | null;
};

export type AccessLinkRecord = {
  id: string;
  label: string;
  tokenHash: string;
  status: AccessLinkStatus;
  expiresAt: string;
  createdAt: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  useCount: number;
};

export type AccessLinkUsageRecord = {
  id: string;
  linkId: string;
  usedAt: string;
  ip: string | null;
  city: string | null;
  clientSummary: string | null;
};

export type NormalizedRequest = {
  method: string;
  originalPath: string;
  routePath: string;
  contour: Contour;
  routeKind: "auth" | "api";
  headers: Record<string, string>;
  query: URLSearchParams;
  bodyText: string;
  bodyBytes: Uint8Array | null;
  isBase64Encoded: boolean;
  requestId: string;
  origin: string;
};

export type HttpResult = {
  statusCode: number;
  headers?: Record<string, string>;
  multiValueHeaders?: Record<string, string[]>;
  body?: string;
  isBase64Encoded?: boolean;
};

export type YandexProfile = {
  id: string;
  default_email?: string;
  real_name?: string;
  display_name?: string;
  login?: string;
  default_avatar_id?: string;
  is_avatar_empty?: boolean;
};

export type LinkedPersonRecord = {
  personId: string;
  personName: string | null;
  email: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
};
