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
