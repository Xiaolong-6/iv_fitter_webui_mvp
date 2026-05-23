# Tested 1.3.2

Scope:

- Law / Form / Placement model semantics.
- Richer user-facing documentation tabs.
- Fit & convergence documentation aligned to the actual solver/optimizer flow.
- HappyMeasure-style CSV import compatibility.
- No automatic synthetic trace at startup.
- Readable formula blocks in the UI.

Validation commands used for the handoff package:

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend && npm install && npm run build
```
