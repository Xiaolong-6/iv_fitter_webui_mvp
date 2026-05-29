# Tested current — v1.7.12

Validated after the v1.7.12 version-consistency self-check.

## Scope

- Bumped root, frontend, and backend package metadata from v1.7.11 to v1.7.12.
- Fixed the stale README current-version label that still reported v1.6.0.
- Removed a duplicate embedded changelog header and repeated historical release snippets.
- Revalidated the current v1.7.12 tree after the version/doc cleanup.
- No fitting physics, backend API, saved-model schema, or report numerical logic changed.

## Commands run in this environment

```bash
npm run test:frontend -- --run --reporter=dot
npm run build

cd backend
..\.venv\Scripts\python.exe -m pytest -q
..\.venv\Scripts\python.exe -m compileall -q ivfitter
```

## Observed result

- Frontend Vitest: passed, 11 files / 45 tests.
- Frontend production build: passed (`tsc -p frontend/tsconfig.json && vite build`).
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
