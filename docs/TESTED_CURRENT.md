# Tested current version

Version: v1.5.17

Validated in this package:

- Backend pytest suite.
- Backend compileall.
- Frontend Vitest suite.
- Frontend production build.

Key change: internal frontend stability refactor. Fit lifecycle and report artifact rules are now centralized in pure helpers and covered by regression tests; existing UI behavior is preserved.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm run test
npm run build
```

Expected result:

- Backend tests pass.
- Backend package and tests compile.
- Frontend unit tests pass.
- Frontend production build passes.

Manual checks recommended:

1. Run a normal fit and confirm status, Parameters table, and Report behavior match v1.5.16.
2. Start a fit, press Stop fit, then start a new fit; confirm late/old results do not overwrite the workspace.
3. Generate and download reports; confirm filenames still use the selected trace label and timestamp.
