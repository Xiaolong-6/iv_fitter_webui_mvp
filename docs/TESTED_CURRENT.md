# Tested current version

Version: v1.5.16

Validated in this package:

- Backend pytest suite.
- Backend compileall.
- Frontend Vitest suite.
- Frontend production build.

Key change: the frontend now has a formal Vitest test foundation covering parameter formatting, diagnostics, bounds suggestions, model-builder rules, and representative i18n keys.

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

1. Open the app and confirm the existing Fit setup bottom dock and compact diagnostics still render normally.
2. Run a normal fit and confirm the Parameters table/report buttons still update from the current completed fit.
3. Run `cd frontend && npm run test:watch` during future UI/model iterations when editing model-builder, diagnostics, bounds, formatting, or i18n logic.
