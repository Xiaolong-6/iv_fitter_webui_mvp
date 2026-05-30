# IV-fitter Web UI agent handoff

Continue from **v1.8.18**. This version is an audit-hardening and stabilization release on top of Branch20260528 / v1.8.17. It closes the security/availability audit items, restores frontend test reliability, adds `/api/v2` route aliases, refactors `FittingPage` state to a reducer, splits importer helper responsibilities, and adds FittingPage component tests.

Critical next-agent context:

- Do not remove the legacy `/api/...` routes yet; the current frontend calls `/api/v2/...`, but old local workflows may still rely on `/api/...`.
- Fit timeout is API-level and truthful: SciPy is not force-killed mid-call. The concurrency semaphore is required to prevent stale optimizer work from saturating the backend.
- The local server-side file picker now runs in a bounded subprocess. Remote/LAN users should use drag/drop, file input, or paste import.
- `FittingPage` should not be allowed to grow back into many independent top-level state hooks; add reducer fields or extract dedicated hooks/components.
- Standard validation for this handoff: backend pytest, backend py_compile on edited modules, frontend Vitest, and frontend build.

# Web UI agent handoff — v1.7.12

## Current baseline

Continue from **v1.7.12**. This version is a version-consistency self-check on top of v1.7.11: package metadata and README current-version text now agree, a duplicate embedded changelog section was removed, and the current frontend/backend validation suite has been rerun.

Do not base new work on old v1.5 audit notes. Historical v1.5 audit files are intentionally excluded from this active release package; use version-control history if an old snapshot is needed.

## Non-negotiable project rules

- If the architecture or implementation intent is unclear, stop and confirm before changing code.
- Keep fitting physics, backend APIs, saved-model compatibility, and report numerical semantics unchanged unless the user explicitly asks for a model/physics change.
- Every versioned change must update version files, changelog, tested-current notes, and relevant docs.
- Do not claim tests passed unless they were actually run in the current working tree.
- Do not put human local paths, private names, API tokens, or personal data in commits, changelogs, release notes, screenshots, or generated docs.
- Keep simulator/debug paths independently testable and separated from normal user workflow.

## Current page architecture

### Welcome / Start

- Welcome is a centered, limited-width webpage-style page.
- No embedded External tester mode in the user-facing Start page.

### Import / Data

- Single-column webpage flow:
  1. Import data
  2. Trace selection
  3. Plot review
  4. Spreadsheet preview
- Trace selection, Plot review, and Spreadsheet preview are hidden until data is loaded.
- After import/parse, Import data collapses into a compact summary but must remain re-expandable.
- Do not reintroduce a separate user-facing Import quality card.
- Spreadsheet preview shows all loaded traces and highlights the selected trace.
- Current runtime-crash guard: `DatasetNameInput` is defined locally in `DataImportWorkspace.tsx` and must remain available because it renders only after data is loaded.

### Model

- Single-column webpage flow: Model Builder first, Model preview underneath.
- Model Builder shows Main path and Junction branches in two columns on wide screens.
- Equivalent circuit includes a preset selector.
- Selecting Single diode model or Double diode model replaces the current model. It must not incrementally add components.
- Do not reintroduce the standalone `Add secondary diode D2` button; D2 is available through the Double diode preset.
- Model preview has a Go to Fitting action.

### Fit

- Single-column webpage flow.
- Fit setup stays compact and sticky at the top.
- Objective / run options / solver live in an Advanced popover. The popover must float above content, not push plots/parameters down, and must close on outside click.
- Fit and Manual pages must scroll normally.

### Report

- Report is a single-column reader layout.
- Exports is a draggable floating panel that must not overlap the dock/sidebar.
- The in-app report body should match exported HTML ordering:
  1. IV-fitter report
  2. Warnings and diagnostics
  3. Critical issue
  4. Fit process and quality metrics
  5. Parameters
  6. Plots
  7. Equivalent circuit
  8. Model evaluation summary
  9. Generated report text
- Report plots must have explicit bounded height so they do not collapse to title-only or grow indefinitely.
- Fit process and quality metrics must use human-readable labels and formatted values.

### User Manual

- One-column reader layout.
- Version check is at the top.
- Sections are a floating locator/navigation aid, not a fixed side panel.

## Key files

- `frontend/src/components/DataImportWorkspace.tsx` — Import page, collapsed import card, trace selection, all-trace spreadsheet preview.
- `frontend/src/components/ModelBuilder.tsx` — model builder, model presets, component layout.
- `frontend/src/components/FitConfigPanel.tsx` — compact Fit setup and Advanced popover.
- `frontend/src/pages/components/WorkflowSections.tsx` — page-level Import/Model/Fit composition.
- `frontend/src/pages/components/ReportWorkflowPage.tsx` — in-app Report layout, floating Exports, report sections.
- `frontend/src/model/htmlReport.ts` — exported HTML report layout/order.
- `frontend/src/components/UserDocumentationPage.tsx` — one-column manual and floating section locator.
- `frontend/src/model/parameterGrouping.ts` — grouped parameters and component Fit/Fix helper.
- `frontend/src/styles/*.css` — page layout, report/manual responsiveness, chart containment.

## Validation commands

From the project root:

```bash
cd frontend
npm install --include=dev
npm run test -- --run --reporter=dot
npm run build

cd ../backend
python -m pytest -q
python -m compileall -q ivfitter
```

v1.7.12 status: frontend Vitest passed (11 files / 45 tests), frontend production build passed, backend pytest passed (122 tests), backend compileall passed.

## Manual smoke checks before release

1. Import CSV/paste/sample data; the Import page must not go blank after data loads.
2. Reopen collapsed Import data and import again.
3. Rename the selected trace; blur/Enter commits, Escape restores.
4. Confirm Spreadsheet preview shows all traces and highlights the selected trace.
5. Confirm Fit page scrolls, Advanced floats, and outside click closes it.
6. Confirm Manual page scrolls and Sections locator works.
7. Confirm Report plots render visibly in-app and exported HTML remains ordered and readable.
8. Confirm model presets replace the current model and D2 appears only via Double diode preset.
