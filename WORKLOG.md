# WORKLOG — append-only, real time

Every time an agent's output was wrong and got corrected, one entry lands here **in the same change**. Distilled into API_DESIGN.md "Corrections" + AI_WORKFLOW.md at the end. Format:

```
YYYY-MM-DD | what the agent did wrong | how it was caught | fix (commit)
```

---

2026-08-15 | Delivery-planning agent put the backend on port 3000 and frontend on 5173 — would have broken the registered Auth0 callback (http://localhost:3000/callback belongs to the SPA) | cross-checked against assignment's Auth0 config during plan synthesis | plan corrected: FE 3000 strictPort, BE 3001
2026-08-15 | Same agent dropped PUT ("PATCH not PUT") despite assignment explicitly requiring both update (PUT) and patch (PATCH) | plan review against assignment text | plan corrected: both verbs, PUT = full replace
2026-08-15 | Same agent added a public /health endpoint, violating "OIDC authentication on every route" | conflict with backend agent's no-@Public design during synthesis | dropped /health; container-level checks instead (ADR-012)
2026-08-15 | Frontend-planning agent assumed a public GET /shared/:token contract — violates the signed-in-only sharing decision | reconciliation against locked decision #3 | share flow realigned to authenticated POST /shares/accept
2026-08-15 | Pre-commit hook file was named `pre-commit.sh` — git only executes hooks named exactly `pre-commit`, so the gate silently never fired | lint errors failed to block a commit; investigated why | renamed to .agent/hooks/pre-commit (fix commit after e7fe960)
2026-08-15 | Adding prisma.config.ts (Prisma 7) at the package root made `nest build` compile it, nesting output into dist/src/ and breaking `node dist/main` | dist inspection after build | excluded prisma.config.ts + prisma/ in tsconfig.build.json; dist/** added to eslint ignores
2026-08-15 | PrismaService used the classic `extends PrismaClient` + bare super() pattern — Prisma 7's generated client has no bundled engine and throws at construction without a driver adapter | boot smoke test crashed with "Pass a driver adapter to the PrismaClient constructor" | @prisma/adapter-pg wired through ConfigService (commit with auth stack)
2026-08-15 | Assumed the test password was "password1234" (reading the assignment's "@" as a separator) — Auth0 rejected it silently | live browser login attempt during end-to-end verification | password is literally "@password1234"; README warns about the leading @
2026-08-15 | Generated collections controller reused QueryCollectionsDto on GET /collections/:id/bookmarks — an undocumented ?name= param was accepted and silently ignored, drifting from API_DESIGN | /api-contract-check before the feature commit | nested route switched to bare PaginationDto (collections commit)
2026-08-15 | First collections e2e run: POSTs 500'd after the first test — UsersService's sub->userId cache outlived truncation while user rows got new ids (test-only staleness; prod never deletes users) | e2e failures | fixtures use fixed user ids; noted inline in the spec
2026-08-15 | Test harness was written with jose for token signing — jose v6 is ESM-only and jwks-rsa 4.x also require()s it, which Node 22 handles but jest's CJS sandbox cannot | first e2e run failed with "Unexpected token 'export'" in two places | signing rewritten on node:crypto (zero deps); jose transformed through ts-jest via transformIgnorePatterns for the jwks-rsa chain
