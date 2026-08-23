# A-Level fork notes

This branch is based on upstream tag `1.5.3` and installs as the separate Obsidian plugin `cbt-exam-alevel`. It intentionally does not replace the upstream `cbt-exam` plugin.

## Preserved custom behavior

- Restore unfinished attempts from local storage, scoped by source path and `exam-range`.
- Require grading for answered SA/LA questions before an attempt enters History.
- Keep both manual grading and file-based external AI-agent grading.
- Preserve grading provenance, confidence, rationale, question order/type, and range in History.
- Support stable `qid` and `topic` metadata in question headers.
- Open rendered internal Obsidian links in a new tab.
- Send incorrect written responses to the expression inbox from History.

## AI grading handoff

Requests are written to `exam/practice/cbt/ai-grading/requests/` and results are read from `exam/practice/cbt/ai-grading/results/`. Only the plugin writes the final CBT History attempt after validating and importing a result.

## Build and local install

```powershell
npm ci
npm run lint
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` to `.obsidian/plugins/cbt-exam-alevel/` in the target vault. Keep the upstream plugin disabled while smoke-testing this fork so both plugins do not register the same exam view at once.
