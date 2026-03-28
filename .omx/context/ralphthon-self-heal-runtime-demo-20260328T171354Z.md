# Context Snapshot: ralphthon-self-heal-runtime-demo

- Timestamp (UTC): 20260328T171354Z
- Task slug: ralphthon-self-heal-runtime-demo
- Context type: greenfield

## Task statement
Interview the user to lock a tiny Ralphthon product/spec for a same-repo project with two parts: `packages/self-heal-runtime` and `apps/demo`.

## Desired outcome
An execution-ready spec for a 3-hour autonomous build of a self-healing runtime demo.

## Stated solution
- Reusable runtime library in `packages/self-heal-runtime`
- Demo app in `apps/demo`
- Runtime injected into demo app
- One seeded runtime error caught by runtime
- Polished healing UX
- Backend calls OpenAI API for a patch
- Client applies returned patch and visibly recovers

## Probable intent hypothesis
The user wants a very small but compelling demo that makes client-side self-healing tangible in under a minute without expanding into production concerns.

## Known facts / evidence
- Repo currently appears greenfield for this project.
- `packages/self-heal-runtime/` does not exist yet.
- `apps/demo/` does not exist yet.
- No existing app/runtime implementation files were found.
- Non-negotiable constraints provided by user:
  - same repo, separate directories
  - keep scope tiny
  - one seeded demo failure only
  - one clear happy-path recovery only
  - no auth
  - no database
  - no external vendor integrations besides OpenAI API
  - must be demoable in under 1 minute at a science-fair table
  - must be finishable autonomously in 3 hours
  - do not expand scope

## Constraints
- Interview only for now; no implementation
- Ask one focused question at a time
- Remove ambiguity before execution handoff

## Unknowns / open questions
- Exact audience-facing demo story
- Precise healing UX sequence
- Demo app type and UI complexity
- Where the backend lives and how minimal it should be
- Patch format and what “apply patch on client” concretely means
- Which runtime error is seeded and how recovery is shown
- Acceptance criteria and out-of-scope boundaries beyond the listed constraints

## Decision-boundary unknowns
- Which implementation choices Codex may decide autonomously during the 3-hour build
- Which technical tradeoffs must be preserved for the demo story

## Likely codebase touchpoints
- `packages/self-heal-runtime/`
- `apps/demo/`
- shared workspace config at repo root
- minimal backend endpoint for OpenAI-mediated patch generation
