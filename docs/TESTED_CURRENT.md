# Tested current package — v1.4.17

## v1.4.17 validation

Validated stabilization refactor with:

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

Expected results: frontend build passes, backend tests pass, compileall passes. Regression tests cover extracted Model Builder rules/mutations, backend reportability, metrics, and multistart helpers.
