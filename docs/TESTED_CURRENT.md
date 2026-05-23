# Tested current package — v1.4.18

## v1.4.18 validation

Validated stabilization refactor with:

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

Expected results: frontend build passes, backend tests pass, compileall passes. Regression tests cover extracted Model Builder rules/mutations, backend reportability, metrics, and multistart helpers.

## v1.4.18 semantic consistency checks

Validated semantic-consistency hotfixes for backend model validation and reportability. Regression coverage includes:

- location/placement/evaluation-form coherence errors;
- duplicate same law/form/placement/polarity components as non-reportable errors;
- bypassed JSON that cannot become reportable when semantically incoherent;
- voltage-dependent photocurrent with negative `gain_per_V` cannot produce negative magnitude.
