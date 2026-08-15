# API_DESIGN — Contract

The authoritative API contract, written **before** the resource implementations; `/api-contract-check` (see [/.agent](.agent/)) diffs the code against this file before every feature commit, and every drift becomes a WORKLOG entry.

## 1. Conventions

- Base URL: `http://localhost:3001/api`
- Auth: `Authorization: Bearer <Auth0 ACCESS token>` on **every** route. Audience `https://bbl-candidate-test-api`, issuer `https://dev-yg.us.auth0.com/` (trailing slash, ADR-013), RS256 via JWKS. No public routes exist (ADR-012).
- Error envelope (NestJS default, ADR-002): `{ "statusCode": number, "message": string | string[], "error": string }`. Validation failures use `message: string[]`.
- Pagination (ADR-004): request `?page=1&limit=20`, `1 ≤ limit ≤ 100` (values outside are rejected 400); response `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }`.
- PUT = full replace — the complete representation is required; omitted optional fields become `null`. PATCH = partial (ADR-003).
- Timestamps ISO-8601 UTC. IDs are cuids (strings).
- Unknown body fields → 400 (`forbidNonWhitelisted`).

## 2. Resources & routes

### Users

| Verb | Path | Success | Notes |
|---|---|---|---|
| GET | `/me` | 200 | Current user's local row: `{ id, sub, email, name, createdAt, updatedAt }`. First sight of a sub provisions via Auth0 `/userinfo` (ADR-006). |

### Collections

Representation: `{ id, name, ownerId, createdAt, updatedAt }`; list/detail items additionally carry `isOwner: boolean` (defense-in-depth flag for the FE's read-only rendering).

| Verb | Path | Success | Notes |
|---|---|---|---|
| GET | `/collections` | 200 | Own collections. Filters: `?name=` (contains, case-insensitive). Paginated. |
| GET | `/collections/shared-with-me` | 200 | Collections where the caller is an active (non-revoked) grantee. Paginated. Declared before `/:id` to avoid route shadowing. |
| POST | `/collections` | 201 | Body `{ name }`. |
| GET | `/collections/:id` | 200 | Owner **or** active grantee. Otherwise/nonexistent → 404. |
| PUT | `/collections/:id` | 200 | Full replace `{ name }`. Owner only — grantee/stranger → 404. |
| PATCH | `/collections/:id` | 200 | Partial `{ name? }`. Owner only → else 404. |
| DELETE | `/collections/:id` | 204 | Owner only → else 404. Bookmarks survive with `collectionId = null` (ADR-008). |
| GET | `/collections/:id/bookmarks` | 200 | Bookmarks of that collection. Owner **or** active grantee. Paginated. |
| POST | `/collections/:id/shares` | 201 | Owner mints a single-use invite; response `{ id, token, collectionId, createdAt }` — the only time the token is returned (ADR-009/014). Non-owner → 404. |

### Bookmarks

Representation: `{ id, url, title, notes, collectionId, ownerId, createdAt, updatedAt }` (`notes`, `collectionId` nullable).

| Verb | Path | Success | Notes |
|---|---|---|---|
| GET | `/bookmarks` | 200 | Own bookmarks. Filters: `?collectionId=<id>`, `?uncategorised=true` (collectionId IS NULL), `?q=<text>` full-text over title+notes ranked by relevance (ADR-011). Filters combine. Paginated. |
| POST | `/bookmarks` | 201 | Body `{ url, title, notes?, collectionId? }`. `url` must include protocol. A given `collectionId` must resolve to an **owned** collection, else 404 (no cross-user attach; shared collections are read-only). |
| GET | `/bookmarks/:id` | 200 | Owner only → else 404. |
| PUT | `/bookmarks/:id` | 200 | Full replace `{ url, title, notes?, collectionId? }` — omitted optionals become null. Owner only. |
| PATCH | `/bookmarks/:id` | 200 | Partial. Owner only. |
| DELETE | `/bookmarks/:id` | 204 | Owner only. |

### Shares (ADR-009: signed-in only, read-only, single-use invite)

Representation: `{ id, collectionId, granteeUserId, createdAt, revokedAt }` (token never echoed after minting).

| Verb | Path | Success | Notes |
|---|---|---|---|
| GET | `/shares` | 200 | Shares the caller has issued, incl. claimed/revoked state. Paginated. |
| DELETE | `/shares/:id` | 204 | Issuer revokes (soft, `revokedAt`); access is cut immediately. Non-issuer → 404. |
| POST | `/shares/accept` | 200 | Body `{ token }`. Binds the caller as grantee. Unknown/revoked token → 404. Own token → 400. Already claimed by someone else → 409. Re-accept by the same user → 200 (idempotent). Grantees gain read-only GET access to the collection + its bookmarks. |

## 3. Relations & on-delete

- Bookmark *belongs to* Collection (nullable — uncategorised). **Collection delete → `SetNull`**: bookmarks survive as uncategorised (ADR-008; "needs PO clarification" note in README).
- Collection/Bookmark *belong to* User (cascade — user deletion is not exposed via the API; integrity only).
- CollectionShare → Collection cascade; unique `(collectionId, granteeUserId)`.

## 4. Privacy invariant — how it is enforced in code

> Spec §3: *"Everything in this app is private to the person who created it. There is no public content, no shared feed, no 'browse other users.' If user A can see, edit, or even __learn of the existence of__ user B's data, the app is broken."* Sharing (§3.3, ADR-009) is the single owner-initiated exception — read-only, consent-based, revocable.

- The global `JwtAuthGuard` (APP_GUARD, `backend/src/auth/auth.module.ts`) resolves the verified JWT `sub` to an **internal** `userId` (`backend/src/users/users.service.ts`); controllers receive it via `@CurrentUser()`. No route escapes the guard — there is no `@Public()` decorator in the codebase (ADR-012).
- Every service query is scoped: reads use `where: { id, OR: [{ ownerId: userId }, { shares: { some: { granteeUserId: userId, revokedAt: null } } }] }` (collections) or `where: { id, ownerId: userId }`; **writes always use `{ id, ownerId: userId }`** — a grantee's write finds no row, so read-only sharing is structural, not a role check.
- One failure path: scoped `findFirst` → `null` → `NotFoundException`. Cross-user and nonexistent are **indistinguishable 404s** (ADR-007) by construction.
- No DTO accepts `ownerId`; `forbidNonWhitelisted` rejects attempts with 400.
- The single raw-SQL query (FTS, ADR-011) carries an explicit `"ownerId" = ${userId}` predicate and has a dedicated cross-user e2e test.

## 5. Corrections — where the agent's first attempt was wrong

> 2–3 entries distilled from WORKLOG.md at the end of the build, with commit hashes.
