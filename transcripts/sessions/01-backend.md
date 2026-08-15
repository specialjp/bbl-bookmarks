# Session 01 — backend build (2026-08-15, same session as planning)

**Goal:** commits 5–17 — Nest scaffold through shares + seed, every commit green, e2e-first.

**Key prompts:** feature work was driven by the plan file + CLAUDE.md constraints; `/api-contract-check` invoked before the collections commit (its output is pasted in `/.agent/api-contract-check.md`).

**Corrections made (full detail in WORKLOG.md):**

1. Pre-commit hook never fired — file was named `pre-commit.sh`; git wants exactly `pre-commit`. Found when lint errors failed to block a commit.
2. `prisma.config.ts` (Prisma 7) got compiled by `nest build`, nesting output into `dist/src/` and breaking `node dist/main`.
3. Prisma 7 requires a driver adapter — the classic `extends PrismaClient` pattern crashed at boot; fixed with `@prisma/adapter-pg`.
4. jose v6 is ESM-only — broke jest twice (direct import + inside jwks-rsa); token signing rewritten on `node:crypto`, jose transformed via ts-jest for the jwks-rsa chain.
5. `/api-contract-check` caught the nested bookmarks route accepting an undocumented `?name=` param.
6. Collections e2e 500s: the sub→userId in-process cache outlived table truncation (test-only staleness); fixtures moved to fixed ids.
7. The hook BLOCKED two commits on real lint errors (untyped `res.body`, unused destructure vars) — gate working as designed.
8. Redaction script itself leaked: first its own escaped regex patterns, then it hardcoded the username it was meant to hide — now derives the name from `whoami` at runtime.

**Outcome:** 40 e2e + 6 unit tests green, hermetic (zero live Auth0). Privacy invariant pinned by body-identical-404 and cross-user-FTS tests.

**Raw log:** [`../raw/01-backend.jsonl`](../raw/01-backend.jsonl) (redacted; superset of the planning snapshot — same continuous session).
