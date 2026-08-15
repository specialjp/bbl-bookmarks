# /.agent — reusable agent capabilities

Capabilities genuinely used during this build. Each definition says when and why it is invoked.

## 1. `/api-contract-check` — contract drift detector (slash command)

- Canonical definition: [`api-contract-check.md`](api-contract-check.md)
- Claude Code stub: `.claude/commands/api-contract-check.md` (instructs the agent to read + follow the canonical file, so there is one source of truth).
- **When:** before every feature commit that touches `backend/src`.
- **Why:** API_DESIGN.md is written before the code; generated controllers drift (status codes, envelope, param names). Every drift it reports becomes a WORKLOG entry and, when the code is wrong, an honest un-squashed `fix(be):` commit. This command is what *produces* the "agent's first attempt was wrong" evidence in API_DESIGN.md §5.

## 2. Pre-commit hook — lint + typecheck + unit gate

- Definition: [`hooks/pre-commit.sh`](hooks/pre-commit.sh)
- Install (one-time, per clone): `git config core.hooksPath .agent/hooks`
- **When:** fires on every commit; checks whichever of /backend, /frontend has staged changes; no-ops for packages that don't exist yet or aren't touched.
- **Why:** keeps every commit green (the history is graded); cheaper than discovering breakage in CI.

## Considered and cut

A per-commit code-review subagent pass — cut because on a solo take-home it duplicates the contract check + pre-commit gate at high token cost, and documenting it as "genuinely used" would be performative.
