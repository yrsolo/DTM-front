export type Contour = "test" | "prod";

export type UserStatus = "pending" | "approved" | "blocked";
export type UserRole = "admin" | "viewer";
export type AccessMode = "masked" | "full";

export type SessionClaims = {
  userId: string;
  yandexUid: string;
  role: UserRole;
  status: UserStatus;
  sv: number;
  iat: number;
  exp: number;
};

export type AuthUser = {
  id: string;
  yandexUid: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  role: UserRole;
  sessionVersion: number;
  createdAt: string;
  lastLoginAt: string | null;
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
