# Tested v1.3.16

Scope: User-manual readable-formula rendering, while preserving the earlier v1.3.14 data-unit/import safety and v1.3.15 circuit-layout work.

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

## Manual spot-check intent

After launching the app, verify the following in **User manual**:

1. Formula blocks in **Fitting logic and equations** render as readable math cards rather than plain monospace code lines.
2. The combined D1 + Rs + Rsh equation is shown in rendered form.
3. Inline formulas such as `V = IR`, `I = V / R`, `I₀`, `Rₛ`, and `Rsh` appear as compact inline math chips rather than code spans.
4. Existing **Model preview** formula cards still render correctly, because they now use the shared `MathFormula.tsx` helper.

## Notes

- The renderer is lightweight and purpose-built for this app's limited equation set.
- It is not intended to replace a full LaTeX engine.
