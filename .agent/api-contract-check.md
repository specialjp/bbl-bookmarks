# /api-contract-check — API contract drift detector

**When:** before every feature commit touching `backend/src`.
**Why:** API_DESIGN.md was written before the code; generated controllers drift (status codes, envelope, params, verbs). Drift caught here becomes WORKLOG evidence and honest fix commits.

## Instructions (for the agent executing this command)

1. Read `API_DESIGN.md`. Extract every documented route: verb + path, success status code, list/filter/pagination params, error behaviours (401/404/409), request/response shapes.
2. Inspect the implementation: grep `backend/src/**/*.controller.ts` for `@Get/@Post/@Put/@Patch/@Delete/@HttpCode`, controller path prefixes, and `backend/src/**/dto/*.ts` for `@Query`/body DTO fields and validation decorators; note exception types thrown in the services.
3. Report a table: `route | documented | implemented | DRIFT?`. For each drift, state which side is wrong (code vs doc) and why.
4. Do **NOT** auto-fix. The human decides: fix code (→ `fix(be):` commit) or fix doc (→ `docs(api):` commit). Either way, append the drift to `WORKLOG.md`.

## Evidence of use

Run before the collections feature commit (2026-08-15):

```
route                              | documented                       | implemented                        | DRIFT?
GET  /me                           | 200 local row                    | 200 local row                      | ok
GET  /collections                  | ?name= contains-ci, paginated    | matches                            | ok
GET  /collections/shared-with-me   | before /:id, paginated           | declared first, paginated          | ok
POST /collections                  | 201 {name}                       | 201, DTO {name} only               | ok
GET  /collections/:id              | owner OR grantee, else 404       | readableWhere -> findFirst -> 404  | ok
PUT  /collections/:id              | full replace, owner only         | CreateCollectionDto, updateMany    | ok
PATCH /collections/:id             | partial, owner only              | PartialType, updateMany            | ok
DELETE /collections/:id            | 204, owner only, SetNull         | @HttpCode(204), deleteMany scoped  | ok
GET  /collections/:id/bookmarks    | pagination params ONLY           | accepted ?name= (QueryCollections  | DRIFT — code wrong:
                                   |                                  | Dto reused), silently ignored      | undocumented param accepted
POST /collections/:id/shares       | 201 mint                         | not yet implemented (commit 15)    | pending, on plan
/bookmarks*, /shares*              | documented                       | not yet implemented (13–15)        | pending, on plan
```

Resolution: code fixed (nested route now takes the bare `PaginationDto`), logged in WORKLOG; contract unchanged.
