# Delivery audit — v1.7.6

## Direct change

v1.7.6 aligns the in-app Report page with the exported HTML report. The Report control/export panel is moved from the right side to the left side while keeping the previous side-panel width behavior. The report document body now follows one compact, reading-friendly order in both UI and HTML export.

## Required report order

Both the in-app Report page and the exported HTML follow this order:

1. IV-fitter report
2. Warnings and diagnostics
3. Critical issue
4. Fit process and quality metrics
5. Parameters
6. Plots
7. Model evaluation summary
8. Generated report text

## Fitted-parameter formatting

Report parameter names now use equation-aligned `component.parameter` display keys, so fitted values correspond more directly to the model/equation summary.

## Tests run

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

Result: backend pytest passed, 122 tests; compileall passed.

Frontend tests/build were not run in this sandbox because frontend dependencies are not installed.
