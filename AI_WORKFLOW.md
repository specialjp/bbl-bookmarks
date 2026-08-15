# AI_WORKFLOW

How this submission was actually built with AI agents. 1–2 pages, distilled from [WORKLOG.md](WORKLOG.md) and [/transcripts](transcripts/) at the end of the build; skeleton committed up front so sections accrete in real time instead of being reconstructed.

## 1. Tools & models

- Claude Code CLI, model Fable 5 (`claude-fable-5`), single operator.
- Session roster: see /transcripts/sessions/.

## 2. How the work was decomposed

- Planning: a 3-agent brainstorm team (backend / frontend / delivery-process) ran in parallel; their outputs were synthesized with four real conflicts resolved (see WORKLOG 2026-08-15 entries).
- Build: phase-scoped sessions mirroring the commit sequence; API_DESIGN.md written *before* CRUD so drift had a baseline.

## 3. What AI did well (2–3)

> accreted during build

## 4. Where AI failed + recovery (2–3)

> accreted during build, from WORKLOG — planning phase already produced four candidates (port swap, dropped PUT, public /health, public share route).

## 5. A prompt that worked / one that didn't

> captured verbatim during build

## 6. Cost/token awareness

> filled at end: sessions kept phase-scoped; contract-check cheaper than full-diff re-review; rough figures per phase.
