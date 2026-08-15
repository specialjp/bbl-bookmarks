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
