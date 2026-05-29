# Tested current — v1.7.6

Validated after aligning the in-app Report page with the exported HTML report structure.

## Scope

- Report side/control panel moved from the right to the left while preserving the original side-panel default width.
- In-app Report page and exported HTML now use the same section order:
  1. IV-fitter report
  2. Warnings and diagnostics
  3. Critical issue
  4. Fit process and quality metrics
  5. Parameters
  6. Plots
  7. Model evaluation summary
  8. Generated report text
- Fit process and quality metrics are displayed as a compact three-column table: parameter, value, and explanation.
- Metrics include quality metrics, solver-process values, and this-session counters.
- Report parameter rows now use equation-aligned names such as component.parameter so the fitted parameters align with the model evaluation summary.
- In-app Report body includes plots in the same position as the exported HTML.
- Kept v1.7.5 webpage-style Import/Data and Model layouts intact.
- Kept v1.7.4 workflow-page blank-state fix and v1.7.3 user-facing declutter intact.

## Commands run in this environment

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Backend pytest: passed, 122 tests.
- Backend compileall: passed.
- Static source check: ReportWorkflowPage renders the left control panel before the report body.
- Static source check: in-app report section headings follow the requested order.
- Static source check: exported HTML section headings follow the requested order.
- Static source check: Report parameters use equation-aligned component.parameter display keys.

## Not verified in this environment

- Frontend Vitest/build: not run here because frontend dependencies are not installed in the sandbox. Use the v1.7.2 dependency-repair workflow locally if needed.
- Manual browser smoke test.

## Manual browser checks required

1. Open Report page after a fit: the control/export panel should be on the left.
2. Confirm the left control/export panel keeps the previous default width and the report body uses the remaining width.
3. Confirm the report body reads in this order: IV-fitter report, Warnings and diagnostics, Critical issue, Fit process and quality metrics, Parameters, Plots, Model evaluation summary, Generated report text.
4. Export HTML and confirm the section order matches the in-app Report page.
5. Confirm the Fit process and quality metrics table has three compact columns: parameter, value, explanation.
6. Confirm fitted parameter names use the same component.parameter style as the model/equation summary.
7. Re-open Import/Data and Model pages to confirm v1.7.5 webpage-style layout remains intact.
