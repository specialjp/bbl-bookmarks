# DECISIONS — Architecture Decision Records

Short ADRs for every ambiguity the spec left open. **This file is authoritative over agent defaults** (see CLAUDE.md). Template:

```markdown
## ADR-NNN: <title>            (accepted, YYYY-MM-DD)
**Context:** the ambiguity or fork actually hit.
**Decision:** one sentence.
**Traded away:** what the rejected option would have bought.
**How the agent was steered:** the agent's default vs the constraint that overrode it.
```

---

## ADR-001: Plain two-package repo, no npm workspaces (accepted, 2026-08-15)

**Context:** monorepo with /backend and /frontend; workspaces vs independent packages.
**Decision:** independent package.json + lockfile per app; root package.json holds only `concurrently` convenience scripts.
**Traded away:** single `npm install`, shared dev-dep versions.
**How the agent was steered:** planning agents defaulted to workspaces; overruled because hoisting complicates the per-app Dockerfile bonus (each image does `COPY` + `npm ci` against its own lockfile) and per-package CI caching, and there is zero shared code to justify the tooling.

## ADR-002: Error envelope = NestJS default (accepted, 2026-08-15)

**Context:** custom error envelope vs framework default.
**Decision:** keep Nest's `{ statusCode, message, error }` (with `message: string[]` for validation), document it in API_DESIGN.md.
**Traded away:** bespoke error codes/shapes.
**How the agent was steered:** one planning agent proposed a custom global exception filter; rejected — custom envelope adds surface without signal for this scope. Documented > invented.

## ADR-003: PUT full-replace AND PATCH partial (accepted, 2026-08-15)

**Context:** assignment explicitly requires both `update (PUT)` and `patch (PATCH)`; a planning agent tried to drop PUT.
**Decision:** both verbs on both resources. PUT validates the full representation (omitted optional fields become `null`); PATCH = `PartialType` partial update.
**Traded away:** a single simpler update path.
**How the agent was steered:** WORKLOG 2026-08-15 — caught in plan review against the assignment text; the "PATCH not PUT" ADR the agent drafted was rejected.

## ADR-004: Page-based pagination (accepted, 2026-08-15)

**Context:** list endpoints need pagination; page/limit vs cursor.
**Decision:** `?page=&limit=` (limit ≤ 100), response `{ data, meta: { page, limit, total, totalPages } }`.
**Traded away:** cursor stability under concurrent writes (irrelevant at this scale); the FE gets "page X of Y" for free.
**How the agent was steered:** stated in CLAUDE.md hard constraints so scaffolded list endpoints follow it.

## ADR-005: SPA sends the access token, never the ID token (accepted, 2026-08-15)

**Context:** two tokens come back from Auth0; which one authenticates API calls.
**Decision:** access token with `aud: https://bbl-candidate-test-api`; the API validates issuer + audience + RS256 signature via JWKS.
**Traded away:** the ID token's ready-made profile claims (email/name) — the API resolves profile via `/userinfo` instead (ADR-006).
**How the agent was steered:** requirement fixed by the user up front; encoded in CLAUDE.md; the FE never reads `getIdTokenClaims()` for API calls.

## ADR-006: User provisioning via /userinfo + email-keyed upsert (accepted, 2026-08-15)

**Context:** with an `audience`, Auth0 issues plain access tokens carrying only `sub` — no email/profile. We have **no tenant admin access**, so custom claims (Actions) and the Management API are unavailable. Separately, seed data needs `ownerId`s, but the real test user's `sub` is unknowable until first login.
**Decision:** on first sight of an unknown `sub`, call `GET /userinfo` with the presented bearer (scope `openid profile email` covers it), then upsert **keyed by email**: a seeded row with that email gets its placeholder `sub` replaced (same row id — all seeded data instantly belongs to the live session); otherwise create. Cache `sub → user` in-process so `/userinfo` is hit once per unknown sub per process (Auth0 rate-limits it ~5 req/min/user). Users get internal cuid PKs precisely so this relink is a one-column update.
**Traded away:** custom-claims simplicity (blocked anyway); multi-instance cache coherence (irrelevant here).
**How the agent was steered:** a planning agent initially reached for the Auth0 Management API; overruled in the plan — creds-only access was made an explicit constraint in every agent brief.

## ADR-010: Test auth = locally-signed RS256 + mocked JWKS (accepted, 2026-08-15)

**Context:** every route requires a valid Auth0 access token; tests must be hermetic and CI must hold zero Auth0 secrets.
**Decision:** e2e tests generate an RS256 keypair (jose), serve its JWK via nock at the JWKS URL, sign tokens locally, and call `nock.disableNetConnect()` (allowing 127.0.0.1) so any accidental live Auth0 call is a hard failure. `AUTH0_JWKS_URI` is its own env var so tests repoint it without touching strategy code. This exercises the **real** jwks-rsa verification path (kid lookup, caching, issuer/audience checks).
**Traded away:** live-integration confidence (covered by manual login flow); an HS256 test shortcut was rejected because it bypasses the exact code being proven.
**How the agent was steered:** CLAUDE.md hard constraint 7 — "tests NEVER hit live Auth0"; the auth choice (passport-jwt + jwks-rsa over jose's `createRemoteJWKSet`) was itself made because nock can intercept Node's classic http stack but not undici fetch.

## ADR-012: No /health endpoint (accepted, 2026-08-15)

**Context:** "OIDC authentication on every route" vs the convention of a public liveness probe.
**Decision:** take the requirement literally — no `@Public()` decorator exists in the codebase, so an accidentally public endpoint is unrepresentable; there is no /health. Liveness is container-level (`pg_isready` healthcheck on the db service; process supervision for the API).
**Traded away:** HTTP-level orchestrator probes.
**How the agent was steered:** a planning agent scaffolded /health by default (WORKLOG 2026-08-15); removed during plan synthesis and encoded as CLAUDE.md hard constraint 1.

## ADR-013: AUTH0_ISSUER keeps its trailing slash (accepted, 2026-08-15)

**Context:** Auth0 mints `iss: "https://<tenant>/"` — with a trailing slash. Configuring the issuer without it makes every token fail validation with an unhelpful 401 (a classic integration bug).
**Decision:** `AUTH0_ISSUER=https://dev-yg.us.auth0.com/`, documented in .env.example; the e2e 401 matrix includes a wrong-issuer case (issuer *without* the slash) to pin the behaviour.
**Traded away:** nothing — this is a correctness pin.
**How the agent was steered:** encoded in .env.example comment + a dedicated e2e case so a "cleanup" that strips the slash fails loudly.

## ADR-011: FTS via generated tsvector + GIN in a raw-SQL migration (accepted, 2026-08-15)

**Context:** the full-text-search bonus needs Postgres FTS over bookmark title+notes; Prisma offers a `fullTextSearch` preview flag, and `ILIKE` was the lazy alternative.
**Decision:** hand-edited migration adds a `GENERATED ALWAYS … STORED` tsvector column + GIN index; queries use `$queryRaw` with `websearch_to_tsquery` (tolerates arbitrary user input) and `ts_rank` ordering. The schema carries `Unsupported("tsvector")?` so `migrate dev` never drops the column.
**Traded away:** the preview flag's ORM-level ergonomics — its API has shifted across Prisma majors and gives no control over index type or ranking. `ILIKE` rejected: not FTS, no ranking, table scans.
**How the agent was steered:** the generated controller path never sees the raw SQL; the one raw query's explicit `"ownerId" = ${userId}` predicate is called out in CLAUDE.md-adjacent docs and pinned by a dedicated cross-user e2e (user B owns a bookmark with the exact search phrase — it must never surface for user A).

## ADR-007: Cross-user access returns 404, never 403 (accepted, 2026-08-15)

**Context:** spec §3 — "if user A can … even *learn of the existence of* user B's data, the app is broken." A 403 on someone else's id confirms the resource exists.
**Decision:** one failure path: every lookup is a scoped `findFirst`/`updateMany`/`deleteMany` carrying `ownerId` (or the share-grant OR-clause on reads); zero rows → `NotFoundException`. Cross-user and nonexistent are byte-identical 404s — the e2e suites assert body equality against a ghost id.
**Traded away:** debuggability of "it exists but isn't yours" (irrelevant — that distinction IS the leak).
**How the agent was steered:** generated CRUD tends to `findUnique` + ForbiddenException; CLAUDE.md hard constraint 2 + the body-equality e2e make the wrong pattern fail loudly.

## ADR-008: Collection delete → bookmarks become uncategorised (accepted, 2026-08-15)

**Context:** PO spec says only "A user can delete a collection" — silent on the bookmarks inside it.
**Decision:** `onDelete: SetNull` — bookmarks survive with `collectionId = null` and appear under `?uncategorised=true`. Least destructive reading; switchable in one migration. Flagged **needs PO clarification** in README.
**Traded away:** cascade-delete's "clean slate" semantics — plausible, destructive, unconfirmed.
**How the agent was steered:** decision fixed pre-implementation in the schema (`SetNull`), pinned by the survivor e2e test.

## ADR-009: Sharing = signed-in users only, read-only, single-use invite token (accepted, 2026-08-15)

**Context:** §3.3 "A user may want to share a collection with someone else" collides with "OIDC on every route" and the §3 privacy invariant. A public link means an unauthenticated route; editable shares multiply the invariant's failure modes.
**Decision (user's call):** owner mints an unguessable token (`POST /collections/:id/shares`, shown once); the recipient must be signed in and `POST /shares/accept` binds them as the single grantee. Grantees get GET-only access to the collection + its bookmarks; revocation is soft and immediate. Read-only is **structural**: write queries are owner-scoped, so a grantee's write 404s exactly like a stranger's — there is no role check to forget.
**Traded away:** public-link virality (violates the route rule); multi-use links (weaker audit story); editable shares (scope + invariant risk).
**How the agent was steered:** the FE planning agent defaulted to a public `GET /shared/:token` — caught in synthesis (WORKLOG 2026-08-15) and realigned to the accept-flow before any code existed.

## ADR-014: Share tokens stored raw, not hashed (accepted, 2026-08-15)

**Context:** invite tokens are credentials; at-rest hashing is the production-grade posture.
**Decision:** store raw. 32 random bytes, single-use, read-only scope, soft-revocable, local demo database — hashing buys little here and costs a lookup-by-hash indirection.
**Traded away:** defense against DB-dump token replay. Documented as the known hardening gap to fix first in production.
**How the agent was steered:** explicit ADR so a future "security cleanup" session upgrades it deliberately rather than ad hoc.
