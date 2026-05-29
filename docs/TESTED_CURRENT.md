# Tested current — v1.7.18

Validated after reverting the Manual reader to one continuous webpage-style scroll root.

## Scope

- Manual no longer uses a two-column independent-scroll reader.
- `User Manual`, release status, Sections, and the manual content are in one normal vertical document flow.
- `.manual-doc-page` is the single Manual scroll root.
- Sections remain vertical and visible as a normal directory block; they do not become horizontal tabs and do not create a second scrollbar.
- Section active-state tracking and section jumps use the page scroll root.
- Import-page changes from v1.7.16 are retained.
- Backend API, fitting physics, saved-model schema, and report export schemas are unchanged.

## Commands run in this environment

```bash
npm --prefix frontend install
npm run test:frontend -- --run --reporter=dot
npm run build

cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Frontend Vitest: passed, 11 files / 45 tests.
- Frontend production build: passed through root `npm run build`.
- Backend pytest: passed, 125 tests.
- Backend compileall: passed.

## Manual browser checks still required

1. Manual page should scroll like a normal webpage with one continuous scrollbar.
2. Manual page should not show independent left/right content scrollbars.
3. Sections should appear as a vertical directory block, not horizontal tabs.
4. `User Manual` title should be visible at the top of the same content column and not hidden under the app dock/header.
5. Clicking a Section should scroll the normal page to the corresponding section.
