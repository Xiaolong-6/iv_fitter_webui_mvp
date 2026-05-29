# Tested current — v1.7.23

## v1.7.23 Model Builder schematic readability validation
- Polished the interactive equivalent-circuit canvas for better schematic readability after screenshot review.
- Fixed terminal-label layering and reduced nested component-row scrollbars.
- Kept the fixed-topology/no-drag ModelSpec-compatible design.

Scope validated in this container:

- Model Builder now renders a visual equivalent-circuit canvas with Vext, Vi, V=0, a main-path zone, and a junction-branch zone.
- No arbitrary free-form SPICE topology or drag-and-drop wiring was added.
- Existing backend ModelSpec remains the single data contract.
- Component cards can be selected and edited through a right-side inspector.
- Inspector supports nickname, polarity, custom expression, initial parameter value, fit toggle, lower bound, and upper bound edits.
- Preset selection still replaces the current model rather than appending to it.
- Regression tests cover single-diode rendering, component selection, double-diode preset replacement, and ModelSpec parameter roundtrip.

Commands run:

```bash
npm --prefix frontend install
npm run build
npm run test:frontend -- --run --reporter=dot

cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

Observed result:

- Frontend build: passed.
- Frontend Vitest: passed, 12 files / 49 tests.
- Backend pytest: passed, 125 tests.
- Backend compileall: passed.

## Previous current records


Additional v1.7.21 checks:
- Manual no longer renders the compact Version and updates panel.
- App startup/refresh calls the read-only GitHub release checker from the main workflow shell.
- Dock version number is clickable and simulates the highlighted NEW release entry for UI testing.
- NEW appears beside the dock version when expanded and below the version when collapsed.
- Import loaded summary keeps loaded state, trace count, point count, source, Reopen import, and Add more on one compact row when space allows.
## v1.7.21 Import alignment / horizontal spreadsheet validation

- Import trace control row updated so Trace, Name, Units, status pill, and Model Builder align on the same control baseline.
- Spreadsheet preview now arranges traces horizontally as side-by-side V/I column groups.
- Trace dropdown in Spreadsheet preview remains a jump control only.

## v1.7.20 Automatic update badge / one-line import bar validation

- Manual uses one webpage-style scroll root with a floating vertical section rail; no independent body/nav scroll panels are used.
- Spreadsheet preview keeps all traces visible simultaneously; the trace menu only jumps to a trace group.
- Obsolete archived v1.5 audit/self-audit markdown files are excluded from the active release package.


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
