# TESTED 1.3.9

Validation performed for the handoff package:

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
npm install --registry=https://registry.npmjs.org/
npm run build
```

Expected: backend tests pass, backend compile succeeds, frontend root build succeeds.
