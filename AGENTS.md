# THERMPYX project guidance

THERMPYX is a static bilingual learning site. Use the existing checkout: each cloud task is already isolated, so do not create a Git worktree unless the user asks. Runtime needs no build or npm installation. Serve the checkout with `python3 -m http.server 8003 --bind 127.0.0.1`. `index.html` and deep links open through `app.html` so the music player survives navigation.

## Current account and quiz architecture

- The active backend is native Firebase, through `js/firebase-client.js` and public Web configuration in `js/firebase-config.js`. Firebase 13 browser modules load from the pinned official CDN. Do not import Analytics or add a runtime build. A `measurementId` in configuration does not enable Analytics.
- Teachers sign in with Google. Students join with a room code and nickname; the app uses Firebase Anonymous Authentication for their identity. Anonymous users must never appear as signed-in teachers or gain private question-set/host access. Preserve the distinction in both the backend wrapper and `TPXContent`.
- `TPXFirebase` is published synchronously while SDK readiness is asynchronous. Await its supported methods internally. Call the ready Google popup method directly within user activation; do not await a session read first. Fail clearly when Firebase is unavailable; never simulate a production sign-in or successful save.
- Preserve the Google-only modal, ID/EN labels and errors, keyboard focus, Escape, busy/double-click protection and local drafts. An in-flight old session read must not override a newer sign-in, sign-out or account change.
- Realtime Database access is governed by `firebase/database.rules.json`. Preserve Google-owner restrictions, exact room-code lookup, membership checks, nickname uniqueness and answer/room-state validation. Do not use public read/write rules, disable validation or rely on UI checks alone.
- For question-set writes, keep four distinct answers, one correct index and a maximum of 100 questions. Preserve drafts on failure or account changes, confirm the returned cloud record before claiming success, and never apply an old request to another owner/draft. Keep the room's question snapshot independent of later bank edits.
- Supabase SQL, email templates, old configuration and their QA files remain historical migration material. Do not reconnect active pages to them or delete remote/legacy data as part of routine setup. Old email callback credentials are sanitized before the page enters the shell; they may open the Google account dialog but cannot authenticate a Firebase user. Never log/store callback tokens or put them in shell query strings/history metadata.
- Google and Anonymous were confirmed enabled during setup, and `thermpyx.github.io` was added to authorized domains. The Singapore (`asia-southeast1`) Realtime Database was created and its confirmed URL `https://thermpyx-default-rtdb.asia-southeast1.firebasedatabase.app` is configured. The user confirmed Rules publication succeeded. The Firebase frontend is released through the existing Pages branch `codex/simulator-visual-refinement`; the user does not need to upload again or switch branches. Once the Firebase version is visible, the next step is real Google sign-in, bank save/reload and a host/student trial. Do not claim deployed-page verification, production OAuth or production writes from local fixtures/emulators or configuration alone. Follow [the Firebase guide](docs/PANDUAN-FIREBASE.md).

## Learning, physics and content requirements

- Keep the seven guided modules in `learning.html` aligned with theory, simulator/application activities, measurable outcomes and topic quizzes. Progress is browser-local: reading/experiment checkboxes are self-reports; quiz mastery requires at least 80%.
- Every authored UI/theory addition must support Indonesian and English. Use explicit `data-en`/`data-id` leaf pairs or authored normalized dictionary entries for inline scientific markup. Do not mark authored theory `data-tpx-no-translate`; reserve exemptions for user content, formulas, proper names and components that explicitly render their authored bilingual labels. Never guess translations of imported teacher content.
- Preserve equations, units, sign conventions, assumptions, superscripts/subscripts and examples. Test ID → EN → ID, scientific markup and anchors.
- Visual-only simulator changes must leave calculations, state, controls, animations, graphs and handlers unchanged. Compare executable scripts with the incoming version. Preserve the separately authorized First Law initial/final volume fix and its expansion/compression regressions.
- Preserve photos, music, vendor assets, account settings and user changes. Do not place private/service-account keys, admin credentials or passwords in browser code or saved setup instructions.
- Do not create/modify live backend records merely to run QA. Use isolated `demo-*` emulator projects, intercepted endpoints or explicit fixtures and report which. Never use mock behavior in production code.

## Visual preferences

- Use the First Law piston as the simulator equipment reference: coherent lab surfaces, recognizable apparatus and readable labels. Inspect real screenshots; a font check alone does not prove a scene renders.
- Keep text, symbols, readouts and buttons comfortably inside containers. Verify 320px and desktop, ID/EN and both themes. Sticky headers must not cover focus/anchors. Preserve keyboard and reduced-motion support.
- Avoid decorative long-dash separators and heading/example accent rules. Preserve mathematical minus signs, plots and number ranges.
- Calculator −/+ controls must remain integrated with inputs, precise for small decimal steps, keyboard accessible, and compatible with manual input/validation.

## Verification

Use current Firebase suites for backend/account/live-quiz changes:

```sh
node qa/test-firebase-client.cjs
node qa/test-firebase-account.cjs
node qa/test-firebase-live.cjs
node qa/test-firebase-navigation.cjs
```

Browser suites require Playwright/Chromium; account/navigation suites also use the local HTTP server. `qa/test-firebase-sdk.cjs` requires the actual Firebase 13 browser bundle via `TPX_FIREBASE_SDK_BUNDLE` and an Auth emulator at `127.0.0.1:9099`, using project `demo-thermpyx-qa`. Its Google credentials and RTDB network are local fixtures; it does not prove production OAuth or deployed database rules. See the preparation notes in that file.

Run `qa/test-firebase-rules.cjs` separately with the official RTDB emulator, `FIREBASE_DATABASE_EMULATOR_HOST`, and an isolated `demo-*` project. It must fail rather than fall back to production or mocks when the emulator is missing. QA-only pinned dependencies are in `qa/firebase/`; they are not runtime requirements. The checked-in `firebase.json` supports emulator execution. See [Firebase revision notes](docs/REVISI-FIREBASE.md) for commands and the recorded rules test evidence. Do not claim a new rules version passed based on an older hash/report.

For learning, translation, simulation or shared navigation changes, run the relevant existing suites:

```sh
node qa/test-learning-path.cjs
node qa/test-learning-assessment.cjs
node qa/test-learning-ui.cjs
node qa/test-theory-material.cjs
node qa/test-i18n.cjs
node qa/test-simulator-design.cjs
node qa/test-first-law-volume.cjs
node qa/test-heat-visual.cjs
node qa/test-simulator-apparatus.cjs
node qa/test-calculator-stepper.cjs
node qa/test-calculator-validation.cjs
node qa/test-unit-converter.cjs
node qa/test-rev08.cjs
node qa/test-navigation-layout.cjs
node qa/test-history.cjs
node qa/test-shell-music.cjs
```

Also use current onboarding/developer/about/simulator-history suites when affected. Supabase-specific `test-auth-*`, `test-home-account`, `test-email-template`, `test-host-auth-race`, `test-question-set-flow`, `test-teacher-sql`, `test-upload-flow`, `test-live-entry` and `test-quiz` retain older fixtures and are historical for the Firebase migration; their passing/failing results do not establish the active Firebase workflow. Review their assumptions before adapting them. Report local checks and untested external behavior precisely.
