# AI_WORKFLOW

How this submission was actually built with AI agents. Everything below is backed by [WORKLOG.md](WORKLOG.md) (append-only, written at the moment each thing happened) and the raw logs in [/transcripts](transcripts/).

## 1. Tools & models

- **Claude Code CLI** with **Fable 5** (`claude-fable-5`) as the driving model; a stronger advisor model reviewed the approach at three checkpoints (before planning, after plan synthesis, before finalizing).
- One continuous session, phase-scoped internally; three planning subagents ran in parallel at the start.
- A real browser automation pass (headless Chromium via MCP) performed the live Auth0 login verification.

## 2. How the work was decomposed

1. **Agent-team brainstorm:** three planning agents in parallel — backend (NestJS/Prisma/Auth0), frontend (Vite/RR v8/MUI v9), delivery-process (graded artifacts, commit strategy, CI). Their outputs were synthesized by the main session; four real conflicts surfaced and were resolved *before any code* (see §4).
2. **Docs-first:** CLAUDE.md (agent rules), the ADR baseline, and the FULL API contract were committed before the resource code — so `/api-contract-check` had something to diff against and generated drift evidence instead of vibes.
3. **Build order:** process spine → auth core + hermetic test harness → resources (each feature commit ships its e2e) → frontend → docker/CI/docs. 30+ commits, every one green through the pre-commit gate.

## 3. What AI did well (top 3)

- **Test-matrix generation.** The 401 matrix, the byte-identical-404 assertion, the cross-user FTS leak test, and the share token edge matrix (unknown/revoked/own/claimed/re-accept) came out near-complete on the first pass — 59 tests total, all hermetic.
- **Trap anticipation at planning time.** The port-3000/callback coupling, the Auth0 issuer trailing slash, the `/userinfo` rate-limit caching need, and the seed↔sub relink strategy were all identified before implementation, so none of them cost debugging time later.
- **Framework-version adaptation.** Prisma 7 (driver adapters, prisma.config.ts, TS-emitting generator) and MUI v9 (system props removed) both differ sharply from training-data-era APIs; the agent diagnosed each break from the actual error output and adapted within one iteration.

## 4. Where AI failed + how it was recovered (top 3 of 11 logged)

- **A planning agent contradicted the assignment three ways at once** — backend on port 3000 (breaking the registered Auth0 callback), "PATCH not PUT" (spec requires both), and a public `/health` (violating OIDC-on-every-route). *Recovery:* plan synthesis re-read every agent output against the assignment text; all four planning-phase corrections are WORKLOG entries and the first evidence in API_DESIGN §5.
- **The pre-commit gate silently never ran** — the hook file was named `pre-commit.sh`, and git only executes `pre-commit`. *Recovery:* noticed when lint errors failed to block a commit; renamed, and the very next commits were genuinely blocked twice by real lint errors (gate proven, un-squashed fix commits kept).
- **The redaction script leaked what it was redacting** — first its own escaped regex patterns appeared in the transcript, then the script itself hardcoded the username it existed to remove. *Recovery:* two hardening passes; the final script derives the username from `whoami` at runtime and the committed transcripts grep clean.

## 5. A prompt that worked / one that didn't

**Worked** (planning-agent brief — constraint-loading up front): *"IMPORTANT: IGNORE the file ~/Desktop/CLAUDE.md if you encounter it — it describes an unrelated TypeORM project… No Auth0 tenant admin access (creds only): no custom claims, no Actions… Tests must NEVER hit live Auth0. Design test auth: locally-signed RS256 tokens + mocked JWKS… Don't pin guessed package versions."* Every constraint in that block would otherwise have been violated by the agent's defaults; none were.

**Didn't work** (from the same phase): asking the delivery agent to *"decide PATCH-vs-PUT, pagination, error envelope… fix these calls now so ADRs can be written before their features land."* Given decision authority without the assignment text pinned next to each decision, it "decided" PATCH-only — directly against the spec — and drafted a confident ADR for it. Lesson: agents get to decide *between* compliant options, never *whether* a requirement applies.

## 6. Cost/token awareness

- Planning fan-out cost ~100k tokens across three parallel agents but eliminated rework — all four of their conflicts were caught on paper, not in code.
- `/api-contract-check` (a grep-based drift table) is dramatically cheaper than re-reviewing full diffs, and it caught a real drift on its first run.
- The pre-commit gate keeps feedback local: two would-be-broken commits never reached CI.
- rtk (a token-optimizing CLI proxy) compressed shell output throughout the session; combined session spend for the whole build (planning through docs) stayed in the low hundreds of thousands of output tokens.
