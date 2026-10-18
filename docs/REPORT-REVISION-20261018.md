# English report revision: 18 October 2026

The attached `LAPORAN-PROYEK-THERMPYX.docx` was checked against the existing Indonesian report; the files were identical. The original is retained.

The revised English edition includes:

- Five chapters, 18 native mathematical expressions, five tables, and 13 interface figures.
- A core-source table containing five recent journal articles and two open textbooks, plus a mapping to all seven theory topics.
- Ten open-access journal articles dated 2022–2026 in the bibliography, with publisher DOI and PDF links, and two open textbooks from 2022.
- An accurate separation of standard textbook foundations, diagnostic studies, advanced third-law research and comparisons from other disciplines. No classroom effectiveness claims are inferred from software tests.
- The current developer appearance without keychains and an unsent feedback-draft screenshot.
- DOCX, PDF, HTML and Markdown versions stored under `docs/`; no application scripts load the report or bibliography.

Source metadata, access checks, scope and correction notices are in [report-sources.md](report-sources.md) and [report-sources.json](report-sources.json). Both books have official legal PDF downloads. OpenStax lists digital ISBN **978-1-951693-60-2**. Yan's publisher record does not list an ISBN; neither book record lists a DOI. Missing identifiers are reported transparently.

The PDF was rendered and its source tables visually checked. DOCX inspection confirmed native Word equations, embedded images, five tables and active external hyperlinks. Text embedded in retained screenshots remains the original bilingual user interface; the written report and captions are English.

## Website changes and evidence

Published branch: `codex/simulator-visual-refinement`.

- Removed developer keychains, their motion logic and their captions; retained photos, profiles, intro and rounded 360° card geometry.
- Replaced the email-draft workflow with private Firebase submissions, confirmed only after a server-acknowledged write and a matching record read. Retry uses a stable submission ID.
- Current local checks passed: developer card 42, developer entrance 19, feedback 21, feedback modal 22, Firebase wrapper 83. Account, live-quiz, navigation, skills and private-flashcard regression suites also passed with fixtures.
- [Official Rules CI run 39111469190](https://github.com/thermpyx/thermpyxgsekawan/actions/runs/39111469190) passed **10 scenarios and 394 checks**, source commit `332ad514accb62dcff89f69d1269db5126e22986`, Rules SHA-256 `8fe7f0f99ce85713b1656b488acd91843cf1d18ffa3c8c14e3474a2b2c12c12b`.

These checks used fixtures and the official local emulator. No production feedback was submitted. GitHub Pages deploys frontend files; it does not publish Database Rules. **Publish the final complete [Rules](../firebase/database.rules.json) in the existing Firebase Console before expecting live feedback submissions.** See [activation and inbox instructions](EMAIL-THERMPYX.md).

[Download page](reports/index.html) · [English Word](THERMPYX-PROJECT-REPORT-EN.docx) · [English PDF](THERMPYX-PROJECT-REPORT-EN.pdf) · [English text](THERMPYX-PROJECT-REPORT-EN.md)
