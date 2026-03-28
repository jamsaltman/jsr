# Deep Interview Transcript Summary

- Slug: ralphthon-self-heal-runtime-demo
- Timestamp (UTC): 20260328T173610Z
- Profile: standard
- Context type: greenfield
- Final ambiguity: 14.9%
- Threshold: 20%

## Condensed transcript

### Round 1 — Outcome
**Q:** What exact before → break → healed end state should a science-fair visitor witness in under 60 seconds?
**A:** Show the normal demo app, then manually make an edit and show it is broken, then turn on a feature flag in the URL to enable the self-healing runtime, and show how the self-healing runtime recovers it.

### Round 2 — Scope
**Q:** What is the single on-screen feature that should visibly go from healthy → broken → healed during the demo?
**A:** Could be anything - you tell me.

### Round 3 — Scope
**Q:** When the seeded error happens, should the demo show the entire app broken, or one obvious widget broken while the rest of the page stays normal?
**A:** A particular interaction is broken (with a runtime error).

### Round 4 — Scope
**Q:** When you say you’ll “make an edit manually,” do you want the live demo to involve actually editing the demo app’s source code and refreshing, or should it use a built-in break trigger that represents your bad edit while keeping the story the same?
**A:** Actually editing and refreshing.

### Round 5 — Non-goals
**Q:** To keep this tiny, what is the most important thing the demo must not try to imply: persistent source-code rewriting, multiple-error intelligence, production-grade safety, or framework-agnostic magic?
**A:** Definitely no persistent source code rewriting. It can maybe put the hot fix into a log so we can see what's fixed. Definitely don't do framework agnostic.

### Round 6 — Intent
**Q:** Why is the manual bad edit + refresh important to your story—what exact claim should the viewer leave believing that a built-in “break me” button would not prove?
**A:** idk just keeps it simpler and the engineers can see the bug being introduced

### Round 7 — Decision Boundaries
**Q:** For the 3-hour autonomous build, may I choose the exact framework/stack and the exact broken interaction myself, as long as it stays tiny, single-interaction, and not framework-agnostic?
**A:** yes

### Round 8 — Success
**Q:** To keep the happy path tiny, after the runtime gets a patch should it automatically apply the fix and make the same interaction work immediately, or should it show the proposed fix first and wait for a click to apply?
**A:** It should automatically apply the fix on the client (make the client catch and execute the fixed code) but do not write the fix back to the source code. Definitely the user should be oblivious to this whole process and just see some benign UX (like a loading thing with some basic friendly twist). They should not know the code had an issue.

### Round 9 — Success
**Q:** After the flagged runtime catches the broken interaction, should the demo’s happy path be A) the runtime heals and automatically completes/retries that same interaction, or B) the runtime heals, then the user must click again to prove it works?
**A:** A. (also i think it might need to give the relevant data / state / payload to the api so the ai knows how to recover it)

### Round 10 — Constraints
**Q:** To keep the OpenAI call tiny and demo-safe, should the runtime/backend send only the minimum recovery context—for example the error message/stack, the broken interaction’s input payload, and a small app-specific code template—or do you want it to send richer client state too?
**A:** it should send whatever is needed for the ai to know how to recover the error (patch the code)

## Outcome summary
- Demo story locked: show healthy app, manually introduce a bad edit + refresh, then enable runtime via URL flag and show automatic recovery.
- The broken surface is one interaction, not the whole app.
- Runtime must auto-heal in memory on the client and auto-retry the same interaction.
- No persistent source rewrite; optional operator-facing hotfix log is acceptable.
- End user should see benign friendly loading UX, not an explicit error/healing narrative.
- OMX may choose the exact framework/stack and exact broken interaction within the tiny-scope constraints.
