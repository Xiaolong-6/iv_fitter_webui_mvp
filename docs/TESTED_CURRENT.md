# Tested current — v1.7.4

Validated after repairing the v1.7.3 blank-page regression caused by missing language props during UI decluttering.

## Scope

- Data, Model, Fitting, Report, and Help/User Manual routes now receive the current language prop from `FittingPage`.
- `t()` in `model/i18n.ts` now falls back to English if language is accidentally omitted.
- Report-page `rt()` helper now also falls back to English if language is accidentally omitted.
- The requested v1.7.3 UI declutter remains in place: no dock Check newest version, no Start-page External tester mode, no Local release gate, no parameter diagnostic filter controls, and no bottom Fitting action/status bar.

## Commands run in this environment

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Backend pytest: passed, 122 tests.
- Backend compileall: passed.
- Static source check: no remaining missing top-level language prop for DataImportWorkspace, ModelWorkflowPage, ReportWorkflowPage, or UserDocumentationPage in FittingPage.

## Not verified in this environment

- Frontend Vitest/build: not run here because frontend dependencies are not installed in the sandbox. Use the v1.7.2 dependency-repair workflow locally if needed.
- Manual browser smoke test.

## Manual browser checks required

1. Open Data/Import page: page content should render, import panel should be visible.
2. Open Model page: Model Builder and Model preview should render.
3. Open Fitting page: Fit setup, plots, and parameter table should render; bottom duplicate action/status bar should remain absent.
4. Open Report page: report/status layout should render even with no fit result.
5. Switch language EN/ZH and re-open all four workflow pages.
