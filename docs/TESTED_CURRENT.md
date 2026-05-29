# Tested current — v1.7.11

Validated after fixing the Data Import blank-page regression and completing a cleanup/audit pass.

## Scope

- Fixed the Data Import page crash that appeared after data was loaded. Root cause: `DataImportWorkspace` rendered `DatasetNameInput` in the loaded-data Trace selection card, but the component was not defined.
- Added a local `DatasetNameInput` component with safe commit behavior: blur/Enter commits the trace name; Escape restores the previous value.
- Fixed frontend build regressions from recent UI cleanup:
  - `SyntheticTraceTool` now receives the required `language` prop.
  - `parameterGrouping.ts` now has a local `updateComponentParams` helper used by component-level Fit/Fix actions.
  - Report resize callback typing is explicit.
- Fixed the misplaced SimpleChart zero-line test that made Vitest fail.
- Cleaned stale documentation references to removed/old UI patterns: old Import quality card, old two-row Data page layout, local release gate as a user-facing UI, and old v1.5 audit handoff notes.
- Archived obsolete v1.5 audit markdown files under `docs/archive/v1_5_audits/`.
- No fitting physics, backend API, saved-model schema, or report numerical logic changed.

## Commands run in this environment

```bash
cd frontend
npm install --include=dev
npm run test -- --run --reporter=dot
npm run build

cd ../backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Frontend dependency install: passed, 153 packages installed, 0 vulnerabilities reported by npm audit.
- Frontend Vitest: passed, 11 files / 45 tests.
- Frontend production build: passed (`tsc && vite build`).
- Backend pytest: passed, 122 tests.
- Backend compileall: passed.

## Manual browser checks still required

1. Import page: load CSV/paste/sample data; page should not go blank after data loads.
2. Import page: collapsed Import data card should reopen and allow a second import.
3. Trace selection: rename selected trace; blur/Enter commits, Escape reverts.
4. Spreadsheet preview: all loaded traces are visible and the selected trace is highlighted.
5. Fit page: one-column page scrolls; Advanced popover floats and closes on outside click.
6. User Manual: one-column page scrolls; Sections locator remains usable.
7. Report page: plots render visibly in-app and exported HTML still matches report order.
