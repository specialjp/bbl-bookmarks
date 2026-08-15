# Session 00 — planning (2026-08-15)

**Goal:** turn the assignment brief into an approved implementation plan using a parallel agent team.

**How it ran:** three planning agents launched concurrently — backend (NestJS/Prisma/Auth0), frontend (Vite/RR v8/MUI v9/auth0-react), delivery-process (graded artifacts, commit strategy, CI). An advisor model reviewed the approach before and after. Their outputs were synthesized into one plan; the human locked four decisions up front (Postgres+compose, GitHub Actions, signed-in-only read-only sharing, all four bonuses).

**Corrections made during synthesis** (also in WORKLOG.md):

1. Delivery agent put the backend on port 3000 / FE on 5173 — would have broken the registered Auth0 callback. Fixed: FE 3000 strictPort, BE 3001.
2. Delivery agent dropped PUT ("PATCH not PUT") — assignment requires both. Fixed: both, PUT = full replace.
3. Delivery agent added a public /health — violates "OIDC on every route". Dropped (ADR-012).
4. Frontend agent assumed a public `GET /shared/:token` — violates the signed-in-only sharing decision. Realigned to authenticated `POST /shares/accept`.

**Advisor catches:** planning-session transcript must be snapshotted NOW (this file); `useRefreshTokensFallback: true` (tenant refresh-grant unverifiable without admin access); pre-commit hook must no-op before packages exist; Node floor is 22.22 not 22.

**Outcome:** plan approved; user added one requirement post-plan — snackbar notifications on every frontend mutation (success + error).

**Raw log:** [`../raw/00-planning.jsonl`](../raw/00-planning.jsonl) (redacted; includes the messy parts — a first redaction pass leaked its own escaped regex patterns and was fixed).
