# Tested current — v1.7.5

Validated after converting the Import/Data and Model pages to webpage-style vertical layouts.

## Scope

- Import/Data page now scrolls naturally in this order: Import data, Trace selection, Plot review, Spreadsheet preview.
- Trace selection, Plot review, and Spreadsheet preview are hidden when no data is loaded.
- Import/Data cards now share a fixed maximum content width instead of stretching across the full viewport.
- Model page now stacks Model Builder above Model preview instead of using a resizable two-column split.
- Duplicated outer section titles around Model Builder and Model preview were removed; the inner component headings remain.
- The requested user-facing declutter remains in place: no dock Check newest version, no Start-page External tester mode, no Local release gate, no parameter diagnostic filter controls, and no bottom Fitting action/status bar.

## Commands run in this environment

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Backend pytest: passed, 122 tests.
- Backend compileall: passed.
- Static source check: Import page no longer renders Trace selection / Plot review / Spreadsheet preview without data.
- Static source check: Model page no longer renders the resizable split pane or outer duplicate section headers.
- Static source check: removed internal user-facing strings from v1.7.3 remain absent.

## Not verified in this environment

- Frontend Vitest/build: not run here because frontend dependencies are not installed in the sandbox. Use the v1.7.2 dependency-repair workflow locally if needed.
- Manual browser smoke test.

## Manual browser checks required

1. Open Import/Data page with no data: only Import data should appear; Trace selection, Plot review, and Spreadsheet preview should be hidden.
2. Load sample or CSV data: panels should appear below Import data in a natural vertical scroll order.
3. Resize browser wide and narrow: Data page panels should keep a readable maximum width and remain centered.
4. Open Model page: Model Builder should appear first and Model preview directly underneath.
5. Confirm the duplicate outer titles around Model Builder / Model preview are gone.
6. Re-open Fitting and Report pages to confirm the v1.7.4 blank-page fix remains intact.
