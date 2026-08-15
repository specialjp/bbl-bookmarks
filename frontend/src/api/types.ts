// Mirrors the backend contract in API_DESIGN.md. Deliberately duplicated
// rather than a shared package (DECISIONS: ~5 interfaces don't justify
// workspace tooling); backend DTOs/entities are the source of truth.

export interface Me {
  id: string;
  sub: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  ownerId: string;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  notes: string | null;
  collectionId: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Share {
  id: string;
  collectionId: string;
  granteeUserId: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/** Returned once, at mint — the only time the token is visible. */
export interface MintedShare extends Share {
  token: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** NestJS default error envelope (ADR-002). */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
