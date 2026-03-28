# Deep Interview Spec: ralphthon-self-heal-runtime-demo

## Metadata
- Profile: standard
- Rounds: 10
- Final ambiguity: 14.9%
- Threshold: 20%
- Context type: greenfield
- Context snapshot: `.omx/context/ralphthon-self-heal-runtime-demo-20260328T171354Z.md`
- Transcript: `.omx/interviews/ralphthon-self-heal-runtime-demo-20260328T173610Z.md`

## Clarity breakdown
| Dimension | Score |
| --- | ---: |
| Intent | 70% |
| Outcome | 88% |
| Scope | 94% |
| Constraints | 99% |
| Success criteria | 85% |

## Intent
Build a tiny, science-fair-fast Ralphthon demo that feels credible to engineers because they can watch a real bad edit get introduced, then watch a separate injected runtime quietly recover the app without pretending to be production-ready magic.

## Desired outcome
A live demo operator can:
1. show a normal demo app,
2. manually edit one known source location to seed a runtime bug,
3. refresh and show that one interaction is now broken,
4. add a URL feature flag to enable the self-heal runtime,
5. repeat the same interaction,
6. show a brief friendly loading state,
7. and have the interaction automatically complete successfully after the runtime fetches and applies an in-memory patch.

## Approved autonomous choices (granted during interview)
OMX may choose, without further confirmation:
- the exact framework/stack,
- the exact broken interaction,
- the exact client/runtime patch format,
- the exact minimal backend implementation,
so long as all choices remain tiny, single-interaction, same-repo, and clearly non-framework-agnostic.

## Implementation brief (precise)
### Repository shape
The repo must contain exactly these two product parts:
1. `packages/self-heal-runtime`
   - reusable JavaScript self-healing runtime library
   - intentionally narrow and app-specific enough to support this demo
2. `apps/demo`
   - normal demo app that consumes the runtime library
   - also contains the tiny backend surface needed to call the OpenAI API (no third app/package)

### Recommended locked shape for the 3-hour build
Under the granted decision boundary, prefer:
- a minimal React-based demo app with one obvious interaction,
- one framework-specific runtime integration for that app,
- one backend endpoint inside `apps/demo`,
- one known manual edit site documented for the operator.

### Recommended demo interaction
Choose one tiny form-like interaction with visible success output and a real payload, for example:
- submit one text field,
- show a new list item / result card / confirmation state.

The interaction should be selected for these properties:
- easy to break with a one-line manual edit,
- throws a real runtime error,
- has a payload that can be sent to the backend/OpenAI request,
- can be auto-retried after healing,
- makes success visually obvious.

### Runtime behavior
When the feature flag is OFF:
- the demo app behaves like a normal app,
- the seeded manual edit causes one interaction to fail with a runtime error,
- no healing occurs.

When the feature flag is ON:
- the runtime is injected into the demo app,
- it intercepts/catches the seeded runtime error for the one targeted interaction,
- it collects whatever recovery context is needed for the AI to infer a code patch,
- it sends that context to a backend in `apps/demo`,
- the backend calls the OpenAI API,
- the backend returns a patch payload,
- the runtime applies the patch in memory on the client only,
- the runtime automatically retries/completes the same interaction,
- the source files remain unchanged on disk,
- an optional operator-facing hotfix log may record the applied patch.

### UX behavior
User-facing UX must be polished and benign:
- do not expose raw error UI to the end user in the healing path,
- do not tell the end user the code broke,
- show only a brief, friendly loading/retrying state,
- then show the normal success result.

Operator-facing observability may exist, but it must stay secondary to the benign end-user experience.

### Recovery context contract
Send whatever is needed for the AI to produce the patch, but keep scope tight around the single interaction. The runtime/backend may include:
- error message and stack,
- source snippet or action template for the broken handler,
- the interaction payload / relevant input state,
- small app-specific contextual hints,
- any minimal metadata needed to safely target the one patch site.

Do **not** imply broad app introspection, multi-error reasoning, or persistent source rewriting.

## In scope
- same repo, separate `packages/` and `apps/` directories
- one reusable runtime package
- one demo app consuming that package
- one seeded runtime failure only
- one happy-path recovery only
- one URL feature flag to enable runtime injection
- one backend path that calls only the OpenAI API
- one client-side in-memory patch application path
- one automatic retry/completion after heal
- one optional operator-visible log of the applied hotfix

## Out of scope / non-goals
- persistent source-code rewriting
- writing the patch back to local source files
- multiple seeded failures
- generalized framework-agnostic runtime claims
- production-grade safety guarantees
- auth
- database
- any external vendor integration besides the OpenAI API
- complex observability, dashboards, or admin tooling
- background healing beyond the one targeted interaction

## Constraints
- must be demoable in under 1 minute at a science-fair table
- must be finishable autonomously in 3 hours
- keep scope tiny
- do not expand scope
- the demo app is not the runtime
- the runtime is injected into the demo app
- the live demo should involve a real manual source edit plus refresh
- the fix is applied on the client and executed there
- the fix must not persist to source code

## Testable acceptance criteria
1. The repo contains `packages/self-heal-runtime` and `apps/demo`.
2. `apps/demo` consumes `packages/self-heal-runtime` as a separate library.
3. With the feature flag absent/off, the healthy app works.
4. After the documented manual bad edit and refresh, one chosen interaction fails with a runtime error.
5. With the feature flag on, the runtime catches that same failure.
6. The runtime/backend sends recovery context to the OpenAI-backed patch endpoint.
7. The backend returns a patch payload.
8. The client runtime applies the patch in memory only.
9. The same interaction is automatically retried/completed without an extra click.
10. The end user sees brief benign loading UX rather than a raw error during the healing flow.
11. The source code on disk remains broken until manually changed back; the runtime fix is transient.
12. The full demo can be shown from healthy -> broken -> healed in under 60 seconds.

## Assumptions exposed + resolutions
- **Assumption:** A built-in break trigger is necessary for simplicity.  
  **Resolution:** Rejected. The live demo should use a real manual edit + refresh because it keeps the story simple and lets engineers watch the bug being introduced.
- **Assumption:** Recovery should ask the user for confirmation.  
  **Resolution:** Rejected. Recovery must be automatic and invisible to the end user.
- **Assumption:** A convincing demo might need persistent code rewriting.  
  **Resolution:** Rejected. Patch stays in memory only; optional log is fine.
- **Assumption:** A credible runtime should be framework-agnostic.  
  **Resolution:** Rejected. Keep it narrow and framework-specific.

## Pressure-pass finding
The earlier “manual edit + refresh” choice was revisited. The deeper reason is not product necessity but demo credibility: engineer viewers should be able to see the bug being introduced for real.

## Brownfield evidence vs inference
- Repo evidence: this is a greenfield project for this feature area; `packages/self-heal-runtime` and `apps/demo` do not yet exist.
- Inference used under explicit user permission: OMX may choose the exact stack and broken interaction.

## Technical context findings
- No existing implementation files constrain the stack.
- The “two separate parts only” requirement implies the tiny backend should live inside `apps/demo`, not a third workspace package.
- The runtime must be integrated as an injected capability toggled by URL flag rather than as the app’s primary identity.

## Condensed transcript
See `.omx/interviews/ralphthon-self-heal-runtime-demo-20260328T173610Z.md`.
