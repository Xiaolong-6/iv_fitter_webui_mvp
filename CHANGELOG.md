# Changelog

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
