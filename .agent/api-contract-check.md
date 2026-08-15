# /api-contract-check — API contract drift detector

**When:** before every feature commit touching `backend/src`.
**Why:** API_DESIGN.md was written before the code; generated controllers drift (status codes, envelope, params, verbs). Drift caught here becomes WORKLOG evidence and honest fix commits.

## Instructions (for the agent executing this command)

1. Read `API_DESIGN.md`. Extract every documented route: verb + path, success status code, list/filter/pagination params, error behaviours (401/404/409), request/response shapes.
2. Inspect the implementation: grep `backend/src/**/*.controller.ts` for `@Get/@Post/@Put/@Patch/@Delete/@HttpCode`, controller path prefixes, and `backend/src/**/dto/*.ts` for `@Query`/body DTO fields and validation decorators; note exception types thrown in the services.
3. Report a table: `route | documented | implemented | DRIFT?`. For each drift, state which side is wrong (code vs doc) and why.
4. Do **NOT** auto-fix. The human decides: fix code (→ `fix(be):` commit) or fix doc (→ `docs(api):` commit). Either way, append the drift to `WORKLOG.md`.

## Evidence of use

> One real invocation output is pasted here during the build.
