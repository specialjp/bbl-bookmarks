# Session 02 — frontend + ship (2026-08-15, same continuous session)

**Goal:** commits 18–28 — Vite scaffold through Docker, CI, GitHub push, final docs.

**Corrections made (full detail in WORKLOG.md):**

1. MUI v9 removed system props from components — `alignItems`/`justifyContent` on Stack and `fontWeight`/`whiteSpace` on Typography all fail typecheck; swept into `sx`.
2. New Vite template surprises: `erasableSyntaxOnly` forbids constructor parameter properties (ApiError rewritten); TS 6 deprecates `baseUrl` (paths made relative); template ships oxlint and vitest exits 1 with no test files (scripts adjusted).
3. Vitest hermeticity: `import.meta.env` values injected via the vite config test block so CI needs no .env; Auth0 module-mocked globally in setup.
4. The assignment's test password is literally `@password1234` — the first live login attempt with `password1234` failed silently (WORKLOG).

**Live verification (headless browser, real Auth0 tenant):** login → callback → /collections; the three seeded collections appeared under the live session (email-relink proof); "Shared with me" showed the pre-accepted Travel Plans with the read-only chip; `?q=postgresql` returned exactly one row — the user's own — while the other seeded user's identical-phrase bookmark stayed invisible (spec §3 in raw SQL, verified against real data). Docker path smoke-tested: SPA 200, /callback 200 via nginx try_files, /api/me 401 through both proxy and direct.

**Outcome:** 6 unit + 40 e2e + 13 FE tests green; images built; repo pushed to GitHub with CI.

**Raw log:** [`../raw/02-frontend-ship.jsonl`](../raw/02-frontend-ship.jsonl) (redacted; superset of earlier snapshots — one continuous session).
