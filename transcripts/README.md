# /transcripts — real agent session logs

Raw Claude Code session logs (`raw/NN-<phase>.jsonl`, redacted) plus a per-session markdown summary (`sessions/NN-<phase>.md`: goal, key prompts, corrections, outcome). Messy parts and dead ends are **intentionally retained** — that is the point of this directory.

## Redaction policy

`redact.sh` (committed, mechanical — reviewers can audit the policy) removes:

- Auth0 tenant domain, SPA client ID, API audience URL. The SPA client ID is public by design; it is redacted anyway — redaction discipline is a default, not a judgment call per value.
- Anything shaped like a JWT (`eyJ…`).
- Email addresses and `/Users/<name>` home paths.

Snapshots land at milestones: `00-planning` (agent-team brainstorm), `01-backend`, `02-frontend/polish`.
