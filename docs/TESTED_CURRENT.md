# Tested current package — v1.4.29

## v1.4.29 validation

Validated tutorial-style User Manual integration with:

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

Expected results: frontend build passes, backend tests pass, compileall passes. Regression tests continue to cover user-facing Function Guide constraints and backend semantic consistency.

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
