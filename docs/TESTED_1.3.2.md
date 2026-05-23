# TESTED 1.3.2

Validation target: `iv_fitter_webui_mvp_v1_3_2_law_form_import_docs.zip`.

## Automated checks run

```text
PYTHONPATH=backend python -m pytest backend/tests -q
20 passed
```

```text
python -m compileall -q backend/ivfitter backend/tests
passed
```

```text
cd frontend
npm install
npm run build
passed
```

## Functional changes checked by tests/build

- HappyMeasure-style import with metadata rows and `source_voltage_V` / `measured_current_A` columns is parsed.
- Registry exposes law/form/placement semantics for ohmic components.
- Frontend TypeScript build validates updated registry fields and blank startup state.

## Manual checks still recommended

- Start app with `04_run_dev.bat` and confirm no trace is preloaded.
- Confirm Run fit is disabled until a file is imported or synthetic trace is explicitly loaded.
- Import a real HappyMeasure CSV and confirm the selected voltage/current columns and row counts.
- Review Function guide and Fit & convergence tabs for user-facing clarity.
