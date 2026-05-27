# Tested current — v1.5.28

Validation target: v1.5.28 fit/report UI stabilization.

Run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm run test -- --run
npm run build
```

Manual UI checks recommended: Data page layout, Fitting landscape layout, compact Parameters table, Report page exports, and HTML report content.
