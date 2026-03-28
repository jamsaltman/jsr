# Test Spec — Ralphthon Self-Heal Runtime Demo

## Metadata
- Source spec: `.omx/specs/deep-interview-ralphthon-self-heal-runtime-demo.md`
- Approved plan: `.omx/plans/ralplan-deep-interview-self-heal-runtime-demo.md`
- Status: approved for execution handoff

## Test strategy
Use the smallest proof set that locks the demo story:
- runtime unit test for patch install + single retry
- app integration test for healthy / broken / healed flow
- optional browser smoke pass for the live OpenAI-backed path
- manual timed operator walkthrough for the science-fair demo

## Test environments
### Automated tests
- Must not require network or OpenAI credentials
- Must force the deterministic stub patch provider
- Must prove the same contracts the live demo relies on

### Manual demo / smoke
- Uses the real OpenAI-backed provider
- Requires valid runtime configuration and credentials
- Must fail closed with operator-visible diagnostics if the real provider is selected but credentials are missing

## Core contracts to verify
1. `apps/demo` consumes `packages/self-heal-runtime` as a workspace package
2. Runtime injection is controlled by URL flag `?selfHeal=1`
3. Only action id `create-note` is patchable
4. Broken interaction does not unmount the page shell
5. Patch payload installs in memory only
6. Heal path retries exactly once
7. Source file on disk remains broken after heal

## Required automated tests

### 1) Runtime unit test
**File:** `packages/self-heal-runtime/src/runtime.test.ts`

**Must prove:**
- runtime accepts a valid `PatchPayload` for `create-note`
- payload validation rejects wrong action id / empty body / wrong version / wrong format
- valid payload installs into the registry for the current session only
- failed action triggers one patch request and exactly one retry
- second failure does not cause infinite retries
- compile/validation failures fail closed

### 2) App integration test
**File:** `apps/demo/src/features/note/NoteFlow.integration.test.tsx`

**Must prove:**
- healthy path at flag-off: submit `hello` -> note card appears
- broken path at flag-off after seeded bad edit/stubbed broken action: no note card added, page remains mounted, other shell UI still present
- healed path at flag-on: submit `hello again` -> friendly loading -> patch request -> one automatic retry -> note card appears
- integration test uses deterministic stub provider and no network/API key
- exactly one automatic retry occurs

## Optional automated tests
### Browser smoke
**File:** `apps/demo/tests/demo-smoke.spec.ts`

Optional. If included, keep it lightweight and use it only to strengthen confidence. It should not be the minimum proof gate.

## Manual verification protocol
### Precondition
- Dev servers are already running from the one-command startup path

### Timed walkthrough
1. Open healthy URL `http://localhost:5173/`
2. Confirm note form is ready
3. Submit `hello` and verify visible note card with text `hello`
4. Edit `apps/demo/src/features/note/actions/createNoteAction.ts`: change `text.trim()` to `text.trimmed()`
5. Refresh `http://localhost:5173/`
6. Submit `hello again` and verify:
   - real runtime failure occurs for `create-note`
   - page stays mounted
   - input/button shell stays usable
   - no note card appears for that broken submit
7. Open flagged URL `http://localhost:5173/?selfHeal=1`
8. Submit `hello again` and verify:
   - friendly loading UX appears
   - patch request reaches backend
   - patch installs in memory
   - same interaction retries once automatically
   - note card with text `hello again` appears
9. Confirm source file on disk is still broken

### Timing rule
- Start timer when healthy URL is loaded and the form is visibly ready
- Stop timer when the healed `hello again` note card appears at the flagged URL
- Pass threshold: under 60 seconds

## Verification commands to plan for
- workspace install
- lint
- typecheck
- runtime unit test
- app integration test
- optional browser smoke test

## Failure handling expectations
- Missing real-provider credentials in manual/demo mode must not silently switch to the stub provider
- Invalid patch schema must fail closed
- Retry loop must stop after one automatic retry
- Broken path must remain scoped to the targeted interaction

## Evidence required before execution is considered complete
- passing lint/typecheck/test outputs
- proof that runtime and app package boundaries were preserved
- proof that healing is in-memory only
- proof that exactly one retry occurred
- proof that the operator walkthrough completes under 60 seconds
