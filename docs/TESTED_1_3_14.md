# Tested v1.3.14

Validation performed for the v1.3.14 audit-fix package.

## Commands run

```text
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

## Results

- `npm install`: passed; installed frontend dependencies from the root manifest.
- `npm run build`: passed; TypeScript and Vite production build completed.
- Backend pytest: passed, 32 tests.
- Python compile check: passed.

## Source checks

- Data workspace unit selectors are now display-only. Changing V/mV/uV/kV or A/mA/uA/nA/pA updates table preview units but does not rescale `trace.voltage_V` or `trace.current_A` arrays used for fitting.
- Browser Data import now calls the backend `/api/import-csv-text-multi` endpoint and stores the returned import-quality summary in trace metadata.
- Data workspace displays rows, selected columns, dropped rows, and backend import warnings for the selected trace.
- Model Builder equivalent-circuit display was changed from disconnected HTML blocks to a left-to-right SVG schematic: Terminal+ -> main path -> Vj -> junction branches -> Terminal-.
- CSS additions were merged into `frontend/src/style.css`; no separate patch file is required.

## Manual checks still recommended on Windows

- Import a normal two-column V/I CSV and a HappyMeasure multi-trace CSV.
- Change display units and confirm the fit result does not change unless the data itself changes.
- Inspect the new equivalent-circuit panel at normal desktop size and in portrait/narrow layout.
