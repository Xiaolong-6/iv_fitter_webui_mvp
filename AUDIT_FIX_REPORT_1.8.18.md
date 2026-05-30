# IV-fitter Web UI audit fix report — v1.8.18

Date: 2026-05-30
Base: Branch20260528 / v1.8.17
Result: audit-hardening and stabilization package prepared as v1.8.18.

## Closed audit items

- SEC-1: API token validation now uses timing-safe comparison.
- SEC-2: custom expressions validate and compile the same parsed AST before evaluation.
- ARCH-1: the local file-dialog endpoint now runs the blocking Tk dialog in a bounded subprocess instead of freezing the uvicorn worker indefinitely.
- ARCH-2: SciPy optimizer calls are wrapped by an API-level timeout path that returns a `fit_timeout` result to the client. SciPy itself cannot be safely force-killed mid-call, so this is paired with backend concurrency limiting.
- ARCH-3: `FittingPage` now uses reducer-backed grouped page state instead of many independent top-level state hooks.
- PERF-1: CPU-heavy endpoints are protected by a bounded semaphore controlled by `IVFITTER_MAX_CONCURRENT_FITS`.
- PERF-2: the backend includes a lightweight token-bucket request limiter controlled by `IVFITTER_RATE_LIMIT_PER_MIN`.
- QUAL-1: multi-import warning deduplication now uses insertion-ordered keyed collection rather than repeated list membership scans.
- QUAL-2: public selected filename normalization now uses a single Windows/POSIX-safe basename operation.
- QUAL-3: import parsing helpers were split into focused column-detection and HappyMeasure-section modules.
- QUAL-4: LAN-mode token behavior was already present in the provided v1.8.17 snapshot and was preserved.
- ARCH-4: `/api/v2/...` aliases are now available while legacy `/api/...` routes remain available; the frontend now calls v2 routes.
- QUAL-5: PyInstaller moved out of runtime requirements and into the backend build extra.
- QUAL-6: multistart low-discrepancy sampling is documented.
- QUAL-7: `FittingPage` has component-level smoke and mocked import/fit flow tests.

## Extra issues fixed during self-check

- Replaced a brittle backend test that checked for the literal string `toExponential(3)` with behavior-oriented checks for the shared frontend formatting path.
- Fixed the Model page composition so the synthetic/debug tool passed by `FittingPage` is actually rendered instead of being discarded.
- Stabilized frontend Vitest execution by using a threads pool with non-isolated workers; the standard frontend test command now exits cleanly.

## Verification commands run

- `PYTHONPATH=backend pytest -q backend/tests` — passed, 132 collected backend tests.
- `python -m py_compile backend/ivfitter/api/main.py backend/ivfitter/components/custom.py backend/ivfitter/core/fitting_engine.py backend/ivfitter/io/import_trace.py backend/ivfitter/io/_column_detection.py backend/ivfitter/io/_happymeasure_sections.py` — passed.
- `npm --prefix frontend test -- --run` — passed, 14 test files / 107 tests.
- `npm --prefix frontend run build` — passed.

## Remaining non-blocking notes

- Vite still emits the existing `@xyflow/react` module-directive warning and a large-bundle warning. These are build warnings, not current test/build failures.
- The timeout wrapper returns control to the API/client but does not forcibly kill SciPy internals. Bounded concurrency is therefore required and should not be removed.
- No manual browser session was performed in this environment; `docs/TESTED_CURRENT.md` lists the recommended manual smoke checks before publication.
