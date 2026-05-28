# Changelog

## v1.5.42 — fitting plot layout hotfix

- Removed duplicated Plots and Parameters headings in the Fitting workspace; each panel now keeps one visible title only.
- Changed paired diagnostic plot views to render the two selected plots side-by-side on desktop, with mobile stacking retained.
- Moved chart controls into a compact top-right overlay so they no longer consume plot height.
- Let paired charts fill the available plot pane instead of shrinking into the center of a large empty card.
- Preserved fitting math, backend APIs, report schemas, Manual behavior, and release-manager behavior.

## v1.5.41 — compact chart-control hotfix

- Fixed a chart-toolbar regression where nested SVG control icons inherited the main chart SVG sizing and expanded into oversized buttons.
- Scoped chart sizing rules to the direct chart SVG so zoom/pan/reset icons remain compact.
- Removed the repeated visible "Wheel zoom" toolbar text and kept the wheel/shift-wheel guidance in tooltips.
- Kept the v1.5.40 plot-view defaults, plot/parameter splitter, Manual navigation, fitting math, backend APIs, report schemas, and release-manager behavior unchanged.

Tests: backend pytest and Python compileall passed. Frontend npm validation remains blocked in this environment by the current npm mirror returning 404 for electron-to-chromium-1.5.371.tgz; run frontend tests/build locally before release.

## v1.5.40 — fitting controls and manual navigation polish

- Renamed the sidebar Start tab to Start and enlarged the Start-page primary actions.
- Removed the redundant HappyMeasure sample hint from the Data import header.
- Changed the default fitting plot view to paired diagnostics: Linear I-V + signed residual, with an alternate Log |I| + log residual view.
- Added a draggable horizontal splitter between Plots and Parameters on the Fitting page.
- Replaced tiny text chart controls with larger icon-style zoom/pan/reset controls.
- Removed Manual section subtitles so the left navigation functions as compact quick-position tabs.
- Preserved fitting physics, backend APIs, report schemas, and release-manager behavior.

## v1.5.39 — continuous User Manual reader

- Changed the User Manual from one-section-at-a-time reading to a single continuous scrollable document.
- Kept the left section list as quick-position navigation; clicking a section scrolls the manual content area rather than replacing the page body.
- Added scroll-linked active-section highlighting so the navigation follows the reader position.
- Removed visible numeric title prefixes inside the manual body to avoid duplicate/misaligned section numbering.
- Preserved the compact release-check footer and did not change fitting, reporting, backend APIs, or release-manager logic.

## v1.5.38 — Manual updates panel cleanup and release-check status refinement

- Kept the User Manual sidebar focused on section navigation by using a compact Version and updates footer instead of a full release-notes card.
- Added an explicit release-check state for local builds that are newer than the latest public GitHub release, avoiding the misleading “Up to date” label in development builds.
- Collapsed release notes/assets behind a details control in the compact manual footer.
- Improved the first manual section with clearer user-facing self-consistent circuit equations and a short explanation of why diagnostics matter.
- Preserved read-only release checking; no auto-update or GitHub write token is used in the app runtime.

## v1.5.37 — Diagnostic report UX and Release Manager workflow

- Improved Report tab invalid-fit UX: invalid fits now open as diagnostic reports with a dominant failure summary, grouped root-cause diagnostics, suggested recovery actions, diagnostic-only parameter messaging, and diagnostic export labels.
- Clarified model evaluation wording and moved technical equations lower/collapsed for invalid-fit states.
- Fixed Parameters table height/scroll containment regression after stylesheet modularization.
- Further simplified the User Manual page into a compact left-navigation reader with independent content scrolling and an Updates panel.
- Added a read-only in-app GitHub release checker; startup and fitting are never blocked by update checks.
- Added developer release-page audit and optional maintainer release updater scripts with dry-run mode and privacy/security checks.
- Documented release-manager usage and synchronized release-candidate notes.

## v1.5.36 — Structural-debt-cleaned release candidate

- Added a fresh external-style release-candidate audit for the CSS/FittingPage structural cleanup series.
- Synchronized README, package metadata, backend metadata, handoff, documentation index, validation docs, and changelog to v1.5.36.
- Confirmed `style.css` is now an import manifest, normal frontend CSS has zero `!important` usage, and `FittingPage.tsx` is reduced to a workflow coordinator.
- Preserved fitting math, backend APIs, report schemas, saved-model compatibility, and user-facing workflow behavior from v1.5.31.

## v1.5.35 — Stylesheet ownership documentation and CSS override cleanup

- Added `docs/FRONTEND_STYLESHEET_ARCHITECTURE.md` to define CSS module ownership, cascade order, and future layout-change rules.
- Updated handoff and development-principles docs so agents do not reintroduce monolithic CSS or broad `!important` overrides.
- Removed normal `!important` usage from frontend CSS while preserving order-based cascade behavior.
- Kept `frontend/src/style.css` as a small import manifest.

## v1.5.34 — Workflow layout and fit action extraction

- Extracted workflow layout state into `useWorkflowLayoutState`.
- Extracted Fit action buttons and fitting message rendering into focused page components.
- Kept the main `FittingPage.tsx` as a workflow coordinator rather than a large mixed UI/state component.
- Preserved fitting math, APIs, report exports, and user-visible workflow behavior.

## v1.5.33 — FittingPage helper extraction

- Extracted backend connection UI and fitting-page utility helpers from `FittingPage.tsx`.
- Kept fitting behavior, API calls, report exports, model semantics, and layout behavior unchanged.
- Reduced `FittingPage.tsx` to roughly 800 lines as an intermediate refactor checkpoint.

## v1.5.32 — CSS containment and workflow-page component extraction

- Split frontend CSS into ordered module files under `frontend/src/styles/` while keeping `frontend/src/style.css` as a small import manifest.
- Removed nearly all `!important` overrides through order-preserving stylesheet restructuring.
- Extracted default model/config, workflow status/start/model/fitting/report page sections, and zoom/pane-resize hooks out of `FittingPage.tsx`.
- Reduced `FittingPage.tsx` from about 2010 lines to about 900 lines without changing fitting math, backend APIs, or report schemas.

## v1.5.31 — fitting release-candidate UI polish and external audit

- Tightened Fitting page height containment: Fit setup now uses full available pane height with a scrollable objective/run-options body instead of a fixed short scroll box.
- Made the Parameters table denser and more high-zoom tolerant by using a single internal scroll container, reducing row/input height, and moving long parameter meaning text into hover/help surfaces instead of a visible wide column.
- Replaced tiny text chart controls with larger icon-style zoom/pan/reset buttons and clearer hover labels.
- Further reduced Equivalent circuit visual chrome and made the SVG scale more predictably with the Model Builder pane.
- Reworked Report model/equation explanation into user-facing circuit language with plain roles, core equations, and a collapsed backend technical summary.
- Completed Manual page cleanup with a fixed navigation column and a single independently scrollable content pane; removed developer-facing tutorial wording from the user-facing header.
- Updated HTML report model explanation to match the user-facing report language.
- Preserved fitting math, backend API shape, saved-model compatibility, and reportability logic.

## v1.5.30 — UI/layout/manual/report cleanup

- Moved Synthetic trace generation from the Data import card to a Model Builder **Debug algorithm** action.
- Added a manual resizer between Fit setup and the plots/parameters results columns.
- Improved Fit setup height behavior so advanced/objective controls scroll inside the available pane.
- Tightened Parameters table density and high-zoom behavior with internal/horizontal scrolling instead of cell overlap.
- Removed separate parameter CSV and diagnostics JSON download actions and their unused API/client helper paths; the full report CSV remains the spreadsheet export.
- Rendered Report model/equation lines as labeled formula blocks instead of raw code text.
- Simplified the User Manual reader by removing the redundant section dropdown, Current section heading, and developer-facing subtitle; the left navigation now controls a scrollable content area.
- Reduced Equivalent-circuit panel visual chrome and made its SVG height scale with the Model Builder pane.
- Added per-metric hover explanations in Fit process quality metrics.

## v1.5.29 — audit principles and validation polish

- Added a durable agent/developer principles document distilled from repeated commit-history fixes: scientific contract stability, independent scroll containment, parameter provenance, action hierarchy, report auditability, Law/Form/Placement vocabulary, and validation/documentation discipline.
- Updated the current agent handoff and README version labels to match the package version.
- Removed the duplicate local softplus implementation from `core/evaluation.py`; model evaluation now imports the shared stable helper from `components/common.py`.
- Added a model-validation warning when photocurrent/bias-dependent current components omit explicit `direction_sign`, so imported or hand-edited models do not rely silently on the default current direction.
- Tightened fit-process copy to label the reduced χ²-like metric as relative/weighting-dependent while preserving existing metric keys and report schema.

## v1.5.28 — fit/report UI stabilization

- Tighten Data page layout and plot-review containment to reduce blank/overgrown import panels.
- Remove the low-value Fitting details drawer that only redirected to Report.
- Keep Run fit, Stop fit, and Report in a compact action row.
- Move Advanced run options below the compact fit status and keep them always visible in the Fit setup panel.
- Make the Parameters table denser and internally scrollable.
- Rework Report into a scientific report layout with model/equation display, explicit warnings, grouped parameters, improved exports, and readable preview.
- Add model/equation content to downloadable HTML reports.
- Add v1.5.28 self-audit notes.

## v1.5.27 — polarity and landscape layout stabilization

- Expose polarity for Diode-like series barrier drop and make the series-barrier voltage-drop evaluation polarity-aware while preserving the forward default.
- Add user-facing barrier polarity explanation in Model preview.
- Keep Model Builder fixed while Model preview scrolls independently.
- Stabilize Fitting and Report landscape layouts so portrait improvements do not break horizontal/desktop workflows.
- Improve parameter hover text before and after fitting so it explains the parameter meaning instead of exposing internal keys.
- Add layout containment for plots, parameter tables, and report panes.

## v1.5.26 — adaptive workflow layout and report plot export

- Added manual column resizing for the Model and Report workflow pages.
- Improved Data page adaptive sizing so Import/Paste/Plot review/Spreadsheet cards use available viewport space more predictably.
- Matched Model Builder group card backgrounds to the equivalent-circuit color semantics: main path in blue and junction/current branches in green.
- Improved Fitting page containment so plots remain stable while the Parameters table scrolls internally.
- Added portrait/narrow-screen layout rules for Data, Model, Fitting, and Report pages.
- Added inline SVG plots to the downloadable HTML report.
- Changed parameter-name hover text to explain the parameter meaning rather than expose internal keys.
- Kept fitting equations, backend APIs, CSV/JSON report formats, and saved-model compatibility unchanged.

## v1.5.23 — final audit notes for UI polish batch

- Added a self-audit handoff document for the workflow UI polish batch.
- Documented validation commands, manual-review risks, known limitations, and recommended browser checks.
- No fitting behavior, backend API, report CSV/JSON structure, or model semantics were changed from v1.5.22.

## v1.5.22 — HTML report export hardening

- Extracted HTML report generation into a testable frontend helper.
- Added Vitest coverage for HTML escaping and report document structure.
- Kept the v1.5.21 workflow UI, Data plot review, Report layout, and fitting behavior unchanged.

## v1.5.21 — workflow UI polish and report usability

- Simplified the Start page into a minimal hero, two primary actions, and a four-step workflow.
- Added shared page icons for sidebar/workflow navigation and introduced theme token scaffolding.
- Compacted the Data page, folded trace selection into Import data, and added Plot review for quick trace inspection.
- Changed Fitting-page Advanced and Details panels to expand downward as left-panel controls.
- Reworked Report into a two-column layout with exports on the right and added HTML report export.
- Improved equation/model preview wording to avoid generated internal identifiers in default UI.

# v1.5.19 - Workflow-centered UI shell

- Replace Workspace-centered navigation with workflow pages: Start here, Data, Model, Fitting, Report, Help.
- Add a default Start here page with workflow guidance and quick navigation.
- Move Model Builder into the Model page.
- Move Fit setup, plots, and parameters into the Fitting page.
- Move report exports and full fit process/quality diagnostics into the Report page.
- Move the full user manual into Help.
- Add a compact global context bar with selected trace, model summary, fit status, report availability, and next-step guidance.
- Add compact icons to the Fitting page dock controls.
- Preserve fitting behavior, backend API, report export structure, and saved-model compatibility.
- Updated version metadata to v1.5.19.

# v1.5.18 - Semantic component label cleanup

- Renamed several user-facing component labels to describe mathematical form and circuit placement more accurately.
- Renamed the advanced voltage-dependent current component to **Bias-dependent current branch** across the registry, Model Builder, equation preview, parameter display, and user manual.
- Clarified reverse leakage / soft-breakdown wording and soft-threshold power-law current branch wording.
- Renamed **Softplus transport modifier** to **Bias-dependent series conductance modifier**.
- Removed developer-facing "adapter" terminology from Ohmic branch UI text.
- Added canonical `bias_dependent_current` function/law id for new models.
- Kept legacy `photocurrent_voltage_dependent` saved models loadable and fit-compatible through backend aliases.
- Preserved serialized parameter keys such as `Iph0_A`, `Aph`, `Vt_ph_V`, `Vs_ph_V`, and `m_ph` for JSON/report compatibility while changing display descriptions to neutral current/bias language.
- Added regression tests for the new label, legacy alias validation/fitting, and absence of the old label from user-facing frontend source.
- No equation or fitting-behavior changes.
- Updated version metadata to v1.5.18.

# v1.5.17 - Internal stability refactor

- Extracted frontend fit lifecycle helpers for run-id sequencing, stale-result acceptance, cancelled/timeout/error lifecycle states, derived UI state, and report availability.
- Extracted report artifact/download filename helpers to remove duplicated page-local string handling.
- Added frontend regression tests for fit lifecycle edge cases and report artifact naming.
- Preserved user-facing behavior and layout; no new fitting feature, model law, or UI control was added.
- Updated version metadata to v1.5.17.

Validation:
- `PYTHONPATH=backend python -m pytest backend/tests -q`
- `python -m compileall -q backend/ivfitter backend/tests`
- `cd frontend && npm run test`
- `cd frontend && npm run build`

# v1.5.16 - Frontend test foundation

- Added Vitest configuration and frontend test scripts (`npm run test`, `npm run test:watch`).
- Added focused unit tests for parameter formatting, parameter status classification, fit diagnostics, bounds suggestion application, Model Builder rules, and representative i18n keys.
- Added `docs/FRONTEND_TESTING.md` to document the frontend testing workflow and test policy.
- Updated version metadata to v1.5.16.

Validation:
- `PYTHONPATH=backend python -m pytest backend/tests -q`
- `python -m compileall -q backend/ivfitter backend/tests`
- `cd frontend && npm run test`
- `cd frontend && npm run build`

# v1.5.15 - Parameter and report export polish

- Added centralized parameter display/status formatting for the Parameters table and report exports.
- Added display/status/note columns to the parameter CSV export.
- Added a sectioned report CSV with software, trace, model, fit configuration, quality, parameters, warnings, and diagnostics sections.
- Added structured diagnostics JSON export for reproducibility and downstream batch comparison.
- Added backend regression tests for parameter CSV, sectioned report CSV, and diagnostics JSON export structure.
- Updated version metadata to v1.5.15.

# v1.5.14 - Fit lifecycle hardening

- Added a frontend fit-run lifecycle guard with monotonic run ids so stale/late fit responses cannot overwrite the current workspace after Stop, timeout, or a newer run.
- Made Stop fit and timeout transitions explicit: cancelled and timeout states now have compact status-footer summaries and keep old results out of Report generation.
- Cleared previous fit results, reports, warnings, and promotion notices at the start of each run before the new request is issued.
- Kept delayed aborted-request errors from replacing the current state after a newer run has started.
- Updated version metadata to v1.5.14.

Validation:
- `PYTHONPATH=backend python -m pytest backend/tests -q`
- `python -m compileall -q backend/ivfitter backend/tests`
- `npm ci`
- `npm run build`

# v1.5.13 - User documentation content refactor

- Extracted user manual function-guide content from UserDocumentationPage.tsx into frontend/src/content/userDocumentationContent.ts.
- Kept UserDocumentationPage.tsx focused on rendering, navigation, and section composition.
- Preserved bilingual function-guide text, formulas, tags, and law/form/placement registry mapping.
- Left the UI behavior and route structure unchanged.
- Bumped version metadata to v1.5.13.

# v1.5.12 - Offline tools and packaging cleanup

- Moved prepare_publication_demo_data.py from scripts/ to tools/ to mark it as an optional offline helper, not runtime code.
- Added tools/README.md with usage and scope notes.
- Updated the one-click publication-demo-data launcher to call tools/prepare_publication_demo_data.py.
- Updated documentation references from scripts/ to tools/.
- Bumped version metadata to v1.5.12.

# v1.5.11 - Conservative unused UI cleanup

- Removed verified unused CSS selectors from frontend/src/style.css without changing runtime component logic.
- Removed 57 unused static i18n dictionary entries while preserving dynamic sidebar tab keys.
- Removed obsolete manual Node .mjs test scripts that duplicated automated coverage.
- Kept publication demo-data helper and deprecated compatibility guards for later dedicated cleanup passes.
- Bumped version metadata to v1.5.11.

# v1.5.10 - Local API and diagnostics hardening

- Added optional API-token protection for `/api/*` routes when `IVFITTER_API_TOKEN` is configured; `/api/health` and `/api/version` remain open for diagnostics.
- Updated the LAN launcher to generate and pass a per-session API token to both backend and frontend.
- Stopped exposing absolute selected import paths to the frontend; `open-import-file-dialog` now returns a basename display label and `selected_name`.
- Sanitized unexpected HTTP 500 responses by default while preserving full traceback logging server-side; `IVFITTER_DEBUG_ERRORS=1` restores verbose exception details for development.
- Guarded backend `softplus()` for extreme negative inputs without emitting non-actionable NumPy warnings.
- Added backend regression tests for optional API token enforcement, sanitized errors, public import filenames, and softplus warning behavior.
- Bumped version metadata to v1.5.10.

Tests: `PYTHONPATH=backend python -m pytest backend/tests -q`, `python -m compileall -q backend/ivfitter backend/tests`, `cd frontend && npm install && npm run build`

# v1.5.9 - Compact Fit setup diagnostics

- Kept the Fit setup card bottom-docked, but reduced its default status density to a one-line summary plus one short primary message.
- Moved the long quality-gate explanation, fit-process metrics, and detailed warnings behind a collapsed Details / diagnostics drawer.
- Changed gate-failure copy to the compact default: fitted values are visible but were not promoted to initials.
- Added footer CSS so diagnostics expansion scrolls inside the Fit setup dock instead of crowding the left pane.
- Bumped version metadata to v1.5.9.

# v1.5.8 - Bottom-docked Fit setup panel

- Moved the whole Fit setup card into a reserved bottom dock of the left setup pane, together with the fit-status footer.
- Model Builder and Equation Preview now scroll above the dock; the Fit setup controls and status remain visible at the bottom without overlaying or hiding content.
- Removed the previous full-viewport Fit setup card behavior that created a large blank region and pushed Model Builder below it.
- Added responsive constraints so the bottom dock remains compact and internally scrollable when advanced run options are expanded.

# v1.5.7 - Fit setup bottom status footer

- Moved Fit setup state badges and status/warning messages out of the top action dock into a panel-local bottom status footer.
- Kept Run fit / Stop fit / Report controls at the top while reserving layout space for the footer so status text does not overlay parameters or setup content.
- Added a scroll-contained Fit setup body and compact footer message stack so long diagnostics remain visible without stealing the top control area.

# v1.5.6 - Series barrier polarity cleanup

- Removed polarity from the Main path `Series diode barrier` component; it is a voltage-drop form and no longer exposes a polarity selector.
- New series barrier components are created with `polarity: null`.
- Backend validation now flags stale stored polarity on series barriers, and prediction ignores any legacy polarity value so old `forward`/`reverse` fields do not change the series barrier behavior.
- Kept branch Shockley diode polarity unchanged.

Tests: `npm run build`, `npm run test:synthetic-ui`, `npm run test:parameter-ui`, `.venv\Scripts\python.exe -m pytest -p no:cacheprovider backend/tests/test_model_structure_cleanup.py backend/tests/test_model_validation.py backend/tests/test_backend_mvp.py -q`, `python -m compileall -q backend/ivfitter backend/tests`

# v1.5.5 - Fit running status wording

- Reduced repeated running-state messaging in Fit setup by keeping elapsed time in the status badges and removing the disabled `Fitting... Ns` button text.
- Renamed the active stop action to `Stop fit` and clarified that it stops the current fit request and prevents that run result from updating the workspace.
- Added a tooltip explaining that Report is available after a completed fit.
- Removed the ambiguous `ignore this run` wording from running-state text.

Tests: `npm run build`, `npm run test:synthetic-ui`

# v1.5.4 - Prefixed J-column import detection

- Fixed publication/demo CSV auto-detection for paired columns such as `1.Dark.Voltage_V, 1.Dark.J_A, 2.Illumination.Voltage_V, 2.Illumination.J_A`.
- Recognized prefixed `J_A` current-density columns as importable traces so multi-voltage-column publication files do not fall back to a single trace.
- Added regression coverage using the prefixed `J_A` column pattern.

Tests: `.venv\Scripts\python.exe -m pytest -p no:cacheprovider backend/tests/test_publication_demo_import.py backend/tests/test_happymeasure_import_multi.py backend/tests/test_import_export.py -q`, `python -m compileall -q backend/ivfitter backend/tests`

# v1.5.3 - Import unit correction

- Changed Data workspace unit selectors from display-only controls into imported-column unit correction controls.
- Selecting mV/mA/uA/etc now rescales the selected trace into internal SI V/A arrays used by preview, plots, and fitting.
- Kept spreadsheet preview headers fixed as V (V) and I (A) so users see the corrected fitting data directly.
- Updated unit helper text and docs to clarify that these controls describe source/imported column units, not cosmetic display units.

Tests: `npm run build`, `npm run test:synthetic-ui`, `npm run test:parameter-ui`, `python -m compileall -q backend/ivfitter`

# v1.5.2 - Publication demo multi-trace import

- Improved CSV/TXT auto-detection for publication/demo data with one voltage column and multiple current/current-density columns.
- Added plain long-format grouping by trace column, with invalid rows dropped per trace/group instead of forcing all traces onto shared valid rows.
- Added current-density import metadata (`y_quantity`, `y_unit`) while preserving the existing internal imported value arrays and fitting math.
- Ignored common summary/non-IV columns such as PCE, FF, Voc, Jsc, time, wavelength, and EQE during current-column detection.
- Returned concise multi-trace import summaries so the Import Data workflow can report how many traces were imported from one voltage column.

Tests: `npm run build`, `npm run test:parameter-ui`, `npm run test:synthetic-ui`, `.venv\Scripts\python.exe -m pytest -p no:cacheprovider backend/tests -q`, `python -m compileall -q backend/ivfitter backend/tests`

# v1.5.1 - Demo data import folder

- Reorganized `examples/` into user-facing demo data, synthetic examples, publication-data staging, and internal parser fixtures.
- Added a shared default import directory resolver that prefers `examples/demo_data/iv_traces/` and safely falls back when examples are unavailable.
- Updated the existing Import CSV/TXT action to use a local OS file picker starting in the demo IV traces folder when supported, with the browser file input preserved as fallback.
- Kept selected files on the existing import/parser pipeline; no file is hard-coded or auto-imported.
- Documented optional `.meta.json` citation/license metadata for publication-derived example data.

Tests: `npm run build`, `npm run test:parameter-ui`, `npm run test:synthetic-ui`, `.venv\Scripts\python.exe -m pytest -p no:cacheprovider backend/tests -q`, `python -m compileall -q backend/ivfitter backend/tests`

# v1.5.0 - Release build readiness

- Promoted the Import CSV/TXT action in the Import Data workspace so real data import matches the primary no-data workspace action.
- Labeled bundled sample and synthetic trace actions as test/debug utilities to separate them from normal user data import.
- Added a Windows release build script that checks version consistency, runs frontend/backend validation, and packages tracked release files.
- Added a Windows portable build script that packages a dependency-free user folder with `IV-fitter.exe`.
- Added a custom IV-fitter Windows executable icon and repository MIT license.
- Unified release metadata across root package, frontend package, backend package, README, and backend API version.

Tests: `npm run build`, `npm run test:parameter-ui`, `npm run test:synthetic-ui`, `.venv\Scripts\python.exe -m pytest -p no:cacheprovider backend/tests -q`, `python -m compileall -q backend/ivfitter backend/tests`, `.\05_release_build.bat`

# v1.4.40 - No-data action hierarchy polish

- Disabled Run fit and Report when no trace is loaded so the Fit setup panel no longer presents fitting as the primary action before data import.
- Increased the visual weight of the empty Plots Import data action, making data import the primary next step in the no-data state.
- Kept Run fit visually neutral and unavailable until a selected trace has voltage/current data.
- Added a sidebar Releases link below the version label and replaced letter navigation markers with clearer visual icons.
- Unified sidebar language and zoom controls so the footer reads as one control group.
- Updated manual/transparency notes for the no-data workflow.

Tests: `npm run build`, `npm run test:parameter-ui`, `npm run test:synthetic-ui`, `python -m compileall -q backend/ivfitter`

# v1.4.39 - Synthetic fit-back consistency

- Fixed noiseless synthetic D1 + Rs + Rsh fit-back by optimizing broad positive scale parameters such as diode `I0_A` in internal log10 coordinates while preserving public parameter keys, bounds, equations, JSON shape, and reports. This prevents bounded `least_squares` from silently shifting tiny displayed starts such as `1e-12 A` toward `1e-10 A`.
- Skipped generic compliance-point exclusion for synthetic traces whose metadata says no compliance artifact was applied, avoiding false high-current exclusions in clean simulated data.
- Added quality-gated fitted-as-initial promotion: poor or non-reportable fits still display fitted values but do not silently overwrite trusted initials for the next run.
- Added a Parameters action to seed initials from synthetic ground-truth metadata, using only matching parameter keys in the current model.
- Added synthetic fit-back regression coverage for noiseless D1 + Rs + Rsh recovery and updated frontend parameter tests for synthetic ground-truth seeding.

Tests: `PYTHONPATH=backend pytest -q backend/tests/test_fit_process_diagnostics.py backend/tests/test_bounds_suggestion.py backend/tests/test_synthetic_trace.py`, `npm run build`, `npm run test:parameter-ui`, `npm run test:synthetic-ui`

# v1.4.38 - Fit process diagnostics transparency

- Added additive backend `fit_diagnostics` metadata for each fit, including points used/excluded, free/fixed parameter counts, degrees of freedom, elapsed time, solver/mode, weighting/loss, optimizer status/message, function/Jacobian evaluations, cost/optimality, active bounds, and warning count.
- Added weighted chi-square, weighted reduced chi-square, log-magnitude R², MAE, max residual, points-used, and free-parameter metrics without changing fitting math or parameter keys.
- Added a compact Fit setup disclosure for process and quality diagnostics near the existing diagnostics area, plus session totals for fit count, total function evaluations, total elapsed fit time, and root-solver failures.
- Updated manual/reporting transparency text to explain that weighted reduced χ² is a residual-scale diagnostic unless weights represent calibrated measurement uncertainty.
- Updated Markdown reports to include fit-process diagnostics.

# Changelog

# v1.5.37 - Report diagnostics and release-manager workflow

- Improved Report tab invalid-fit UX: invalid fits now open as diagnostic reports with a dominant failure summary, grouped root-cause diagnostics, suggested recovery actions, diagnostic-only parameter messaging, and diagnostic export labels.
- Clarified model evaluation wording and moved technical equations lower/collapsed for invalid-fit states.
- Fixed Parameters table height/scroll containment regression after stylesheet modularization.
- Further simplified the User Manual page into a compact left-navigation reader with independent content scrolling and an Updates panel.
- Added a read-only in-app GitHub release checker; startup and fitting are never blocked by update checks.
- Added developer release-page audit and optional maintainer release updater scripts with dry-run mode and privacy/security checks.
- Documented release-manager usage and synchronized release-candidate notes.

## 1.4.37 - Data bounds detail visibility

- Changed the Parameters information column label to `Information`.
- Expanded Apply data bounds feedback so each affected parameter shows whether it was applied or skipped, the current/suggested bounds, the current source, skip reason, and data-derived basis.

Tests: `npm run test:parameter-ui`, `npm run build`

## 1.4.36 - Synthetic IV trace generator

- Added a Synthetic IV Trace generator to the Import Data workflow.
- The generator uses the current Model Builder model and existing backend model evaluation path instead of duplicating equations or model-builder logic.
- Added voltage start/stop/step controls, optional Gaussian absolute/relative current noise, reproducible random seed, and optional current compliance clipping.
- Generated traces are imported into the normal trace list as test data, with additive synthetic metadata containing generator settings, model snapshot, and ground-truth parameter values.
- Added transparency/manual text clarifying that synthetic recovery is a fitting/debug validation tool, not physical proof for a real device.

Tests: `cd backend && python -m pytest tests/test_synthetic_trace.py -q`, `npm run test:synthetic-ui`, `npm run build`

## 1.4.35 - Data-aware bounds suggestions

- Added a backend `bounds_suggestion` module and `/api/suggest-bounds` endpoint that estimates conservative lower/upper/initial suggestions from the selected trace and fit voltage range without changing model equations, parameter keys, or fit serialization.
- Added a Parameter table action to apply data-aware bounds only to parameters whose bounds are still registry-default or already data-suggested; user-edited bounds are skipped.
- Added transparent source reporting in parameter hover text and status messages: registry default, data-suggested from selected trace, user-edited, and fitted-as-initial.
- Documented how Rs/Rsh/current-scale/softplus bounds are estimated and clarified that suggested bounds are search-window guidance, not physical proof.
- Added backend tests for Rs/Rsh suggestion scaling, user-bound preservation policy, and unchanged fit/report structures.

Tests: `cd backend && pytest tests/test_bounds_suggestion.py`

## v1.4.34 - Fit setup polish and documentation refresh

- Reworked the Fit setup status/action dock into compact layers: status badges, action buttons, and contextual messages/diagnostics.
- Replaced large warning blocks with a single lightweight Diagnostics disclosure that combines residual cautions and warning/error details.
- Changed running-fit behavior so Run fit becomes a neutral disabled progress indicator while Stop becomes the only high-priority action.
- Kept Stop and Report neutral when disabled, and changed the no-trace empty state to informational until the user tries to run a fit.
- Disabled model, parameter, fit setup, import, and report controls while a fit is running, while keeping Stop available.
- Kept Model Builder duplicate protection on Add only; duplicate selections no longer disable the model dropdown, so users can recover by choosing another term.
- Changed blank Voltage range inputs to show the concrete selected-trace voltage min/max that the backend will use when `v_min`/`v_max` are unset.
- Rewrote README as a standalone human-facing overview of the current app instead of a stack of historical workflow notes.
- Updated current validation and handoff docs for the v1.4.34 UI workflow.

## v1.4.33 - Parameter auto-seeding and simplified restore workflow

- After a completed fit, fitted parameter values are automatically written back into the model as the next-run initial values.
- Replaced the parameter filter tab row with a single Restore initial values action that restores the values present before the most recent completed fit.
- Removed component-level Reset initials and Seed from fitted values buttons to reduce duplicated parameter actions. Component-level Fit all/Fix all remains available.
- Updated parameter grouping tests, user-facing workflow notes, current validation notes, and agent handoff documentation.

## v1.4.32 - Fit setup action dock and sidebar zoom

- Moved desktop fit status, Run fit/Stop/Report controls, warning summary, running timer, and errors into the Fit setup card, above Voltage range and Advanced objective/run options.
- Moved the global zoom control into the sidebar below the language control so the fit action dock contains only fit/report workflow controls.
- Kept the mobile bottom action bar behavior unchanged while allowing the Fit setup action dock to become non-sticky on narrow screens.

## v1.4.30 - Grouped parameters and compact model workflow

### Changed
- Reworked the Parameters table into placement and component groups for complex models: Main path first, Junction branches second, then component instances such as D1, Rs, Rsh, barriers, and softplus terms.
- Added component headers with law/form/placement/polarity summaries and fitted-count status.
- Added parameter filters for All, Fitted, Fixed, Changed, At bounds, Main path, and Junction branches.
- Added component-level Fit all, Fix all, Reset initials, and Seed from fitted values controls without changing fitting math, parameter keys, JSON export/import shape, or report keys.
- Made Model Builder more compact by editing nicknames directly on component cards and removing duplicated initial/bounds editors, parameter summaries, manual Advanced details expansion, and extra expand controls.
- Reduced Model Builder component rows to nickname, component name, and Remove; detailed law/placement/role/polarity metadata now lives on component-name hover.
- Tightened narrow-pane containment so Model Builder rows keep Remove visible and Model preview formulas scroll inside their cards instead of stretching the left pane.
- Moved polarity selection from the Add row to each added component row, so each component instance can be adjusted independently after creation.
- Made Model preview more beginner-friendly with step explanations, labeled formula blocks, and per-branch descriptions.
- Defined `softplus(x)=ln(1+exp(x))` in Model preview and in manual formula cards that use softplus terms.
- Moved Model preview below Model Builder and made it collapsed by default.
- Added a draggable Workspace divider so users can manually resize the setup/model column and the results column on desktop layouts.
- Changed Model preview formula cards to stack vertically so Junction voltage and Branch currents are not displayed side by side.
- Made Fit setup controls adapt to narrow left-pane widths with auto-stacking fields and full-width inputs/selects.
- Added a Main path softplus power-law voltage-drop component for current-activated high-current voltage loss, with backend evaluation, equation summaries, Model Builder labeling, and manual coverage.
- Moved explanatory Parameters table guidance and fit-setup summary wording out of visible UI text and into hover/help or documentation.
- Added localization/content extraction guidance and a first shared frontend content module so future translations can be handled as content work instead of component surgery.
- Removed photo-specific aliases whose behavior duplicated existing mathematical forms: Photoconductive branch is covered by Ohmic branch/custom conductance, and Photo-modulated main path is covered by Ohmic main-path resistance/custom transport terms.
- Preserved the previous fit result when editing Parameter-table initials, bounds, or fit/fixed state so fitted values remain available for inspection and seeding next initials.

### Tests
- Added pure logic coverage for parameter grouping order, filters, batch fit/fix behavior, seed-from-fitted behavior, and unchanged serialization keys.
- Verified frontend production build and browser behavior for the compact Model Builder, grouped Parameters table, collapsed Model preview, and removed visible explanatory text.

## v1.4.29 - Audit fixes, timeout, and empty-plot import shortcut

### Fixed
- Added an Import data shortcut button to the Plots empty state.
- Added Run timeout to Fit setup run options, defaulting to 60 s.
- Added frontend abort handling and backend cooperative fit timeout checks.
- Clear previous fit status, report, warnings, and verdict immediately when a new run starts.
- Made collapsed dock language toggle dynamic: English UI shows ZH, Chinese UI shows EN.
- Added positive-parameter validation for series diode barrier `I0_A` and `n`.
- Clarified `photo_modulated_main_path` help text as a fixed effective resistance for single-trace fitting.
- Reused `evaluation.solve_vj` from the fitting engine to avoid duplicated junction-solver implementations.
- Replaced tests that used private `_metrics` with the public `fit_metrics` helper.
- Rejected non-empty deprecated `seed_scale_factors` in `FitConfig`.
- Added request-size safeguards for imported text and fit trace point counts.
- Aligned frontend `FitResult.reportable` typing with the backend schema.
- Added the panel error message snippet to ErrorBoundary fallback UI.
- Standardized Parameters table numeric display so very small/large values use scientific notation.

### Tests
- Added regression tests for plot empty-state import shortcut, collapsed language toggle, parameter formatting, and series-diode parameter validation.
- Verified frontend build, backend tests, and compileall against the packaged tree.

## v1.4.28 - Sidebar default and language selector readability

### Fixed
- Fixed language selector dropdown readability in the dark sidebar by forcing native option text to dark-on-light colors.
- Changed the dock/sidebar to start collapsed by default while keeping the hamburger toggle available.

### Tests
- Verified frontend build, backend tests, and compileall against the packaged tree.

## v1.4.27 - Mobile Data page containment and lean tabs

### Fixed
- Fixed mobile Data page behavior so Spreadsheet preview uses an internal scroll area and no longer stretches behind the bottom navigation.
- Preserved the two-row desktop Data layout from v1.4.26.
- Removed per-tab subtitles from the navigation tabs.
- Removed Workspace section-header summary text such as range/objective/run-option hints.
- Removed visible Model Builder bucket-explanation text under Main path / Junction branches; the same guidance stays in the title HelpTip.
- Reviewed hover/help wording so user-facing UI does not expose developer/schema terminology.
- Shortened the sidebar note to: "Fit locally. Review before reporting."

### Tests
- Verified frontend build, backend tests, and compileall against the packaged tree.

## v1.4.26 - Data page aligned layout

### Fixed
- Reworked the Data page into a two-row aligned layout: Import data aligns with Trace selection, and Paste data aligns with Spreadsheet preview.
- Removed duplicated V/I column-name facts from the Trace selection panel.
- Kept import-quality warnings, trace count, point count, display units, and internal-fit unit information visible without repeating the same metadata twice.

### Tests
- Verified frontend build, backend tests, and compileall against the packaged tree.

## v1.4.25 - Remove duplicate Add guidance noise

### Fixed
- Removed the repeated visible Model Builder duplicate/equivalent Add explanation below the disabled Add row.
- Kept the disabled Add state and hover/title explanation so the reason remains available without adding visual noise.
- Made the role-aware D2 action single-use so it cannot repeatedly create D3/D4 secondary diodes.

### Tests
- Verified frontend build, backend tests, and compileall against the packaged tree.

## v1.4.24 - Parameters section full-width fix

### Fixed
- Fixed the result grid so the Parameters section spans the full right Workspace pane after warnings were moved to the top banner.
- Kept the interactive Parameters table autosizing behavior from v1.4.22.
- Preserved narrow-screen horizontal scroll fallback.

### Tests
- Verified frontend build, backend tests, and compileall against the packaged tree.

## v1.4.23 - Compact Workspace status area

### Fixed
- Reduced Workspace top clutter by compressing fit status into a single-line summary.
- Moved fit-verdict details into an expandable details block.
- Changed warning display to a compact one-line dismissible summary with optional expanded details.
- Preserved Run/Stop/Report controls and backend-owned reportability behavior.

### Tests
- Verified frontend build, backend tests, and compileall against the packaged tree.

## v1.4.22 - Wide-screen Parameters table layout

### Fixed
- Made the interactive Parameters table expand to available Workspace width on wide screens.
- Reduced unnecessary horizontal scrolling for editable initial values, bounds, fit/fixed controls, and parameter interpretation.
- Preserved horizontal scroll protection for narrow/mobile screens.

### Tests
- Verified frontend build, backend tests, and compileall against the packaged tree.

## v1.4.21 - Diode polarity, interactive parameters, and warning workflow

### Fixed
- Added explicit forward polarity and primary role metadata to the default D1 branch diode.
- Replaced raw `shockley_diode` component title text with user-facing law names.
- Preserved duplicate blocking for ordinary repeated components while adding a role-aware D2 action for explicit two-diode models.

### Changed
- Made the Parameters table interactive: users can edit initial values, bounds, and fit/fixed state for the next fit.
- Moved fit warnings/errors into a unified Workspace-top summary banner with a dismiss button.
- Hid fit status and Run/Stop/Report controls from Data and User Manual views.

### Tests
- Added backend regression tests for role-aware two-diode duplicate handling.
- Verified frontend build, backend tests, and compileall against the packaged tree.

## v1.4.20 - Navigation-style User Manual reader

### Changed
- Reworked the in-app User Manual from a long scrolling document into a navigation-style reader that shows one section at a time.
- Changed the Function Guide to a selector + detail layout so users choose one model term before reading its full explanation.
- Integrated the Law/Form/Placement chapter into the User Manual, explaining that a model term is a law plus an evaluation form plus a placement.
- Added responsive manual navigation styles without adding dependencies or changing solver/model behavior.

### Tests
- Verified frontend build, backend tests, and compileall against the packaged tree.

## v1.4.19 - Tutorial-style User Manual integration

### Changed
- Reworked the in-app User manual into a tutorial-style guide based on the reviewed v1.4.18 manual draft.
- Added a top-level explanation of the self-consistent IV fitting problem before model-function details.
- Added workflow cards, model-builder concepts, formula assembly, fitting mechanics, recipes, residual interpretation, reportability guidance, light-response workflow, troubleshooting, and glossary sections.
- Kept English and Chinese content separated by the existing language selector instead of showing bilingual text in the same panel.
- Added dedicated User manual CSS while preserving current app behavior.

### Tests
- Verified frontend build, backend test suite, and Python compile checks against the packaged tree.

## v1.4.18 - Semantic consistency stabilization

### Fixed
- Added backend validation for location/placement/evaluation-form coherence so imported or hand-edited JSON cannot silently put branch-current components into the main path or series voltage-drop components into branch buckets.
- Made `duplicate_unidentifiable_component` an error and a non-reportable warning code.
- Clamped voltage-dependent photocurrent magnitude to be non-negative so `direction_sign` remains the only current-direction control, including when `gain_per_V` is negative.

### Tests
- Added regression tests for location/placement mismatch validation, duplicate unidentifiable components, non-reportability from bypassed JSON, and negative-gain voltage-dependent photocurrent.

## v1.4.17 - Stabilization refactor

### Changed
- Extracted Model Builder rule and mutation logic into pure frontend modules under `frontend/src/model-builder/`.
- Split fitting-engine implementation into evaluation, residual, metrics, multistart, warning, and reportability helper modules while keeping the public fitting API stable.
- Added backend-owned `reportable` and `reportability_reason` fields to FitResult so the UI does not invent reportability independently.
- Split Model Builder/circuit CSS into `frontend/src/styles/model-builder.css` and imported it from the root stylesheet.

### Tests
- Added regression tests for extracted metrics, multistart, backend reportability, frontend Model Builder rule extraction, and CSS split structure.

## v1.4.17 - Stabilization hotfix

### Fixed
- Changed frontend APP_VERSION fallback to `dev` to avoid stale serialized model versions outside Vite version injection.
- Added abort handling for equation preview updates so rapid model edits cannot leave obsolete requests racing the current state.
- Expanded ErrorBoundary coverage around fit configuration, Model Builder, equation preview, and warnings panels.
- Marked `graph_dc` diagnostic solver results as not reportable with an error-severity warning.
- Added deprecation handling for ignored `seed_scale_factors`; use `multistart_n_seeds` instead.
- Added stricter validation for photocurrent magnitude parameters and invalid `direction_sign = 0`.
- Improved log-magnitude metric handling near zero current by excluding near-floor measured points and reporting the excluded count.

### Changed
- Tightened duplicate component handling so ordinary Add cannot create another identical law/form/placement/polarity component.
- Kept v1.4.15 main-path transport options; this release focuses on stabilization rather than new modeling features.

### Tests
- Added regression tests for deprecated multistart config, graph_dc reportability, photocurrent validation, direction-sign validation, and near-zero log metrics.

## v1.4.17 - Expanded main-path transport functions

- Expanded the Model Builder main-path menu beyond Ohmic resistance and Series diode barrier.
- Exposed advanced main-path transport forms: Softplus transport modifier, Custom transport modifier, and interpretive Photo-modulated effective main path.
- Kept main-path terms as voltage-drop / transport-bottleneck forms, not branch-current copies.
- Added a guard that prevents combining Photo-modulated effective main path with an ordinary Ohmic series resistance in single-trace fitting, because they are normally indistinguishable.
- Updated equation preview and backend equation summaries for conductance-modifier main-path terms.

## v1.4.13 - Function Guide alignment for series-barrier model structure

- Added user-facing Function Guide documentation for the Series diode barrier main-path voltage-drop form.
- Clarified that branch diode and main-path diode barrier are different evaluation forms of a diode-like law.
- Marked Photo-modulated main path as an advanced interpretation because it is not identifiable separately from effective series resistance in single-trace fitting.
- Updated diode parameter notes to include forward/reverse polarity.

## v1.4.12 - Model Builder law/form/placement cleanup

- Added a main-path Series diode barrier as the voltage-drop form of the Shockley law.
- Added forward/reverse polarity support for branch diode current laws.
- Removed Photo-modulated main path from the default Model Builder add menu because it is not distinguishable from an effective series resistance in single-trace fitting.
- Added duplicate model-structure guards for same law/form/placement/polarity combinations, while allowing explicit two-diode branch roles.
- Updated model equations and backend tests for the new series-barrier and polarity behavior.

## v1.4.11 - Plot trace selector and cleaner plot header

- Removed the redundant selected-trace explanatory sentence from the Plots header.
- Added a trace selector directly in the Plots header so users can switch plotted traces without returning to the Data tab.
- Kept trace switching behavior consistent with the existing selected-trace workflow: changing the plotted trace clears stale fit/report results before the next fit.

## v1.4.10 - Full HappyMeasure sample data loader

- Replaced the Data page sample loader with the full anonymized HappyMeasure combined wide-v2 sample.
- Preserved all data rows from the uploaded HappyMeasure multi-trace file while removing sample identifiers, timestamps, port names, and fingerprints.
- Bundled the same anonymized 14-trace sample under `examples/testdata/` and `frontend/public/sample_data/` so browser-based "Load sample data" exercises the real importer path.
- Removed the old synthetic/mock IV sample from the default sample workflow.

## v1.4.9 - HappyMeasure selected-column import fix

- Fixed HappyMeasure combined wide-v2 imports when the UI or API supplies explicit selected columns such as `Voltage_V` and `T001 ... [Current_A]`.
- Made single-trace import prefer the explicit HappyMeasure `# section,data` table so the preceding trace-metadata table is not mistaken for the data header.
- Added an anonymized HappyMeasure combined wide-v2 fixture that reproduces the selected-column failure without sample-specific device names.
- Replaced the older mock example dataset with a de-identified filename and trace label.

## v1.4.8 - Documentation cleanup and consolidation

- Added `docs/DOCUMENTATION_INDEX.md` as the stable documentation map.
- Consolidated historical `TESTED_*` notes into `docs/VALIDATION_HISTORY.md` and `docs/TESTED_CURRENT.md`.
- Rewrote `docs/WEBUI_AGENT_HANDOFF.md` as the single current handoff file.
- Removed stale root-level `HANDOFF_*` files and old per-version `docs/TESTED_*` files.
- Updated architecture, import/export, reporting, responsive-layout, roadmap, and release-checklist docs to match the current v1.4.x app.

## v1.4.7 - Function Guide docs and regression check

- Updated README and handoff notes for the user-facing Function Guide rewrite.
- Added a regression test that checks the default Function Guide documentation block does not expose internal schema terms.
- Added exact-tree tested notes, now consolidated into `docs/TESTED_CURRENT.md` and `docs/VALIDATION_HISTORY.md`.

## v1.4.6 - User-facing Function Guide rewrite

- Rewrote the User manual Function Guide around physical purpose, use cases, unsuitable cases, I-V curve effects, parameters, and fitting strategy.
- Moved internal registry/schema information into collapsed Advanced details.
- Added rendered formula blocks for each function card.
- Updated project rules so user-facing function documentation prioritizes physical interpretation.

## v1.4.5 - Run-state feedback, Stop action, and expanded zoom

- Added visible fitting-running feedback in the toolbar and workspace.
- Added a Stop action that lets users ignore an in-flight fit result and recover the UI.
- Expanded app zoom limits for high-resolution displays.

## v1.4.4 - Mobile portrait layout

- Improved mobile portrait layout on screens <= 640 px.
- Replaced the small floating run action with a full-width sticky mobile action bar.
- Added a user-facing backend connection banner for failed fetch/API connectivity errors.
- Made section headers more touch-friendly and compacted voltage range controls.

## v1.4.3 - HappyMeasure CSV import compatibility

- Improved HappyMeasure CSV v2 import for single, wide, and long exports.
- Added current-source handling so `Current_A, Voltage_V` exports are converted into IV-fitter voltage/current arrays correctly.
- Added tests for HappyMeasure current-source single, wide, and long files.

## v1.4.2 - LAN startup and fetch diagnostics fix

- Reworked `04c_run_lan_dev.bat` so one script explicitly starts both backend and frontend in separate windows.
- Added a backend health-check wait before launching the frontend.
- Added LAN-safe frontend API-base inference as a fallback when `VITE_API_BASE` is not set.
- Expanded LAN troubleshooting notes for `TypeError: Failed to fetch`, firewall blocks, occupied ports, and multiple IPv4 adapters.

## v1.4.1 - LAN phone/tablet testing helper

- Added `04c_run_lan_dev.bat` for local Wi-Fi phone/tablet browser testing.
- Documented firewall, same-Wi-Fi, hotspot fallback, and `localhost` troubleshooting notes in README.
- Clarified that LAN mode is a local development helper, not public deployment.

## v1.4.0 - Photocurrent and light-response modeling

- Added light-response modeling as first-class Law / Form / Placement components rather than a hard-coded `-Iph` parameter.
- Added backend laws for constant photocurrent, voltage-dependent photocurrent, photoconductive branch current, and photo-modulated main-path voltage drop.
- Added model-specific equation summaries for photocurrent terms.
- Removed the user-facing circuit read-order phrase that exposed implementation/discussion wording.
- Added photocurrent guidance warnings and documented the dark/light workflow.

## v1.3.14-v1.3.16 - Data safety, circuit layout, and readable formulas

- Fixed Data workspace unit selectors so they are display-only; imported fitting arrays remain SI V/A.
- Routed browser Data import through the backend multi-trace import endpoint.
- Reworked the Model Builder equivalent-circuit preview for compact/narrow layouts.
- Added shared readable formula rendering for User manual and model preview.

## Earlier alpha history

Earlier v1.0-v1.3 alpha changes are summarized in `docs/VALIDATION_HISTORY.md`. The old per-version tested/handoff files were removed in v1.4.9 to keep the repository readable.
