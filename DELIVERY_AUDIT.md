# Delivery audit — v1.7.4

## Direct fix

v1.7.3 removed internal UI controls but accidentally failed to pass the required `language` prop into several top-level workflow pages. Components that call translation helpers then crashed during render, making Data/Import, Model, Fitting, and Report appear blank.

v1.7.4 fixes that regression by passing `language={language}` to:

- `DataImportWorkspace`
- `ModelWorkflowPage`
- `ReportWorkflowPage`
- `UserDocumentationPage`

It also hardens translation helpers so a missing language falls back to English instead of crashing the page.

## User-facing UI state

The requested declutter remains in place:

- Dock `Check newest version` remains removed.
- Start-page `External tester mode` remains removed.
- User-facing `Local release gate` remains removed.
- Parameter diagnostic controls (`Restore`, `Apply bounds`, `Seed synthetic`, `Show`, `All parameters`, `Near bound`, `Weak`, `Review parameter diagnostics`) remain removed.
- Fitting bottom duplicate Run/Stop/status action bar remains removed.
- Report action remains tied to the fit-status/check area.

## Redundancy review

Static string/helper scan found no remaining user-facing occurrences of the removed controls in `frontend/src` except unrelated words such as Help-page technical details or chart clipped-info toggles.

## Tests run

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

Result: backend pytest passed, 122 tests; compileall passed.

Frontend tests/build were not run in this sandbox because frontend dependencies are not installed.
