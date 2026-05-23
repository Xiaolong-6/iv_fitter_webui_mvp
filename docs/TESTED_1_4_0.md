# Tested v1.4.0

Scope: photocurrent/light-response modeling, Model Builder availability, rendered formula preview, warnings, and documentation.

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

## Manual browser test

1. Open the app and go to **Workspace → Model Builder**.
2. Use **Add** under Junction branches to add `Constant photocurrent source`, `Voltage-dependent photocurrent`, or `Photoconductive branch`; use Main path to add `Photo-modulated main path`.
3. Confirm the equivalent circuit and formula preview show the selected light-response term by name/form, and confirm the old phrase `Read main path, then downward from Vj` is not visible.
