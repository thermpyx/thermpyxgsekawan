# THERMPYX project guidance

The user-facing application is a static bilingual learning site. Use the existing checkout; no build step or npm install is required for runtime. Serve it over HTTP with `python3 -m http.server 8003 --bind 127.0.0.1`. `index.html` and deep links open through `app.html` to preserve the music player.

## Requirements to preserve in future changes

- Keep the guided learning path in `learning.html` aligned with all seven theory topics, simulator/application activities, measurable learning outcomes, and topic quizzes. Learning progress is local to the browser; reading/experiment checkboxes are self-reports, whereas quiz mastery requires at least 80%.
- Every authored UI or theory addition must support Indonesian and English. Use explicit `data-en`/`data-id` pairs for complete leaf labels, or authored normalized dictionary entries for text with inline scientific markup. Do not mark authored theory with `data-tpx-no-translate`; reserve exemptions for user content, formulas, or proper names. Never use automatic guesses to translate imported teacher content.
- Preserve equations, units, sign conventions, assumptions, superscripts/subscripts, and numerical examples when translating. Test ID → EN → ID and recheck inline markup and anchors.
- Simulator visual changes must leave physics calculations, state, controls, animations, graphs, and event handling unchanged. Compare simulator JavaScript and inline executable scripts with the incoming version when doing a visual-only revision. The current version also contains an explicitly authorized First Law initial/final volume-control fix; preserve it and its nontrivial expansion/compression regressions.
- Keep responsive layouts usable at 320px as well as desktop, in both themes and both languages. Sticky headers must not cover focused controls or anchor targets. Preserve reduced-motion and keyboard operation.
- Do not replace account, music, teacher content, or Supabase setup with mock production behavior. Browser tests may mock/abort remote services; report this limit. Do not create or modify live backend data just to run QA.
- Preserve the user's existing files, photos, music, vendor assets, and account settings. Do not put secret/service-role keys in frontend code.

## Verification

Use the existing suites in `qa/`; Playwright browser tests require Chromium. New learning/translation/simulator changes should run:

```sh
node qa/test-learning-path.cjs
node qa/test-learning-assessment.cjs
node qa/test-theory-material.cjs
node qa/test-i18n.cjs
node qa/test-simulator-design.cjs
node qa/test-first-law-volume.cjs
node qa/test-quiz.cjs
node qa/test-rev08.cjs
node qa/test-learning-ui.cjs
node qa/test-navigation-layout.cjs
node qa/test-upload-flow.cjs
```

Check the actual test filenames in `qa/` if they have changed. Run relevant existing auth, history, music, calculator, or converter suites for changes affecting those features. No tests should write to the production Supabase database. Summarize passed checks and untested external behavior accurately.
