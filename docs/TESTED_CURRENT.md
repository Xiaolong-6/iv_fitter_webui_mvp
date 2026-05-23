# Tested current package — v1.4.11

Scope: v1.4.11 plot trace selector, plus retained HappyMeasure import/sample-data regression coverage.

## What changed

- `import_csv_text()` now reads the explicit HappyMeasure `# section,data` table instead of letting the earlier trace-metadata table become the pandas header.
- The importer now accepts explicit selected columns such as `Voltage_V` plus one measured trace column from a HappyMeasure combined wide-v2 file.
- Added `examples/testdata/happymeasure_combined_wide_v2_anonymized.csv` as a de-identified regression fixture.
- Replaced the older mock example dataset with `examples/mock_iv_trace_webui_test.csv` using a generic trace label.

## Commands run

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

## Results

- `npm install`: passed
- `npm run build`: passed
- `PYTHONPATH=backend python -m pytest backend/tests -q`: passed
- `python -m compileall -q backend/ivfitter backend/tests`: passed

## Manual browser check

1. Open Data and import `examples/testdata/happymeasure_combined_wide_v2_anonymized.csv`.
2. Confirm the trace selector shows 14 imported traces.
3. Confirm the first trace imports with `Voltage_V` as voltage and `T001 Device_14 [Current_A]` as current without a selected-column error.


## v1.4.10 sample-data verification

- Confirmed `examples/testdata/happymeasure_combined_wide_v2_anonymized.csv` preserves the full row count of the uploaded HappyMeasure combined wide-v2 fixture.
- Confirmed the anonymized fixture contains 14 trace columns and no `HPQ` sample identifiers or `COM3` port string.
- Confirmed the browser sample loader now imports the full HappyMeasure fixture through the backend `importCsvTextMulti` path instead of constructing the old synthetic trace in memory.


## v1.4.11 plot selector verification

- Confirmed the Plots header no longer shows the redundant selected-trace explanatory sentence.
- Confirmed the Plots header includes a trace selector for multi-trace imports.
- Confirmed trace switching from the Plots section uses the same selected-trace state as the Data page and clears stale fit/report results before the next fit.
