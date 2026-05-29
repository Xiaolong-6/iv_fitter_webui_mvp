# Tested current — v1.7.17

Validated after the v1.7.17 hard Manual containment and body-scroll fix.

## Scope

- Replaced the post-import large Import data card with a compact loaded-summary bar.
- Combined Trace selection, editable trace name, voltage/current units, point summary, and Model Builder navigation into one compact control row.
- Reworked Spreadsheet preview into grouped trace blocks with trace filter, search, copy visible rows, and CSV export controls.
- Replaced the success-like yellow page banner with a transient success toast and separate error toast styling.
- Increased the Import page maximum content width to 1600 px for data-analysis layouts on large screens.
- Fixed Manual scrolling by making the active page occupy the full workflow-shell grid height.
- Moved the User Manual title above the manual content and aligned it with the reader content width.
- Bumped root, frontend, and backend package metadata from v1.7.16 to v1.7.17.
- Saved-model schema, fit API payloads, physics model definitions, and report export schemas are unchanged.

## Commands run in this environment

```bash
cd frontend
npm install
cd ..
npm run test:frontend -- --run --reporter=dot
npm run build

cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Frontend dependency install: passed in the unpacked container.
- Frontend Vitest: passed, 11 files / 45 tests.
- Frontend production build: passed through the root `npm run build` script after routing it to `npm --prefix frontend run build`.
- Backend pytest: passed, 125 tests.
- Backend compileall: passed.

## Manual browser checks still required

1. Import page: import CSV/paste/sample data; the Import area should collapse to a 36–44 px loaded-summary bar.
2. Import page: Reopen import should restore the source controls; Add more should append a file import without replacing existing traces.
3. Trace control row: trace dropdown, editable name, voltage/current units, point count, and Model Builder action should stay on one compact row on wide screens and wrap cleanly on narrow screens.
4. Spreadsheet preview: all traces should appear as grouped sections, the selected trace group should be visually stronger, search/filter should reduce visible rows, and copy/export should use visible rows.
5. Import success feedback: success should appear as a transient green toast, not a yellow page-level warning banner.
6. Manual page: User Manual title should be visible at the top of the content width; Sections should stay vertical; the manual body should scroll.
7. Fit/Model/Report pages: verify the workflow-shell full-height rule did not regress their existing scroll behavior.

Note: browser checks are still required for the visual layout changes, especially responsive Import and Manual scrolling behavior.

## v1.7.15 Manual reader validation notes

- Manual Sections navigation now uses a vertical list across all breakpoints.
- Removed horizontal tab-mode overrides that could leave the content area blank after responsive layout switching.
- Manual active-section tracking now follows the `.doc-page` scroll container.
- Backend pytest/compileall passed in this container. Frontend build/test still requires local npm dependencies.

## v1.7.17 follow-up

- Manual title is rendered inside `.manual-reader-content-scroll`, aligned to the article body rather than the full nav+content grid.
- Manual active-section tracking and section jumps use `contentRef.current` as the scroll root, not `.doc-page` or `window`.
- The Manual shell uses fixed internal height with independent nav/body scroll containers to avoid header/dock overlap.

