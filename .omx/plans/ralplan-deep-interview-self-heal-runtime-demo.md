# Initial RALPLAN Consensus Plan — deep-interview self-heal runtime demo

## RALPLAN-DR Short Summary

### Exact stack
- **Workspace:** npm workspaces + TypeScript
- **Demo app:** `apps/demo` = Vite + React client, plus a tiny Node server in the same app folder
- **Runtime package:** `packages/self-heal-runtime` = narrow React-oriented TypeScript library with action wrapper + in-memory patch registry
- **OpenAI integration:** direct HTTPS/fetch call from `apps/demo/server` to OpenAI API for the manual demo, plus a deterministic non-live patch-provider seam for automated tests; no DB/auth/extra vendors

### Exact broken interaction
- **Interaction:** single-field **"Save note"** form
- **Healthy behavior:** submit text, append one visible note card under the form
- **Seeded manual failure:** operator edits `apps/demo/src/features/note/actions/createNoteAction.ts` from `text.trim()` to `text.trimmed()` (or equivalent one-line typo), refreshes, and submit now throws a real runtime `TypeError`
- **Heal behavior:** when `?selfHeal=1` is present, runtime catches that targeted submit failure, shows a friendly **“Saving your note…”** state, requests a patch, installs an in-memory replacement action, auto-retries, and the note appears without a second click

### Principles
1. **Tiny, single-story demo** over generality.
2. **Framework-specific credibility** over abstract “universal runtime” claims.
3. **Transient client healing only**; never rewrite source on disk.
4. **Benign user UX**; operator insight stays secondary.
5. **Fast operator flow**; healthy → broken → healed in under 60 seconds.

### Decision Drivers (top 3)
1. **3-hour buildability** with the least moving pieces.
2. **Engineer-demo credibility** from a real manual bad edit and a real retry path.
3. **Highly testable narrow scope** with one deterministic failure and one deterministic recovery.

### Viable Options

#### Option A — Vite React SPA + tiny Node server + action-level patch registry
- **Pros:** smallest build surface; easy URL-flag injection; easiest to demo live; patch can replace one function in memory cleanly.
- **Cons:** explicitly app-specific; uses dynamic function installation; limited realism beyond the chosen interaction.

#### Option B — Next.js app route + React error-boundary driven recovery
- **Pros:** app + backend in one app tree; strong DX for one repo app.
- **Cons:** more framework/runtime surface than needed; recovery wiring is less obviously action-scoped; slower to finish within 3 hours.

#### Option C — Plain HTML/JS demo + generic runtime shim
- **Pros:** very small runtime mechanics.
- **Cons:** less credible to engineers expecting modern app structure; weaker fit for reusable `packages/self-heal-runtime`; less useful Architect/Critic handoff.

### Recommendation
**Choose Option A.** It is the smallest stack that still looks like a modern app, supports the required separate package/app structure, keeps the backend inside `apps/demo`, and makes one in-memory action hotfix easy to reason about, verify, and demo.

---

## Requirements Summary
- Create exactly two product parts: `packages/self-heal-runtime` and `apps/demo`.
- Keep the runtime narrow and explicitly app-specific.
- Demo one interaction only: save one note from a text input.
- Operator story:
  1. show healthy app,
  2. manually break one known line,
  3. refresh and show submit now fails,
  4. add `?selfHeal=1`,
  5. resubmit,
  6. show brief benign loading,
  7. note appears after automatic in-memory heal.
- Backend must live inside `apps/demo` and call only OpenAI API.
- Client patch is session-only/in-memory; disk source stays broken.
- No auth, DB, multi-error support, persistent rewriting, or generalized platform claims.

## Runtime/App Boundary
- **`packages/self-heal-runtime` owns:** URL-flag detection, action wrapper/executor, recovery request client contract, patch registry, patch validation/evaluation helpers, single retry orchestration, and fail-closed behavior.
- **`apps/demo` owns:** note domain types, `createNoteAction`, UI components, healing/loading presentation, broken-path error containment, action hints/snippets, operator log, backend route, patch-provider selection, OpenAI prompt construction, and dev-server wiring.
- **Must NOT live in `packages/self-heal-runtime`:** React components, note-specific state, backend/OpenAI prompt text, file-system/source rewriting logic, app routes, or any generalized multi-error orchestration.

## Patched Action Contract
- **Patchable function signature:**
  ```ts
  type CreateNoteAction = (input: { text: string }) => Promise<{ note: { id: string; text: string } }>;
  ```
- The runtime patches/replaces only the action implementation behind action id `create-note`.
- Component/UI state stays outside the patchable function; React components only call the action and render returned data/loading state.
- **Retry behavior:** on the first targeted runtime failure with `?selfHeal=1`, runtime requests a patch, installs it in memory, then re-invokes the same action once with the original `{ text }` payload. If retry fails, runtime stops and surfaces no further healing attempts for that submission.

## Patch Generator Test Seam
- `apps/demo/server` exposes a **patch provider interface** with two implementations: a real OpenAI-backed provider for manual/demo runs and a deterministic stub provider for automated tests.
- **Manual demo path:** default provider uses the real OpenAI API when the operator runs the normal dev command with valid API configuration.
- **Manual demo fallback:** if the real OpenAI-backed provider is selected but credentials/config are missing, the demo fails closed with operator-visible diagnostics; it must not silently fall back to the stub provider.
- **Automated test path:** tests force a non-live provider (for example via dependency injection or env such as `SELF_HEAL_PATCH_PROVIDER=stub`) that returns a fixed valid `PatchPayload` for `create-note` with no network or API key dependency.
- The runtime package remains provider-agnostic; the seam lives in `apps/demo/server`, preserving the real backend/OpenAI integration for the live demo while making CI deterministic.

## Patch Payload Contract
- **Response schema:**
  ```ts
  type PatchPayload = {
    actionId: 'create-note';
    version: 1;
    format: 'function-body';
    functionBody: string;
    rationale?: string;
  };
  ```
- **Validation:** runtime and backend both verify `actionId === 'create-note'`, `version === 1`, `format === 'function-body'`, and `functionBody` is a non-empty string before install.
- **Compile/evaluate path:** runtime wraps `functionBody` into a narrowly scoped `new Function('input', functionBody)` (or equivalent tiny evaluator), then adapts it to the `CreateNoteAction` signature before registry install; the installed body must return or resolve to the same Promise result shape as `CreateNoteAction`.
- **Fail-closed behavior:** invalid schema, compile failure, or post-install retry failure leaves the source on disk unchanged, records optional operator diagnostics, and returns control without persistent healing or fallback patch chaining.

## Dev/Run Topology
- `apps/demo` runs two local processes: Vite serves the React client, and `apps/demo/server` serves the patch endpoint.
- Vite proxies `/api/self-heal/patch` to the local demo server in development so the browser uses one origin during the demo.
- **One-command operator startup path:** root workspace command starts both the Vite client and `apps/demo/server` together (for example via one root `dev` script) so the operator only runs one command before the healthy/broken/healed walkthrough.

## Under-60-Second Demo Verification Protocol
- **Timing assumption:** dev servers are already running from the one-command startup path before the timer starts.
- **Start condition:** timer starts when the operator loads healthy URL `http://localhost:5173/` (or the documented local dev URL) and the note form is visibly ready.
- **Healthy step:** submit `hello` at the healthy URL and verify one visible note card with text `hello`.
- **Break edit:** change `apps/demo/src/features/note/actions/createNoteAction.ts` from `text.trim()` to `text.trimmed()`.
- **Refresh step:** refresh `http://localhost:5173/` and submit `hello again`; the page must stay mounted, the input/button shell remains usable, no note card is added for that submission, and the runtime failure is confined to the `create-note` interaction.
- **Flagged heal step:** navigate to `http://localhost:5173/?selfHeal=1`, submit `hello again`, observe friendly loading UX, and allow one automatic retry.
- **End condition:** timer stops when one visible note card with text `hello again` appears at the flagged URL after the automatic heal, with no second click and no source repair on disk.

## Acceptance Criteria (highly testable)
1. Root workspace installs and resolves both `apps/demo` and `packages/self-heal-runtime`.
2. `apps/demo` imports and uses `packages/self-heal-runtime` via workspace dependency, not copied source.
3. Without `?selfHeal=1`, healthy `Save note` submit adds one note card and clears/retains input per chosen UX.
4. After the documented one-line bad edit in `apps/demo/src/features/note/actions/createNoteAction.ts` and refresh, submit triggers a real runtime failure for `create-note`, no note card is added, and the page remains mounted with the rest of the UI still usable.
5. With `?selfHeal=1`, the same broken submit path is intercepted by the runtime wrapper for action id `create-note`.
6. The runtime sends recovery context containing at least: action id, payload, error message/stack excerpt, and app-provided patch hint/snippet.
7. `apps/demo/server` exposes exactly one minimal patch endpoint with a deterministic non-live test seam; manual/demo runs use the real OpenAI-backed provider and automated tests can use a stub provider with no network/API key requirement.
8. The returned payload is applied only to an in-memory registry for the active browser session.
9. The runtime automatically retries the original submit once after patch installation; no extra user click is required.
10. During healing, the user sees only a friendly loading state such as **“Saving your note…”** and not a raw error explanation.
11. After healing, one note card appears successfully and an optional operator log may show a hotfix entry.
12. After healing, the file on disk remains broken until manually reverted.
13. The scripted/manual demo checklist uses the exact healthy URL, exact break edit, refresh step, exact flagged URL, and exact visible success end state, and can be executed in under 60 seconds with dev servers already running.

## Implementation Steps
1. **Workspace + package skeleton**
   - Planned files:
     - `package.json`
     - `tsconfig.base.json`
     - `apps/demo/package.json`
     - `packages/self-heal-runtime/package.json`
     - `packages/self-heal-runtime/src/index.ts`
   - Outcome: minimal monorepo with one app and one runtime package.

2. **Demo app happy path**
   - Planned files:
     - `apps/demo/index.html`
     - `apps/demo/vite.config.ts`
     - `apps/demo/src/main.tsx`
     - `apps/demo/src/App.tsx`
     - `apps/demo/src/features/note/components/NoteForm.tsx`
     - `apps/demo/src/features/note/actions/createNoteAction.ts`
     - `apps/demo/src/features/note/types.ts`
   - Outcome: single text field + submit button + note list; healthy submit visibly succeeds.

3. **Runtime package and URL-flag injection**
   - Planned files:
     - `packages/self-heal-runtime/src/runtime.ts`
     - `packages/self-heal-runtime/src/patch-registry.ts`
     - `packages/self-heal-runtime/src/types.ts`
     - `packages/self-heal-runtime/src/url-flag.ts`
     - `apps/demo/src/self-heal/runtimeClient.ts`
     - `apps/demo/src/self-heal/actionHints.ts`
   - Outcome: `?selfHeal=1` enables wrapper logic around the `create-note` action only; without the flag, app uses the normal path.

4. **Minimal backend patch endpoint inside `apps/demo`**
   - Planned files:
     - `apps/demo/server/index.ts`
     - `apps/demo/server/openaiPatchRoute.ts`
     - `apps/demo/server/patchProvider.ts`
     - `apps/demo/server/prompt.ts`
     - `apps/demo/server/patchSchema.ts`
   - Outcome: server receives narrow recovery context, selects either the real OpenAI provider or deterministic stub provider, validates a tiny patch shape, and returns replacement function source/body for `create-note` only.

5. **Automatic retry, UX polish, broken-path containment, and operator demo docs**
   - Planned files:
     - `apps/demo/src/features/note/components/HealingStatus.tsx`
     - `apps/demo/src/self-heal/operatorLog.ts`
     - `apps/demo/README.md`
     - `apps/demo/src/features/note/actions/createNoteAction.ts` (documented manual break site)
   - Outcome: healing path shows friendly loading, the broken path remains interaction-scoped with the page still mounted, an operator-visible diagnostic surface is defined for missing real-provider credentials, optional operator hotfix log exists, and the demo script documents the exact local URL/port, copy-pasteable one-line break edit, and timed under-1-minute flow.

6. **Verification coverage**
   - Planned files:
     - `packages/self-heal-runtime/src/runtime.test.ts` (minimum required runtime unit test for patch install + single retry)
     - `apps/demo/src/features/note/NoteFlow.integration.test.tsx` (minimum required app integration proof for healthy / broken / healed flow, including exactly one automatic retry)
     - optional `apps/demo/tests/demo-smoke.spec.ts` if lightweight browser smoke is warranted
   - Outcome: minimum automated proof is explicit and mandatory before handoff; browser smoke is additive only.

## Risks and Mitigations
- **Risk:** OpenAI output is too free-form for a deterministic demo.
  - **Mitigation:** constrain prompt to one action id and one patch schema; validate response strictly and fail closed.
- **Risk:** dynamic function installation becomes brittle.
  - **Mitigation:** patch only a single action function with a tiny typed context contract; no generic AST rewriting.
- **Risk:** healthy path and heal path drift.
  - **Mitigation:** both paths return the same action result shape; retry reuses the original payload.
- **Risk:** automated tests become flaky or require live credentials.
  - **Mitigation:** route tests through the deterministic stub patch provider seam in `apps/demo/server`; reserve real OpenAI calls for manual/demo runs only.
- **Risk:** missing live-provider credentials causes operator confusion during the manual demo.
  - **Mitigation:** expose one operator-visible diagnostic surface consistently (prefer demo server log plus a small operator panel/log entry), and do not silently fall back to the stub provider.
- **Risk:** under-1-minute demo gets noisy.
  - **Mitigation:** document one exact edit site, one exact healthy URL, one exact flagged URL, and one exact visible success signal.
- **Risk:** feature-flag-off failure destabilizes the whole page.
  - **Mitigation:** contain failure to the wrapped submit interaction so the page shell stays mounted and usable; only the targeted note creation fails.

## Verification Steps
1. Install workspace and confirm package linking resolves.
2. Run the demo app healthy at `http://localhost:5173/` without `?selfHeal=1`; submit `hello` and verify one visible note card with text `hello`.
3. Apply the documented bad source edit in `apps/demo/src/features/note/actions/createNoteAction.ts` (`text.trim()` -> `text.trimmed()`), refresh `http://localhost:5173/`, and verify submit of `hello again` produces a real runtime failure for `create-note`, adds no note card, and leaves the page mounted and otherwise usable.
4. Reload at `http://localhost:5173/?selfHeal=1`; submit `hello again` and verify:
   - friendly loading state appears,
   - patch request hits demo backend,
   - backend uses either real OpenAI provider (manual demo) or stub provider (automated tests),
   - backend returns valid patch payload,
   - client installs patch in memory,
   - submit auto-retries once,
   - one visible note card with text `hello again` appears.
5. Confirm source file on disk is still broken after successful heal.
6. Run lint, typecheck, `packages/self-heal-runtime/src/runtime.test.ts`, and `apps/demo/src/features/note/NoteFlow.integration.test.tsx`; these tests must use the deterministic non-live patch-provider seam and require no network/API key.
   - The integration test must also prove there is exactly one automatic retry for the healed submit path.
7. If present, run one optional smoke/demo verification pass against the real OpenAI-backed manual path.
8. Time the operator script with dev servers already running: start at healthy URL loaded and form ready; stop when the healed `hello again` note card appears at the flagged URL.

## ADR
- **Decision:** Build a Vite + React demo app in `apps/demo` and a narrow TypeScript runtime package in `packages/self-heal-runtime`, using an action-level in-memory patch registry and one Node patch endpoint inside `apps/demo`.
- **Drivers:** smallest credible modern stack; easiest URL-flag injection; easiest deterministic one-action retry.
- **Alternatives considered:**
  - Next.js app-route architecture — cohesive but heavier than needed.
  - Plain JS demo with generic runtime — smaller but less credible and less reusable.
- **Why chosen:** best balance of credibility, speed, and testability for a 3-hour autonomous build.
- **Consequences:** runtime is intentionally React/app-specific; dynamic patching is narrow by design; backend remains minimal and demo-only.
- **Follow-ups:** keep patch schema/action contract narrow; document the operator break site exactly; if extended later, add a second demo only after this one remains deterministic.

## Available-Agent-Types Roster
- `architect` — plan sanity, boundary checks, tradeoff review
- `critic` — challenge scope leakage and demo credibility gaps
- `executor` — implementation across runtime/app/backend files
- `test-engineer` — targeted regression and smoke coverage
- `verifier` — completion evidence and acceptance-criteria audit
- `debugger` — isolate runtime retry or patch-install failures if the first pass stalls
- `writer` — tighten `apps/demo/README.md` operator script and demo instructions

## Follow-up Staffing Guidance

### For `$ralph`
- **Lane 1 — implementation:** `executor`, **high** reasoning
  - Owns workspace setup, runtime package, demo app, backend endpoint.
- **Lane 2 — evidence/regression:** `test-engineer`, **medium** reasoning
  - Owns targeted unit/integration/smoke coverage and under-60-second demo proof.
- **Lane 3 — final sign-off:** `architect` or `verifier`, **medium/high** reasoning
  - Confirms no scope creep, transient patching only, and acceptance criteria closure.
- **Optional rescue lane:** `debugger`, **high** reasoning
  - Use only if the retry/patch install loop fails or OpenAI response validation is unstable.

### For `$team`
- **Recommended headcount:** 3 lanes
  1. `executor` — **high** reasoning — app/runtime/backend delivery
  2. `test-engineer` — **medium** reasoning — regression + demo timing evidence
  3. `verifier` or `architect` — **medium/high** reasoning — acceptance audit and boundary policing
- **Why this split:** keeps build, proof, and review parallel without overstaffing a tiny scope.
- If only 2 workers are available, merge verifier duties into the test lane and keep one dedicated `executor` lane.

## Explicit `omx team` / `$team` Launch Hints
- **Default coordinated run:**
  - `omx team 3:executor "Implement the self-heal runtime demo from .omx/plans/ralplan-deep-interview-self-heal-runtime-demo.md; keep scope to one save-note interaction, one break site, one in-memory patch path, and produce verification evidence."`
- **If using role-specific follow-up manually after plan approval:**
  - `$team 3 "Implement the approved self-heal runtime demo plan; dedicate one lane to delivery, one to tests/demo timing, one to verification/sign-off."`
- **Reasoning hint:** if team launch args allow it, keep delivery at `high`, tests at `medium`, verification at `medium`/`high`.

## Team Verification Path
1. Delivery lane reports completed file set against the planned paths.
2. Test lane proves:
   - healthy save-note flow,
   - broken flow after manual edit,
   - healed flow with URL flag,
   - source remains broken on disk,
   - demo timing under 60 seconds.
3. Verification lane checks acceptance criteria one-by-one against evidence, not claims.
4. Architect/Critic follow-up should focus on:
   - whether the runtime is still clearly injected rather than becoming the app itself,
   - whether only one failure and one happy-path recovery exist,
   - whether patching is truly in-memory only,
   - whether the UX stays friendly and non-alarmist.
5. Team is complete only when all four conditions hold: build green, tests green, acceptance criteria satisfied, and demo script readable by an operator in one pass.

## Consensus Review Changelog
- Architect iteration merged: explicit runtime/app boundary, patched action contract, patch payload contract, dev/run topology, and mandatory minimum automated proof.
- Critic iteration merged: deterministic non-live patch-provider seam, explicit under-60-second protocol, and interaction-scoped broken-path containment.
- Approval suggestions merged: async-compatible patched function result shape, fail-closed real-provider credential handling, consistent operator-visible diagnostics, copy-pasteable demo instructions, and explicit one-retry integration-test proof.
