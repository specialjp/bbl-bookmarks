# Bookmarks & Collections

A take-home submission: bookmark manager with collections, Auth0 OIDC on every API route, and read-only collection sharing between signed-in users.

- **/backend** — NestJS + TypeScript + Prisma + PostgreSQL (port 3001, prefix `/api`)
- **/frontend** — Vite + React + TypeScript, React Router ≥ v8, MUI ≥ v9 (port 3000)
- Process artifacts: [CLAUDE.md](CLAUDE.md) · [API_DESIGN.md](API_DESIGN.md) · [DECISIONS.md](DECISIONS.md) · [AI_WORKFLOW.md](AI_WORKFLOW.md) · [WORKLOG.md](WORKLOG.md) · [/transcripts](transcripts/) · [/.agent](.agent/)

## Quickstart

> Filled in as the build lands. Placeholder — final version at the end of the build.

```bash
node -v                      # >= 22.22 required (React Router v8 engines)
docker compose up -d db
cd backend && cp .env.example .env && npm ci && npx prisma migrate dev && npx prisma db seed && npm run start:dev
cd frontend && cp .env.example .env && npm ci && npm run dev
# open http://localhost:3000 — log in with the assignment's test user
```

Test user: `candidate@test.com` / `password1234` (assignment-provided Auth0 test account).

## Running tests

> Placeholder — exact commands confirmed as suites land.

```bash
cd backend && npm test && npm run test:e2e   # e2e needs the DB up; NEVER touches live Auth0
cd frontend && npm test
```

## Why the ACCESS token (not the ID token) is sent to the API

The access token is minted **for the API** (`aud: https://bbl-candidate-test-api`) — it is an authorization credential the API is supposed to validate. The ID token's audience is the SPA's client ID; it is proof of authentication for the client itself, not a credential for calling APIs, and an API validating it would be accepting a token addressed to someone else. See ADR-005.

## Collection delete behaviour — needs PO clarification

The spec says only "A user can delete a collection." We chose: deleting a collection keeps its bookmarks and makes them *uncategorised* (`onDelete: SetNull`) — the least destructive reading. Cascade-deleting the bookmarks is the plausible alternative. **This needs clarification from the product owner**; the current behaviour is documented in ADR-008 and trivially switchable in one migration.

## Sharing model

"A user may want to share a collection with someone else" is under-specified. We chose: **signed-in users only, read-only** — the owner mints a share token, the recipient (authenticated) redeems it and can view the collection and its bookmarks but cannot modify anything. This keeps "OIDC authentication on every route" literally true (no public link route) and keeps the privacy story simple. Editable shares and public links were consciously traded away. See ADR-009.

## Completed vs skipped

> Filled at the end of the build.
