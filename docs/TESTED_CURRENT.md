# Tested current — v1.5.36

Validated after the structural cleanup series: CSS modularization, FittingPage extraction, stylesheet ownership documentation, and release-candidate external audit.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm install
npm run test -- --run --reporter=dot
npm run build
```

Observed results:

- Backend pytest: passed, 122 tests.
- Backend compileall: passed.
- Frontend Vitest: passed, 8 files / 27 tests.
- Frontend production build: passed.

Manual browser checks still required before tagging:

1. Data / Model / Fitting / Report / Manual at 100%, 125%, and 150% zoom.
2. Low-height landscape and narrow/portrait layouts.
3. Model Builder and Model Preview independent scrolling.
4. Fit setup height containment and parameter-table compactness.
5. Report model explanation and export buttons.
6. Manual left navigation and scroll behavior.
