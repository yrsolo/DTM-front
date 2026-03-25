export type Contour = "test" | "prod";

export type UserStatus = "pending" | "approved" | "blocked";
export type UserRole = "admin" | "viewer";
export type AccessMode = "masked" | "full";
export type SessionKind = "yandex" | "telegram" | "temp_link" | "dev_local";
export type AuthProvider = "yandex" | "telegram";
export type AccessLinkStatus = "active" | "expired" | "revoked";
export type DeveloperTokenStatus = "active" | "expired" | "revoked";

export type UserSessionClaims = {
  kind?: "user";
  provider?: AuthProvider;
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

export type DevLocalSessionClaims =
  | {
      kind: "dev_local";
      personaKind: "real_user";
      userId: string;
      sv: number;
      iat: number;
      exp: number;
    }
  | {
      kind: "dev_local";
      personaKind: "synthetic_blocked";
      label: string;
      iat: number;
      exp: number;
    };

export type SessionClaims = UserSessionClaims | TempLinkSessionClaims | DevLocalSessionClaims;

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
  canUseDesignerGrouping: boolean;
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
  showDesignerGrouping: boolean;
};

export type AccessLinkUsageRecord = {
  id: string;
  linkId: string;
  usedAt: string;
  ip: string | null;
  city: string | null;
  clientSummary: string | null;
};

export type DeveloperTokenRecord = {
  id: string;
  label: string;
  tokenHash: string;
  status: DeveloperTokenStatus;
  expiresAt: string;
  createdAt: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  useCount: number;
};

export type DeveloperTokenUsageRecord = {
  id: string;
  developerTokenId: string;
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
