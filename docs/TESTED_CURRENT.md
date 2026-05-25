# Tested current package - v1.4.38

## v1.4.38 validation

Validation performed after adding compact fit-process diagnostics and weighted reduced chi-square transparency.

Commands run:

```bash
python -m compileall -q backend/ivfitter
PYTHONPATH=backend pytest -q backend/tests/test_fit_process_diagnostics.py backend/tests/test_bounds_suggestion.py backend/tests/test_synthetic_trace.py
PYTHONPATH=backend pytest -q backend/tests
npm install
npm run build
npm run test:parameter-ui
npm run test:synthetic-ui
```

Results:

- `python -m compileall -q backend/ivfitter`: passed.
- Focused backend tests for fit-process diagnostics, data-aware bounds, and synthetic trace generation: passed, 13 tests.
- `npm run build`: passed after installing Node dependencies locally; generated build output was removed before packaging.
- `npm run test:parameter-ui`: passed.
- `npm run test:synthetic-ui`: passed.
- Full backend suite: one known pre-existing failure remains in `backend/tests/test_photocurrent_models.py::test_implicit_solver_failure_still_returns_warning_and_nan_no_fallback`. This failure was already present before this diagnostics change and is unrelated to the new fit-process diagnostics layer.

Packaging note:

- Generated folders such as `node_modules/`, `frontend/dist/`, `.pytest_cache/`, `__pycache__/`, Vite cache, and Python egg-info are excluded from the source archive.
