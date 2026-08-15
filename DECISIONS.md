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

<!-- ADR-006..014 land with their feature commits, per plan. -->
