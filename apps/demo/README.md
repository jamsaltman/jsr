# Ralphthon self-heal demo

## What this demo shows
- A normal note-saving app in `apps/demo`
- A separate runtime library in `packages/self-heal-runtime`
- One manually introduced runtime bug
- One transient client-side hotfix applied after enabling `?selfHeal=1`
- One-time app bootstrap injection: exported async functions from `src/features/**/actions/*.ts` are auto-registered for healing
- Successful hotfixes are cached for the current browser session so a reload can reuse them without another patch request

## Setup
```bash
npm install
npm run dev
```

The one-command startup path runs:
- Vite client at `http://localhost:5173/`
- demo patch server at `http://localhost:5050/`

## Live OpenAI demo configuration
The manual demo path uses the real OpenAI-backed provider unless you explicitly set `SELF_HEAL_PATCH_PROVIDER=stub`.

You can put live credentials in a repo-root `.env.local` file and `npm run dev` will load them automatically for the demo server:
```bash
cp .env.example .env.local
```

Then edit `.env.local`:
```bash
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5.4-mini
```

`.env` is also supported, and exported shell variables still win if you already have them set.

If `OPENAI_API_KEY` is missing in live mode, the demo fails closed and logs the diagnostic in the operator panel plus the demo server output.

## Exact healthy -> broken -> healed walkthrough
1. Open the healthy app:
   - `http://localhost:5173/`
2. Save a healthy note:
   - type `hello`
   - click **Save note**
3. Make the exact one-line break edit in `apps/demo/src/features/note/actions/createNoteAction.ts`:
   - change `const trimmedText = text.trim();`
   - to `const trimmedText = text.trimmed();`
4. Refresh the healthy URL and prove the interaction is broken:
   - `http://localhost:5173/`
   - type `hello again`
   - click **Save note**
5. Enable the injected runtime and retry:
   - `http://localhost:5173/?selfHeal=1`
   - type `hello again`
   - click **Save note**
6. Observe the happy path:
   - brief `Saving your note…` message
   - the note card appears automatically
   - no second click needed
   - the source file on disk remains broken until you revert it manually

## Deterministic test mode
Automated tests use the deterministic stub patch provider and require no network or API key:
```bash
SELF_HEAL_PATCH_PROVIDER=stub npm test
```

## Useful commands
```bash
npm run lint
npm run typecheck
npm test
npm run build
```
