# API_DESIGN — Contract

The authoritative API contract. Written **before** the resource implementations; `/api-contract-check` (see [/.agent](.agent/)) diffs the code against this file before every feature commit, and every drift becomes a WORKLOG entry.

## 1. Conventions

- Base URL: `http://localhost:3001/api`
- Auth: `Authorization: Bearer <Auth0 ACCESS token>` on **every** route. Audience `https://bbl-candidate-test-api`, issuer `https://dev-yg.us.auth0.com/`, RS256 via JWKS. No public routes exist.
- Error envelope (NestJS default, ADR-002): `{ "statusCode": number, "message": string | string[], "error": string }`
- Pagination (ADR-004): request `?page=1&limit=20` (limit ≤ 100); response `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }`
- PUT = full replace (omitted optionals → null) · PATCH = partial (ADR-003)
- Timestamps: ISO-8601 UTC.

## 2. Resources & routes

> Skeleton — full contract lands as `docs(api)` before resource implementation (v1), refined only via documented drift decisions.

## 3. Relations & on-delete

- Bookmark *belongs to* Collection (nullable — uncategorised) — `onDelete: SetNull` (ADR-008, PO note in README).
- Both belong to a User. Share → Collection: cascade.

## 4. Privacy invariant — how it is enforced in code

> Filled with concrete file/line references once the guard + services land.

## 5. Corrections — where the agent's first attempt was wrong

> 2–3 entries distilled from WORKLOG.md at the end of the build, with commit hashes.
