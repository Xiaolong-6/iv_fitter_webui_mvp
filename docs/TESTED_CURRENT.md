# Tested current — v1.7.13

Validated after the v1.7.13 audit-hardening and Manual portrait-fix pass.

## Scope

- Restricted `/api/open-import-file-dialog` to localhost/loopback requests for LAN safety.
- Tightened CORS to explicit GET/POST/OPTIONS methods and the current request headers.
- Increased legacy junction-solver bracket robustness and aligned graph-solver bias-dependent current softplus math.
- Fixed Manual portrait responsive behavior so Sections remain vertically stacked and scrollable.
- Bumped root, frontend, and backend package metadata from v1.7.12 to v1.7.13.
- Saved-model schema and report export schemas are unchanged.

## Commands run in this environment

```bash
npm run test:frontend -- --run --reporter=dot
npm run build

cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Frontend Vitest: not run here because `vitest` is not installed in `frontend/node_modules` in this unpacked container (`sh: 1: vitest: not found`).
- Frontend production build: attempted with `npm run build`, but failed because frontend dependencies are not installed in this unpacked container (`react`, `react/jsx-runtime`, Vite/TypeScript ambient types unavailable). Run after `npm install` locally.
- Backend pytest: passed, 125 tests.
- Backend compileall: passed.

## Manual browser checks still required

1. Import page: load CSV/paste/sample data; page should not go blank after data loads.
2. Import page: collapsed Import data card should reopen and allow a second import.
3. Trace selection: rename selected trace; blur/Enter commits, Escape reverts.
4. Spreadsheet preview: all loaded traces are visible and the selected trace is highlighted.
5. Fit page: one-column page scrolls; Advanced popover floats and closes on outside click.
6. User Manual: one-column page scrolls; in portrait viewport, Sections locator remains vertical and scrollable, not horizontal tabs.
7. Report page: plots render visibly in-app and exported HTML still matches report order.


Note: frontend dependency execution may depend on the local npm cache/mirror. Run `npm run test:frontend -- --run --reporter=dot` and `npm run build` locally before tagging if this container cannot execute them.
