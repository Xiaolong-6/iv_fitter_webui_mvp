# Final audit — v1.9.6 verification-fix package

## Bottom line

v1.9.6 is the corrected single package after the earlier staged v1.9.1–v1.9.5 attempt. It fixes the frontend test failures left in v1.9.5 and is now suitable for source-level internal testing. It is still not a public release until the browser/manual and Windows-portable checks listed below are completed.

## What was fixed now

1. `frontend/src/model-builder-v3/state/reducer.ts`
   - Fixed `handleToPort` so `handle === "node"` is treated as a node/terminal handle, not as a component `n` port.
   - This repaired invalid V/GND wire creation introduced by the v1.9.1 handle-ID hardening.

2. `frontend/src/pages/__tests__/FittingPage.test.tsx`
   - Updated the synthetic-trace toolbar assertion to the current V3 direct-shell DOM (`.mbv3-shell`).
   - The old test was still looking for the removed legacy `.model-webpage-stack` wrapper.

3. Version/test-status metadata
   - Synchronized root, frontend, and backend package metadata to `1.9.6`.
   - Updated `docs/TESTED_CURRENT.md`, `docs/WEBUI_AGENT_HANDOFF.md`, and `CHANGELOG.md` with the actual validation status.

## Automated verification actually run

Frontend:

```bash
cd frontend
npm ci --no-audit --no-fund
npm run test -- --run --reporter=dot
npm run build
```

Result: passed. Vitest reported 17 passed test files and 130 passed tests. Production build passed with non-blocking Vite warnings about `@xyflow/react`'s module-level `use client` directive and a large generated JS chunk.

Backend:

```bash
cd backend
python3 -m compileall -q ivfitter
python3 -m pytest -q
```

Result: passed, pytest exit code 0.

## What is included from the staged work

- Model Builder V3 component port handle hardening with distinct React Flow source/target handle IDs and one visible physical port dot.
- Inspector polarity toggle and canvas REV badge for orientation-sensitive components.
- Backend graph_dc graph-native parameter selection when an explicit graph is present.
- Frontend compile/reducer tests and backend graph_dc contract tests for V3 parameter/polarity behavior.
- Release smoke-test checklist, canonical demo CSVs, colleague testing docs, PROJECT_RULES cleanup, API alias lifecycle note, and `useFitTimer` extraction.

## Not done / not verified here

1. Browser manual drag-connect test was not run.
   - Reason: this container does not provide an interactive browser session for manual React Flow drag testing.
   - Required user check: test connecting both component ends and terminals in the real UI.

2. Browser fit/report/export smoke test was not run end-to-end.
   - Reason: requires interactive UI review and file download/export inspection.
   - Required user check: import demo CSV → choose model → edit polarity → fit/stop/rerun → export HTML/CSV/JSON.

3. Windows portable `.exe` package was not built.
   - Reason: this Linux container cannot validate the Windows batch/electron packaging path.
   - Required user check: run the Windows build script locally if a colleague-ready executable is needed.

4. Large-file/source-maintainability refactors remain partial.
   - Done: `useFitTimer` extracted and documentation/API cleanup performed.
   - Not done: full `FittingPage.tsx`, `DataImportWorkspace.tsx`, and Model Builder CSS modularization.
   - Reason: those are non-blocking maintainability refactors and would risk destabilizing the now-passing test/build state.

## Release recommendation

Use v1.9.6 as the next internal source test package. Do not call it a public release until the manual browser checks and Windows portable build validation pass.
