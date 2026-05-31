
## v1.8.29 validation

- `npm --prefix frontend test -- --run`: passed, 14 files / 113 tests.
- `npm --prefix frontend run build`: passed; existing non-blocking Vite warnings remain.
- `PYTHONPATH=backend pytest -q backend/tests`: passed.
- Backend `py_compile` smoke check: passed.

# Tested current status

Version: v1.8.25

Scope: UI/frontend iteration on top of Branch20260528 audit-fixed line.

## Passed in this handoff

```bash
npm --prefix frontend test -- --run
```

Result: passed, 14 test files / 111 tests.

```bash
npm --prefix frontend run build
```

Result: passed. Non-blocking warnings remain: `@xyflow/react` module-level `use client` directive ignored by Vite, and the JS bundle exceeds Vite's default 500 kB warning threshold.

```bash
PYTHONPATH=backend pytest -q backend/tests
```

Result: passed.

```bash
python -m py_compile backend/ivfitter/api/main.py backend/ivfitter/components/custom.py backend/ivfitter/core/fitting_engine.py backend/ivfitter/io/import_trace.py backend/ivfitter/io/_column_detection.py backend/ivfitter/io/_happymeasure_sections.py
```

Result: passed.

## Manual checks still recommended

1. Launch with `04_run_dev.bat` and confirm sidebar version is `v1.8.25`.
2. Check Model Builder canvas layout at 100%, 150%, and 200% app zoom.
3. Run one synthetic or pasted trace through Model → Fitting → Report.
4. Export HTML and confirm equations/circuit remain readable.
