# Tested 1.3.3

Validation target: `iv_fitter_webui_mvp_v1_3_3_happymeasure_multitrace_plot_safety.zip`.

Checks performed:

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend && npm install && npm run build
```

Expected behavior to manually verify:

```text
- App starts with no loaded trace.
- HappyMeasure single-v2, wide-v2, and long-v2 CSV files import correctly.
- Multi-trace imports show a trace list and selected trace for fitting.
- Run fit uses only the selected trace.
- Fit lines are not filled or stitched across traces.
- Negative signs and partial scientific notation can be typed in numeric text boxes without NaN.
- Equation preview describes the selected model equivalent circuit and solution logic.
- User guide, Function guide, Fitting logic, and Fit & convergence tabs match the current UI behavior.
```
