# PRD — Ralphthon Self-Heal Runtime Demo

## Metadata
- Source spec: `.omx/specs/deep-interview-ralphthon-self-heal-runtime-demo.md`
- Consensus plan: `.omx/plans/ralplan-deep-interview-self-heal-runtime-demo.md`
- Status: approved for execution handoff

## Problem
We need a tiny, credible Ralphthon demo that shows a normal app suffering a real manually introduced runtime bug, then recovering through an injected self-heal runtime without pretending to be production-safe or framework-agnostic.

## Product shape
The repo must contain exactly two product parts:
1. `packages/self-heal-runtime` — reusable but intentionally narrow JavaScript/TypeScript self-healing runtime library
2. `apps/demo` — normal demo app that consumes the runtime library and also hosts the tiny backend patch endpoint

## Goals
- Demo healthy -> broken -> healed in under 60 seconds
- Keep scope to one seeded interaction failure and one happy-path recovery
- Show a real manual bad edit and refresh
- Inject the runtime via URL flag rather than making the runtime the app itself
- Apply the heal in memory on the client only
- Keep end-user UX benign and friendly during healing

## Non-goals
- Persistent source-code rewriting
- Multi-error healing
- Framework-agnostic runtime claims
- Production-grade safety guarantees
- Auth, database, or non-OpenAI third-party integrations
- Complex dashboards or admin tooling

## Chosen implementation
- Workspace: npm workspaces + TypeScript
- Demo app: Vite + React in `apps/demo`
- Backend: tiny Node server inside `apps/demo/server`
- Runtime package: React-oriented action wrapper + in-memory patch registry in `packages/self-heal-runtime`
- Interaction: single-field `Save note` flow

## User and operator story
### End user story
A user enters text into a note form and clicks save. If self-healing is enabled and the targeted runtime error occurs, the user sees a brief friendly loading state and then the note appears successfully.

### Operator story
1. Start the demo with one command
2. Open the healthy URL
3. Save a note successfully
4. Edit one known line in `apps/demo/src/features/note/actions/createNoteAction.ts`
5. Refresh and show that only the save interaction now fails
6. Open the same app with `?selfHeal=1`
7. Save again and show automatic in-memory healing plus success

## Exact interaction
- Healthy behavior: submit text, append one visible note card
- Seeded failure: change `text.trim()` to `text.trimmed()` in `createNoteAction.ts`
- Broken behavior: submit causes a real runtime failure for `create-note`, adds no note card, but the page shell stays mounted and usable
- Healed behavior: runtime catches the failure, requests a patch, installs it in memory, retries once automatically, and the note card appears

## Runtime/app boundaries
### `packages/self-heal-runtime` owns
- URL-flag detection
- action wrapper/executor
- recovery request client contract
- patch registry
- patch validation/evaluation helpers
- single retry orchestration
- fail-closed behavior

### `apps/demo` owns
- note domain types and note action
- UI components and healing/loading presentation
- broken-path containment
- action hints/snippets
- operator log / diagnostics
- backend route and patch-provider selection
- OpenAI prompt construction
- dev-server wiring

### Must not live in runtime package
- React components
- note-specific state
- backend/OpenAI prompt text
- file-system or source rewriting logic
- app routes
- generalized multi-error orchestration

## Patched action contract
```ts
type CreateNoteAction = (input: { text: string }) => Promise<{ note: { id: string; text: string } }>;
```
- Patched action id: `create-note`
- UI state remains outside the patchable function
- Retry only once per failed submission

## Patch payload contract
```ts
type PatchPayload = {
  actionId: 'create-note';
  version: 1;
  format: 'function-body';
  functionBody: string;
  rationale?: string;
};
```
- Validate on both server and client
- Compile in narrowly scoped evaluator
- Installed body must resolve to the same promise/result shape as `CreateNoteAction`
- Fail closed on invalid schema, compile failure, retry failure, or missing real-provider credentials

## Patch-provider seam
- Manual/demo runs use the real OpenAI-backed provider
- Automated tests use a deterministic stub provider via injection or env switch
- No silent fallback from real provider to stub in manual/demo mode

## UX requirements
- No raw error UI in the healing path
- No “your code broke” messaging to the end user
- Friendly loading copy such as “Saving your note…”
- Operator-visible diagnostics are allowed but secondary

## Planned files
- Root: `package.json`, `tsconfig.base.json`
- Demo app: `apps/demo/index.html`, `apps/demo/vite.config.ts`, `apps/demo/src/main.tsx`, `apps/demo/src/App.tsx`
- Note flow: `apps/demo/src/features/note/components/NoteForm.tsx`, `apps/demo/src/features/note/actions/createNoteAction.ts`, `apps/demo/src/features/note/types.ts`, `apps/demo/src/features/note/components/HealingStatus.tsx`
- Runtime integration: `packages/self-heal-runtime/src/index.ts`, `packages/self-heal-runtime/src/runtime.ts`, `packages/self-heal-runtime/src/patch-registry.ts`, `packages/self-heal-runtime/src/types.ts`, `packages/self-heal-runtime/src/url-flag.ts`, `apps/demo/src/self-heal/runtimeClient.ts`, `apps/demo/src/self-heal/actionHints.ts`, `apps/demo/src/self-heal/operatorLog.ts`
- Backend: `apps/demo/server/index.ts`, `apps/demo/server/openaiPatchRoute.ts`, `apps/demo/server/patchProvider.ts`, `apps/demo/server/prompt.ts`, `apps/demo/server/patchSchema.ts`
- Docs: `apps/demo/README.md`

## Acceptance criteria
1. Repo contains `packages/self-heal-runtime` and `apps/demo`
2. Demo app consumes runtime as a separate package
3. Healthy note save works without `?selfHeal=1`
4. Manual bad edit plus refresh breaks only the `create-note` interaction
5. With `?selfHeal=1`, runtime intercepts the failure and requests recovery context
6. Backend patch endpoint exists in `apps/demo` and uses real OpenAI provider for manual/demo runs
7. Automated tests can use a deterministic non-live patch provider
8. Patch installs in memory only and never rewrites source
9. Same interaction auto-retries exactly once after patch install
10. Friendly loading UX appears during healing
11. Healed submit produces the expected note card
12. Broken source file remains broken on disk after healing
13. Scripted demo completes in under 60 seconds with dev servers already running

## Risks and mitigations
- Free-form AI output -> constrain schema and validate strictly
- Dynamic patch install brittleness -> patch one action only with tiny typed contract
- Test flakiness -> deterministic stub patch provider for tests
- Demo/operator drift -> copy-pasteable README with exact URLs and one-line break edit
- Whole-page failure -> keep error containment scoped to the wrapped interaction

## Execution handoff guidance
- Recommended `$ralph` lanes:
  - `executor` high
  - `test-engineer` medium
  - `verifier` or `architect` medium/high
  - optional `debugger` high
- Recommended `$team` lanes:
  - delivery (`executor`, high)
  - tests/demo timing (`test-engineer`, medium)
  - verification/sign-off (`verifier` or `architect`, medium/high)
