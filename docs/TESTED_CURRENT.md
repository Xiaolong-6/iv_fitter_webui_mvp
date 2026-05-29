# Tested current — v1.7.8

Validated after single-column workflow-page cleanup and report floating-export update.

## Scope

- Report page is now a single-column reader with a draggable floating Exports panel.
- Removed Report Fit result quick-summary card.
- Moved Review diagnostics / Open bounds-parameters / Try safer model into Exports above download buttons.
- Added equivalent-circuit section above Model evaluation summary.
- Bounded Report plots in-app so chart bodies are visible and do not grow infinitely.
- User Manual is one column with Version check at the top and floating Sections locator.
- Fitting page is one column: sticky Fit setup, plots, parameters. Objective / run options / solver are inside Advanced details.
- Import data collapses after import/parse but remains reopenable.
- Model preview includes preset controls for single diode, double diode, and user-saved custom presets.

## Commands run in this environment

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Backend pytest: passed, 122 tests.
- Backend compileall: passed.

## Not verified in this environment

- Frontend Vitest and production build; run locally with `cd frontend && npm install --include=dev && npm run test -- --run --reporter=dot && npm run build`.
- Manual browser checks for draggable exports, manual section locator, sticky fit setup, and custom preset localStorage behavior.
