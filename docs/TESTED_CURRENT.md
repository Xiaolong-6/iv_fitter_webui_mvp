# Tested current

Version: v1.8.18
Date: 2026-05-30

## Scope

Audit-hardening and stabilization package for Branch20260528 after the v1.8.17 Model Builder polish release. This package addresses the security, availability, API-versioning, importer-structure, and FittingPage testability issues identified during the audit pass.

## Verification run against this tree

- Backend tests: `PYTHONPATH=backend pytest -q backend/tests` passed.
- Backend compile checks: `python -m py_compile backend/ivfitter/api/main.py backend/ivfitter/components/custom.py backend/ivfitter/core/fitting_engine.py backend/ivfitter/io/import_trace.py backend/ivfitter/io/_column_detection.py backend/ivfitter/io/_happymeasure_sections.py` passed.
- Frontend tests: `npm --prefix frontend test -- --run` passed: 14 test files, 107 tests.
- Frontend build: `npm --prefix frontend run build` passed. Vite still emits the existing non-blocking `@xyflow/react` module directive warning and the large single-chunk warning.

## What changed

- API token validation now uses timing-safe comparison.
- Custom expressions validate and compile the same parsed AST.
- CPU-heavy endpoints are protected by a bounded semaphore.
- The backend has a lightweight token-bucket request limiter; set `IVFITTER_RATE_LIMIT_PER_MIN=0` to disable during local debugging.
- SciPy optimizer calls now sit behind an API-level timeout wrapper. The underlying SciPy worker cannot be force-killed safely, so concurrency limits remain necessary and are part of this version.
- The local file picker runs in a subprocess with a timeout instead of blocking the uvicorn worker indefinitely.
- Existing `/api/...` endpoints remain available; `/api/v2/...` aliases are now present, and the frontend calls v2 routes.
- `import_trace.py` was split into column-detection and HappyMeasure-section helper modules.
- `FittingPage` now uses reducer-backed page state instead of many independent top-level state hooks.
- `FittingPage` has smoke and mocked import/fit flow tests.
- `pyinstaller` moved out of runtime requirements into the backend build extra.

## Manual browser verification for a non-coder

1. Start the app with the normal root launcher, open the browser UI, and confirm the sidebar shows version `v1.8.18`.
2. Go to Data, paste a small `Voltage (V), Current (A)` table, parse it, then go to Fitting and run a fit; confirm the status changes from running to a fitted verdict and the parameter area updates.
3. Open Report after the fit and export HTML; confirm the equivalent-circuit section is present in the exported report.

## Known non-blocking notes

- Vite reports a large bundle warning because the MVP is still shipped as a single main client bundle with React Flow and KaTeX. This is performance cleanup work, not a correctness failure.
- The API-level timeout returns control to the client, but SciPy itself cannot be forcibly killed inside Python safely; bounded concurrency prevents stale optimizer work from saturating the app.
