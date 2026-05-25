# Tested current package - v1.4.35

## v1.4.35 validation

Passed in this workspace:

- `cd backend && python -m pytest tests/test_bounds_suggestion.py -q`
- `npm run test:parameter-ui`
- `npm run build` after installing Node dependencies

Known caveat: full backend pytest currently has one pre-existing photocurrent solver-failure expectation mismatch in `tests/test_photocurrent_models.py::test_implicit_solver_failure_still_returns_warning_and_nan_no_fallback`. The new bounds-suggestion tests pass, and the data-aware bounds change does not intentionally alter fitting equations, parameter keys, exported result structure, or report table structure.

# Tested current package - v1.4.34

## v1.4.34 validation

Validated the current frontend/UI/documentation package with:

```powershell
npm.cmd run test:parameter-ui
npm.cmd run build
git diff --check
C:\Users\carll\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m compileall -q backend/ivfitter backend/tests
```

Expected results: parameter grouping logic passes, frontend production build passes, backend files compile, and whitespace checks pass apart from the repository's normal CRLF conversion warnings.

Backend pytest note: the bundled validation Python in this Codex desktop session did not include `pytest`, so full backend pytest was not rerun for v1.4.34. Backend fitting math, serialization keys, API schemas, and report keys were not intentionally changed.

Browser-visible checks performed on `http://127.0.0.1:5173`:

- Fit setup shows status badges, a compact action row, and contextual messages as separate layers.
- No-trace state is blue/neutral informational text until Run fit is clicked; after clicking Run fit with no trace it becomes red validation.
- Disabled Stop/Report use neutral disabled styling. Stop becomes visually dangerous only while fitting.
- Diagnostics are presented as one compact disclosure instead of separate caution and warning blocks.
- Model Builder duplicate protection disables only Add, not the model dropdown.
- Empty Voltage range inputs show the selected trace's concrete voltage min/max range instead of the word `auto`.

Backend fitting math, serialization keys, API schemas, and report keys were not intentionally changed in v1.4.34.

## v1.4.33 validation

- Frontend validation: `npm run test:parameter-ui` from the repository root and `npm run build` from `frontend/` both pass.
- Backend syntax validation: `python -m compileall -q backend/ivfitter backend/tests` passes.
- Scope: frontend parameter workflow change only. Backend fitting math was not intentionally changed.
- Backend pytest note: `PYTHONPATH=backend python -m pytest backend/tests -q` was run and currently has one pre-existing/orthogonal failure in `backend/tests/test_photocurrent_models.py::test_implicit_solver_failure_still_returns_warning_and_nan_no_fallback`, where a constant photocurrent branch remains finite even when the junction-voltage solver is monkeypatched to return NaN. This change does not modify backend fitting behavior.


## v1.4.33 parameter workflow validation

Validated simplified Parameters and auto-seed behavior with:

```powershell
npm.cmd run test:parameter-ui
npm.cmd run build
```

Expected results: parameter grouping logic passes, frontend production build passes, and browser checks confirm the simplified Parameters toolbar, automatic post-fit seeding behavior, Restore initial values action, and unchanged parameter serialization keys.

Backend fitting math and serialization schemas were not intentionally changed in v1.4.33. The frontend-specific regression test and build pass; backend pytest needs the photocurrent solver-failure expectation resolved before using a fully green backend release gate.

## v1.4.33 UI/workflow validation

- Parameters are grouped by Main path and Junction branches, then by component instance.
- Component rows expose Fit all/Fix all only; reset/seed actions are no longer duplicated per component.
- The old All/Fitted/Fixed/Changed/At bounds/Main path/Junction branches filter tabs are removed. The toolbar now contains one Restore initial values action plus a short auto-seed note.
- Model Builder no longer duplicates initial values/bounds, parameter summaries, or manual Advanced details expansion. Parameters owns next-fit values, and completed fits automatically seed those values from the fitted result.
- Model Builder component rows show nickname, component name, and Remove only; law/placement/role/polarity details are available from hover text.
- Narrow left-pane layouts keep Model Builder actions visible and contain long Model preview formulas inside their cards.
- Model Builder polarity is edited per component instance after adding a model term, instead of being selected globally in the Add row.
- Model preview explains the junction-voltage step, total branch-current sum, and each branch formula with a component-level description.
- Model preview and the User Manual define `softplus(x)=ln(1+exp(x))` wherever softplus formulas appear.
- Model preview is below Model Builder and collapsed by default.
- Desktop Workspace has a draggable divider between setup/model controls and results; narrow/mobile layouts remain single-column.
- Model preview formula cards are stacked vertically so Junction voltage and Branch currents are read in sequence.
- Fit setup fields wrap to one column when the left Workspace pane is narrow.
- Main path exposes a Softplus voltage drop option backed by a `series_power_law_drop` voltage-drop adapter.
- Photo-specific duplicate aliases are no longer exposed when they are mathematically equivalent to existing Ohmic or custom circuit terms.
- Editing Parameter-table initials, bounds, or fit/fixed state preserves the previous fit result. Completed fits automatically write fitted values into the Initial column for the next run, and Restore initial values returns the latest pre-fit seed values.
- Range/objective/run-option summaries and Parameters explanatory paragraphs are not visible inline in the Workspace UI.
- Language/content extraction guidance is documented in `docs/LOCALIZATION_AND_TEXT.md`, and first shared frontend text lives in `frontend/src/content/localizedText.ts`.

## v1.4.29 validation

Validated tutorial-style User Manual integration with:

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

Expected results: frontend build passes, backend tests pass, compileall passes. Regression tests continue to cover user-facing Function Guide constraints and backend semantic consistency.

## v1.4.29 label/recovery validation

Validated Model Builder localization and developer-environment recovery polish:

- Chinese Model Builder function menus now use user-facing Chinese names for advanced/current-law options instead of falling back to backend English registry labels.
- Browser check confirmed branch options render as Chinese labels such as diode exponential current, softplus power-law current, reverse-breakdown current, photocurrent, photoconductive branch, and custom expression law.
- `scripts/setup_dev.ps1` now detects an existing `.venv` whose Python launcher cannot start, warns that it may point to a removed Python installation, and recreates the virtual environment.
- `scripts/test_backend.ps1` now checks whether `.venv\Scripts\python.exe` can start before invoking pytest, with a clear instruction to rerun setup if the venv is broken.
- Verified with frontend production build and PowerShell script parse checks before commit.

## Manual integration checks

- User manual starts with what IV-fitter solves, then workflow, data import, Model Builder concepts, Function Guide, formula assembly, fitting mechanics, recipes, residuals, reportability, light response, troubleshooting, and glossary.
- Formula content uses rendered equation blocks rather than raw plain-text formula lines.
- English and Chinese content are selected through the app language selector; the UI does not show both languages as one long mixed document.
- Advanced function implementation details remain collapsed inside Function Guide cards.


## v1.4.29 manual-reader validation

Validated that the in-app User Manual renders as a one-section-at-a-time reader and that the Function Guide uses a selector/detail layout. The Law/Form/Placement guide is integrated as its own manual section. No solver, importer, or model-builder behavior was changed.


## v1.4.29 workflow validation

Validated that default D1 has explicit forward polarity, ordinary duplicate diode Add remains blocked, role-aware D2 is supported, the Parameters table edits next-fit initials/bounds/fixed state, warnings are summarized at the Workspace top with a dismiss control, and Data/User Manual views no longer show fit controls.


## v1.4.29 layout validation

Validated that the interactive Parameters table uses the full available result-column width on wide screens and keeps horizontal scrolling only as a narrow-screen safety behavior.


## v1.4.29 compact-status validation

Validated that Workspace top status is reduced from stacked full-height boxes to a compact status summary plus expandable verdict details and a dismissible warning summary. No solver, importer, or model behavior was changed.


## v1.4.29 Parameters full-width validation

Validated that the Parameters workspace section spans the full right result pane after warnings were moved out of the result grid. No solver, importer, or model behavior was changed.


## v1.4.29 Model Builder duplicate-guidance validation

Validated that disabled Add buttons still provide duplicate/equivalent guidance through hover/title, while the repeated visible inline note is removed from the Model Builder body.

- Confirmed the role-aware D2 action is single-use: it is available only when there is exactly one forward branch diode and no existing secondary forward diode, preventing D3/D4 repeats.


## v1.4.29 Data page layout validation

Validated that Import data and Trace selection align as the first row, Paste data and Spreadsheet preview align as the second row, and the Trace selection panel no longer repeats V/I column names in both summary facts and import-quality metadata.


## v1.4.29 mobile Data page validation

Validated that mobile Data page Spreadsheet preview is contained in an internal scroll area above the bottom navigation. Navigation tabs no longer show subtitles, and the sidebar note is reduced to the short product message “Fit locally. Review before reporting.”

- Confirmed Workspace section headers no longer show summary subtitles such as range/objective/run-option hints.

- Confirmed Model Builder bucket explanation text is not repeated under section titles; guidance remains available via HelpTip hover.

- Reviewed UI hover/help wording and replaced developer-facing schema/topology wording with user-facing model/circuit wording.


## v1.4.29 sidebar/language validation

Validated that the dock/sidebar starts collapsed by default and that the language selector dropdown options remain readable on hover/open in the dark sidebar.


## v1.4.29 audit/workflow validation

Validated audit fixes and workflow changes: Plots empty state has an Import data shortcut; Run timeout defaults to 60 s; frontend aborts timed-out fits and backend cooperatively raises fit_timeout; starting a new fit clears previous converged/caution/warning state; collapsed language toggle changes between ZH and EN; Parameters table uses scientific notation for extreme values.
