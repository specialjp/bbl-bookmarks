# Bookmarks & Collections

A take-home submission: personal bookmark manager with collections, Auth0 OIDC on **every** API route, and consent-based read-only collection sharing between signed-in users.

> Spec §3, the property everything here is built around: *"Everything in this app is private to the person who created it. If user A can see, edit, or even learn of the existence of user B's data, the app is broken."*

- **/backend** — NestJS 11 + TypeScript + Prisma 7 + PostgreSQL (port 3001, prefix `/api`)
- **/frontend** — Vite 8 + React 19 + TypeScript, **react-router 8.3.0** (spec ≥ v8 ✓), **@mui/material 9.3.1** (spec ≥ v9 ✓), TanStack Query 5, @auth0/auth0-react 2.24 (port 3000)
- Process artifacts (all graded): [CLAUDE.md](CLAUDE.md) · [API_DESIGN.md](API_DESIGN.md) · [DECISIONS.md](DECISIONS.md) · [AI_WORKFLOW.md](AI_WORKFLOW.md) · [WORKLOG.md](WORKLOG.md) · [/transcripts](transcripts/) · [/.agent](.agent/)

## Quickstart (dev)

Prereqs: Node ≥ 22.22 (`.nvmrc`), Docker.

```bash
docker compose up -d db

cd backend
cp .env.example .env
npm ci
npx prisma migrate dev
npx prisma db seed
npm run start:dev            # http://localhost:3001/api

# second terminal
cd frontend
cp .env.example .env         # ships the assignment's PUBLIC SPA values
npm ci
npm run dev                  # http://localhost:3000  (strictPort — the Auth0 callback is registered here)
```

Or all-Docker **dev** (hot reload, source bind-mounted — no build step):

```bash
docker compose up            # db + backend (nest --watch) on :3001 + Vite dev server on :3000
```

First start is slow (`npm install` inside the containers); restarts are fast. If file
watching doesn't fire through the bind mount, add `CHOKIDAR_USEPOLLING=true` to the
service environment.

> ⚠️ macOS: if the repo lives under `~/Desktop`, `~/Documents`, or `~/Downloads`, the
> bind mounts fail with `EPERM: operation not permitted` until you grant your Docker
> provider (Docker Desktop / OrbStack) **Files and Folders** access to that folder in
> System Settings → Privacy & Security. Image builds are unaffected — only the dev
> stack's bind mounts hit this.

Or the **production** stack (built images, self-migrating API, nginx-served SPA):

```bash
docker compose -f docker-compose.prod.yml up --build    # SPA on :3000, API on :3001
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

Dev and prod use separate compose project names, so they never share containers or
the database volume (ADR-016).

**Log in as the assignment's test user:** `candidate@test.com` / `@password1234`
(⚠️ the leading `@` is part of the password — `password1234` fails silently; verified against the live tenant.)

On first login you'll immediately see seeded data: the seed plants this user by **email** with a placeholder Auth0 `sub`, and the API relinks the row to the real `sub` on first sight (same row id → all seeded collections, bookmarks, and one "shared with me" collection are yours instantly). See ADR-006. A second seeded user (`other@test.com`) never logs in — their private data existing-but-invisible is what the privacy tests prove.

## Running the tests

```bash
# backend — 6 unit + 40 e2e (needs the db container up; e2e uses its own bookmarks_test database)
cd backend && npm test && npm run test:e2e

# frontend — 19 vitest/RTL/MSW tests
cd frontend && npm test
```

**No test ever contacts live Auth0.** The e2e harness signs its own RS256 tokens and serves a mocked JWKS via nock; `nock.disableNetConnect()` turns any accidental live call into a hard failure (ADR-010). CI (GitHub Actions) runs exactly these suites against a Postgres service container, with zero Auth0 secrets.

What is deliberately **not** tested (and why): live Auth0 integration (non-hermetic; the verification *code path* is fully exercised via the mocked JWKS, and the login flow was verified manually in a real browser); Prisma/Nest internals (vendor code — the behavioural outcomes like SetNull are e2e-tested instead); controllers as units (pure delegation; the HTTP contract is the e2e surface); MUI rendering internals and snapshot tests (brittle, low signal); frontend E2E via Playwright (cost/benefit on a take-home — component tests + the manual browser pass cover the flows).

## Why the ACCESS token (not the ID token) is sent to the API

The access token is minted **for the API** — `aud: https://bbl-candidate-test-api` — and is the credential the resource server is supposed to validate (issuer + audience + RS256 signature via JWKS). The ID token's audience is the SPA's own client ID: it is proof of authentication *for the client*, not an authorization credential; an API accepting it would be accepting a token addressed to someone else. Because the tenant issues audience-bound access tokens with only a `sub` claim (no custom claims without tenant admin access), the API resolves profile data once per user via `/userinfo` and provisions a local row. See ADR-005/006.

## Collection delete behaviour — ⚠️ needs PO clarification

The spec says only "A user can delete a collection" — silent about the bookmarks inside. We chose the least destructive reading: **bookmarks survive and become uncategorised** (`onDelete: SetNull`, pinned by an e2e test). Cascade-delete is the plausible alternative and is a one-migration switch. Flagged for the product owner in ADR-008; the delete confirmation dialog states the behaviour explicitly.

## Sharing model (§3.3)

"A user may want to share a collection with someone else" is under-specified, and it collides with both "OIDC on every route" and the §3 privacy invariant. Decision: **signed-in users only, read-only, revocable** — the owner creates a single-use **share link** (shown exactly once); the recipient opens it, signs in with their own account, and the app redeems it automatically, landing them on the collection with read-only access to it and its bookmarks. Read-only is *structural*: write queries are owner-scoped, so a grantee's write attempt 404s exactly like a stranger's. The link targets a **guarded SPA route** — no public API route exists, so every endpoint stays behind OIDC (the link is delivery, not semantics; ADR-015). If the owner opens their own link (you, grader, with the single test account), the app recognises it and takes them to their collection instead of erroring. Traded away: public-link virality and editable shares. See ADR-009/015; token-at-rest hashing is a documented hardening gap (ADR-014).

## Completed vs skipped

| Item | Status |
|---|---|
| §3.1 API: /collections + /bookmarks (get one, list, create, PUT, PATCH, delete, filtering) | ✅ done, e2e-tested |
| §3.1 `/me` + user provisioning | ✅ done (ADR-006 relink strategy) |
| §3.1 `GET /collections/:id/bookmarks` | ✅ done |
| §3.1 SQL persistence via Prisma on every route; seed with two distinct users | ✅ done (Prisma 7 + Postgres 16) |
| §3.2 React+Vite+TS, RR ≥8, MUI ≥9, /collections + /bookmarks pages | ✅ done (versions above) |
| §3.3 sharing | ✅ done — signed-in, read-only (see above) |
| Privacy invariant | ✅ 404-never-403 with byte-identical bodies, owner-scoped writes, cross-user FTS e2e |
| Bonus: Dockerfile backend + frontend | ✅ done (self-migrating API, nginx SPA with /callback fallback) |
| Bonus: CI/CD | ✅ GitHub Actions — lint, typecheck, unit, hermetic e2e on a Postgres service, docker builds |
| Bonus: /all page | ✅ done (client-side composition — no invented backend contract) |
| Bonus: full-text search | ✅ Postgres tsvector + GIN, `?q=` ranked, cross-user-leak e2e |
| Share management UI (list/revoke issued shares) | ⏭️ backend-only — `GET /shares` + `DELETE /shares/:id` (revoke) are fully e2e-tested; the FE page was omitted for scope (mint + redeem UIs exist) |
| Frontend E2E (Playwright) | ⏭️ skipped — component tests + manual browser verification instead (see test section) |
| Share-token hashing at rest, rate limiting, refresh-token rotation hardening | ⏭️ skipped — documented production gaps (ADR-014) |
| PUT on collections vs bookmarks asymmetry | ℹ️ PUT exists on both; collections' only writable field is `name`, so PUT/PATCH converge there |

## Pointers

Contract: [API_DESIGN.md](API_DESIGN.md) (includes "where the agent's first attempt was wrong") · Decisions: [DECISIONS.md](DECISIONS.md) (ADR-001..014) · Process: [AI_WORKFLOW.md](AI_WORKFLOW.md) + [WORKLOG.md](WORKLOG.md) + [/transcripts](transcripts/) · Agent capabilities: [/.agent](.agent/)
