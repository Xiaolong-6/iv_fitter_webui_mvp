# Tested current — v1.5.29

Validation target: v1.5.29 audit principles and validation polish.

Changes validated:

- Added `docs/DEVELOPMENT_PRINCIPLES.md` and linked it from the current agent handoff and documentation index.
- Updated stale current-version labels in README and handoff metadata.
- Consolidated backend model evaluation to the shared stable `softplus` helper.
- Added explicit `missing_direction_sign` validation warning for photocurrent/bias-dependent current models that rely on the legacy default sign.
- Clarified the reduced-χ²-like metric as relative/weighting-dependent in UI, docs, and report text while preserving metric keys.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm install
npm run test -- --run
npm run build
```

Observed result:

- Backend pytest: passed, 124 tests.
- Backend compileall: passed.
- Frontend Vitest: passed, 8 files / 27 tests.
- Frontend production build: passed.

Manual UI checks recommended: Model Builder / Model Preview independent scroll, Fitting Parameters internal scroll, Fit process relative reduced-χ² tooltip, Report page exports, and HTML report content.
