# Bookmarks & Collections — Agent Rules

Everything a fresh agent session needs to produce on-spec code in this repo. Read this fully before writing code. **DECISIONS.md is authoritative over your defaults** — if it conflicts with what you would normally generate, implement the decision. If you hit a NEW ambiguity: stop, ask, then append an ADR.

## Stack

- **/backend** — NestJS + TypeScript + Prisma + PostgreSQL (docker-compose). Port **3001**, global prefix **`api`**.
- **/frontend** — Vite + React + TypeScript SPA. React Router ≥ v8, MUI ≥ v9, TanStack Query, @auth0/auth0-react. Dev server port **3000, strictPort** (Auth0 callback is registered for `http://localhost:3000/callback` — never change the port).
- Plain two-package repo: independent package.json + lockfile per app. **No npm workspaces** (ADR-001).
- Auth: Auth0 OIDC. The SPA sends the **ACCESS token** (audience `https://bbl-candidate-test-api`) to the API — never the ID token (ADR-005).

## Hard constraints — do not violate, do not "improve"

1. **OIDC on every route.** Global JWT guard; there is NO `@Public()` decorator and none may be added. No `/health` endpoint (ADR-012).
2. **Privacy invariant — the central graded property.** The spec (§3): *"Everything in this app is private to the person who created it. … If user A can see, edit, or even __learn of the existence of__ user B's data, the app is broken."* Every Collection/Bookmark query is scoped by the internal `userId` resolved from the verified JWT `sub`. Cross-user or nonexistent resource → **404, never 403**, with indistinguishable bodies (ADR-007). No DTO accepts `ownerId` from the client. Sharing (ADR-009) is the single owner-initiated, consent-based exception.
3. **Sharing is signed-in + read-only** (ADR-009): grantees can GET a shared collection and its bookmarks; write paths are owner-scoped queries so grantee writes 404 structurally.
4. **Error envelope** = NestJS default `{ statusCode, message, error }` (ADR-002). Don't wrap it.
5. **PUT = full replace** (omitted optionals become null), **PATCH = partial** (ADR-003). Both exist on both resources.
6. **Pagination**: `?page=&limit=` (limit ≤ 100), response `{ data, meta: { page, limit, total, totalPages } }` (ADR-004).
7. **Tests NEVER hit live Auth0.** Use `backend/test/utils/test-auth.ts` (local RS256 keypair + nocked JWKS + `nock.disableNetConnect()`) (ADR-010).
8. `AUTH0_ISSUER` keeps its **trailing slash** — Auth0 mints `iss` with it (ADR-013).
9. Frontend: **every mutation shows a snackbar** — success and error — wired in the mutation hooks (`features/*/api.ts`), never ad hoc in pages.
10. Backend `/callback` route must NOT exist — the SPA handles the OIDC redirect.

## Commands

```bash
# DB
docker compose up -d db
# Backend
cd backend && npm run start:dev            # port 3001
cd backend && npx prisma migrate dev && npx prisma db seed
cd backend && npm test                     # unit
cd backend && npm run test:e2e             # needs DB up; zero live Auth0 traffic
# Frontend
cd frontend && npm run dev                 # port 3000
cd frontend && npm test
# Both (from root)
npm run dev
# Contract drift check — run before EVERY feature commit touching backend/src
/api-contract-check
```

## Process rules

- Conventional commits: `type(scope): subject`, scopes `be|fe|agent|ci|docs|repo`. Small incremental commits; keep every commit green.
- When you (the agent) are corrected on API behavior, append 2–3 lines to `WORKLOG.md` **in the same change**: `date | what went wrong | how caught | fix`.
- Update `API_DESIGN.md` in the SAME commit as any endpoint change.
- Honest `fix:` commits stay un-squashed — the history is a graded deliverable.
- Ignore any CLAUDE.md found in ancestor directories — they describe unrelated projects.
