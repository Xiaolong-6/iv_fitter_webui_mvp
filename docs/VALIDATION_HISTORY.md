## v1.7.23
- Polished the v1.7.22 interactive Model Builder schematic layout after screenshot review.
- Kept fixed topology and no drag-and-drop.
- Improved terminal labels, canvas width, internal row overflow, component markers, and inspector proportions.

# Validation history

## v1.7.22

- Replaced Model Builder list editing with an interactive equivalent-circuit canvas and fixed topology zones.
- Preserved the backend ModelSpec schema and fitting behavior.
- Added component-card selection and right-side inspector editing for names, polarity, parameters, fit toggles, and bounds.
- Added frontend tests for rendering, inspector selection, preset replacement, and parameter roundtrip.
- Frontend build/Vitest passed; backend pytest/compileall passed.


## v1.7.21

- Fixed Import trace-control vertical alignment after compact-row conversion.
- Reworked Spreadsheet preview to compare all traces horizontally rather than stacking trace groups vertically.

## v1.7.20
- Moved update checking out of the Manual page and into startup/refresh flow.
- Added dock NEW release badge behavior plus a version-click simulation shortcut for testing.
- Preserved one-line loaded import summary layout with inline source and actions.

## v1.7.19

- Replaced Manual section directory with a slim floating vertical section rail using shaped nodes and hover/focus labels.
- Preserved single-page Manual scrolling; no horizontal tabs and no independent two-pane scroll containers.
- Changed Spreadsheet preview trace selector from filtering to quick group location while keeping all traces visible.
- Removed obsolete archived audit markdown files from the release package.


This document summarizes release-level validation. Use `docs/TESTED_CURRENT.md` for the exact current commands and results.

## Current validation record

### v1.7.12 — Version consistency self-check

- Frontend production build passed: `tsc -p frontend/tsconfig.json && vite build`.
- Frontend Vitest passed: 11 files / 45 tests.
- Backend pytest passed: 122 tests.
- Backend compileall passed.
- Fixed stale README current-version text, synchronized package metadata to v1.7.12, and removed a duplicate embedded changelog section.
- No fitting physics, backend API, saved-model schema, UI behavior, or report numerical logic changed.

### v1.7.11 — Import-page crash fix and cleanup audit

- Frontend dependency install passed in sandbox: 153 packages installed, 0 vulnerabilities reported by npm audit.
- Frontend production build passed: `tsc && vite build`.
- Frontend Vitest passed: 11 files / 45 tests.
- Backend pytest passed: 122 tests.
- Backend compileall passed.
- Fixed the Data Import blank-page regression after loading data.
- Cleaned stale handoff/import docs and removed obsolete archived v1.5 audit markdown files from the active release package.

## Recent validation summary

| Version | Main validation focus | Result summary |
|---|---|---|
| v1.7.18 | Manual single continuous webpage scroll root | Frontend Vitest/build passed; backend pytest/compileall passed. |
| v1.7.17 | Manual title/content containment and body-owned scroll root | Frontend Vitest/build passed; backend pytest/compileall passed. |
| v1.7.16 | Import page density, grouped spreadsheet preview, success toast, Manual scroll/title fix | Frontend install/Vitest/build passed; backend pytest/compileall passed. |
| v1.7.15 | Manual reader navigation and scroll stabilization | Backend pytest/compileall passed in this container; frontend build/test should be rerun locally before release if npm dependencies are unavailable. |
| v1.7.14 | Start-page workflow-status cards and Help affordance polish | Backend pytest/compileall passed in this container; frontend build/test should be rerun locally before release if npm dependencies are unavailable. |
| v1.7.13 | Audit hardening, CORS tightening, junction-solver robustness, Manual portrait Sections fix | Backend pytest/compileall passed in this container; frontend build/test should be rerun locally before release if npm dependencies are unavailable. |
| v1.7.12 | Version consistency self-check | Frontend build/Vitest passed; backend pytest/compileall passed. |
| v1.7.11 | Data Import crash fix, frontend build/test restoration, doc cleanup | Frontend install/build/Vitest passed; backend pytest/compileall passed. |
| v1.7.10 | Import unit metadata helper hotfix | Backend pytest/compileall passed; frontend not yet fully validated before v1.7.11. |
| v1.7.9 | Workflow polish, Fit/Manual scrolling, compact import controls | Backend pytest/compileall passed; later frontend build exposed additional issues fixed in v1.7.11. |
| v1.7.8 | Single-column workflow pages and floating Report exports | Backend pytest/compileall passed. |
| v1.7.6 | Report/export layout alignment | Backend pytest/compileall passed. |
| v1.7.5 | Webpage-style Import and Model layout | Backend pytest/compileall passed. |
| v1.7.4 | Blank-page regression hotfix for missing language props | Backend pytest/compileall passed. |
| v1.7.3 | User-facing UI declutter | Backend pytest/compileall passed and static cleanup scan performed. |
| v1.7.1 | Consolidated partial feature work | Backend pytest/compileall passed; later UI cleanup removed some user-facing internal controls. |

## Historical summary

| Version range | Main validation focus | Notes |
|---|---|---|
| 1.0.7–1.1.3 | Early app setup, backend smoke checks, Windows script validation | Historical scaffold. Details are superseded by current scripts and `HUMAN_DEVELOPER_SETUP.md`. |
| 1.3.0–1.3.10 | Web UI workflow, plotting, model builder, equation preview, selected trace behavior | Historical alpha stabilization. |
| 1.3.11–1.3.16 | Audit readiness, import warnings, data-unit safety, mobile layout, manual formulas | Superseded by current webpage-style workflow. |
| 1.4.x | Photocurrent laws, LAN testing, HappyMeasure CSV import, mobile run-state feedback, user-facing Function Guide | Historical feature expansion. |
| 1.5.x | Workflow-centered shell, release-manager notes, fitting/data responsive polish | Old v1.5 audit markdown files are intentionally excluded from the active release package; use version-control history for historical snapshots. |

## Policy for future validation docs

- Keep one current validation note: `docs/TESTED_CURRENT.md`.
- Append short release-level summaries here.
- Do not add one-off `TESTED_1_x_y.md` files for every internal handoff package unless the user explicitly asks for an external audit artifact.
