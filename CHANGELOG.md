# Changelog

## v1.4.5 - Run-state feedback, Stop action, and expanded zoom

- Added visible fitting-running feedback in the toolbar and workspace.
- Added a Stop action that lets users ignore an in-flight fit result and recover the UI.
- Expanded app zoom limits for high-resolution displays.

## v1.4.3 - HappyMeasure CSV import compatibility

- Improved HappyMeasure CSV v2 import for single, wide, and long exports.
- Added current-source handling so `Current_A, Voltage_V` exports are converted into IV-fitter voltage/current arrays correctly.
- Added tests for HappyMeasure current-source single, wide, and long files.

## v1.4.2 - LAN startup and fetch diagnostics fix

- Reworked `04c_run_lan_dev.bat` so one script explicitly starts both backend and frontend in separate windows.
- Added a backend health-check wait before launching the frontend, so backend startup failures are visible before browser testing.
- Added LAN-safe frontend API-base inference as a fallback when `VITE_API_BASE` is not set.
- Expanded LAN troubleshooting notes for `TypeError: Failed to fetch`, firewall blocks, occupied ports, and multiple IPv4 adapters.

## v1.4.1 - LAN phone/tablet testing helper

- Added `04c_run_lan_dev.bat` for local Wi-Fi phone/tablet browser testing.
- The LAN launcher checks common prerequisites, prints the detected computer IPv4 URL, starts the backend on `0.0.0.0:8000`, starts the frontend on `0.0.0.0:5173`, and sets the frontend API base to the computer LAN IP.
- Documented firewall, same-Wi-Fi, hotspot fallback, and `localhost` troubleshooting notes in README.
- Clarified that LAN mode is a local development helper, not public deployment.

## v1.4.0 - Photocurrent and light-response modeling

- Added light-response modeling as first-class Law / Form / Placement components rather than a hard-coded `-Iph` parameter.
- Added backend laws for constant photocurrent, voltage-dependent photocurrent, photoconductive branch current, and photo-modulated main-path voltage drop.
- Added model-specific equation summaries for photocurrent terms so normal formula preview can show `Iph`, `Iph(Vj)`, `Gph Vj`, and `R0/(1+photo_gain)` terms.
- Updated Model Builder filtering so main-path-only laws do not appear in branch-only contexts and branch-current laws do not appear as main-path voltage drops.
- Removed the user-facing circuit read-order phrase that exposed implementation/discussion wording.
- Added photocurrent guidance warnings for dark-first fitting, near-bound photocurrent parameters, and over-parameterized voltage-dependent photocurrent fits.
- Documented dark/light fitting workflow and left presets plus ΔI(V) two-trace preview as future features.

## v1.3.16 - Readable rendered formulas in the User manual

- Added a shared lightweight math renderer component so manual formulas render in a readable textbook-like style instead of plain code blocks.
- Replaced User manual code-style equations with rendered math cards for the D1 + Rs + Rsh example and the combined implicit equation.
- Rendered inline formulas in the manual for canonical law examples and key parameter symbols such as I₀, Rₛ, and Rsh.
- Kept the v1.3.15 circuit-layout improvement and the v1.3.14 data-unit/import-quality fixes.

## v1.3.15 - Compact circuit branch layout

- Reworked the equivalent-circuit preview so parallel branches fold below the main path and return to one shared terminal-minus node.
- Removed the duplicate Main path / Branches text summary below the Model Builder title; the diagram and component sections now carry that information without repeating it.
- Kept the v1.3.14 data-unit safety and backend import-quality fixes.

## v1.3.14 - Audit fixes for data units and circuit readability

- Fixed Data workspace unit selectors so they are display-only; imported fitting arrays remain in SI units (V/A) and are not rescaled when users change preview units.
- Routed browser Data import through the backend multi-trace import endpoint so import-quality warnings and column decisions are surfaced in the UI.
- Added an import-quality summary panel in Data for rows, selected columns, dropped rows, and backend warnings.
- Reworked the Model Builder equivalent-circuit preview as a left-to-right SVG schematic: Terminal+ -> main path -> Vj -> junction branches -> Terminal-.
- Added v1.3.14 tested notes and updated package/backend/frontend/UI fallback versions.

## v1.3.13 - Model-builder circuit placement and unified tooltips

- Moved the equivalent-circuit schematic from Model preview into Model Builder so topology feedback appears beside topology editing.
- Kept the remaining Model preview formula, parameter-value, solver, and component-meaning cards in place.
- Reduced always-visible Model Builder guidance text; detailed explanations now live in hover help.
- Added a shared portal tooltip layer for legacy `title` hover text so old hover hints use the same readable top-level styling as question-mark help.
- Added editable parsed-data dataset names and voltage/current unit selectors in the Data workspace.
- Rewrote the README as a human-facing product and quick-start overview with documentation grouped by audience.
- Bumped backend, frontend, root package, and UI fallback versions to 1.3.13.

## v1.3.12 - Audit findings fixed and handoff hardening

- Fixed stderr/covariance reporting by scaling `(JᵀJ)⁻¹` with final residual variance.
- Removed silent junction-voltage fixed-point fallback; unbracketed implicit solves now produce non-finite predictions and error warnings instead of fake results.
- Made graph DC KCL failures return NaN currents and surface `graph_solver_kcl_failed` warnings.
- Added bounded/log-space deterministic multistart seed generation controlled by `multistart_n_seeds`.
- Added temperature validation for nonpositive Kelvin values.
- Updated API version and frontend app version to use dynamic package/build version sources rather than stale hardcoded constants.
- Added import fallback warnings when voltage/current columns cannot be identified by name.
- Added React ErrorBoundary protection around plot and parameter panels.
- Debounced equation-preview API calls to avoid request flooding while editing model parameters.
- Reworked ModelBuilder into readable subcomponents for safer future agent patches.
- Added audit regression tests for covariance, solver failure paths, import warnings, temperature validation, API versioning, and unsafe custom expressions.
- Updated handoff notes, rules, tested notes, and audit-fix documentation for v1.3.12.

## v1.3.11 - Audit-readiness cleanup and rule consolidation

- Rewrote the README to remove stale 1.0.0-era sections and align setup instructions with root-level dependency manifests.
- Consolidated PROJECT_RULES.md into stable operating principles instead of repeated version-specific incident blocks.
- Added an explicit rules-maintenance principle requiring periodic cleanup when the rules file becomes repetitive.
- Updated physics/user-transparency policy docs to match current Law / Form / Placement and Main path / Branches semantics.
- Added audit-readiness review notes and v1.3.11 tested notes.
- Bumped backend, frontend, and root package versions to 1.3.11.

## v1.3.10

- Added a dedicated Data import workspace with import buttons, pasted-data parsing, multi-trace trace selector, and spreadsheet preview.
- Added polarity selection to Model Builder functions where supported.
- Added hover hints for user inputs and selections while keeping implementation details out of the main UI text.
- Kept workspace focused on fitting/modeling by moving import workflow out to the Data tab.

## v1.3.9 - Unified Ohmic law nicknames, root dependencies, and UI polish

- Treat Rs and Rsh as default user nicknames for Ohmic law instances rather than separate user-facing functions.
- Hide the legacy shunt adapter from the normal Model Builder add menu while preserving backend compatibility.
- Add editable component nicknames and propagate Ohmic nicknames into parameter labels and formula previews.
- Add root-level `requirements.txt`, root `package.json`, and `DEPENDENCIES.md` so setup dependencies are visible at project root.
- Update setup/run scripts to install frontend dependencies from the root package manifest.
- Apply the uploaded UI-review recommendations by compacting Model Builder, adding a sticky model summary, and moving developer details behind disclosure controls.


## v1.3.8 - Main-path/branch Model Builder and user-facing UI cleanup

- Simplified Model Builder grouping to user-facing Main path and Branches buckets.
- Removed solver/internal grouping labels from the user workflow.
- Hid developer-oriented import/input implementation details behind small help tooltips.
- Added tab icons to the left dock; collapsed dock now shows icons instead of first letters.
- Kept numeric parameter editors tolerant of negative and scientific notation drafts.
- Updated user-facing text and rules for non-dark-box documentation without exposing agent/developer mechanics.
## 1.3.8

Focus: model-specific rendered equations, real right-panel scrolling, robust numeric drafts, and trace-scaled residual floor.

- Replaced debug/plain equation strings with displayed formula cards for the currently selected model.
- Render D1/Rs/Rsh-style models as equivalent-circuit, junction-voltage, branch-current, combined-equation, and solver-residual cards.
- Reworked desktop layout to use explicit flex scroll ownership so the right plot/results column can actually scroll.
- Fixed numeric fields so values such as `-0.1` and `1e-9` can be typed without intermediate NaN commits or sign rewrites.
- Estimate `residual_floor_A` from the selected trace when data is loaded or the selected trace changes.
- Updated project rules and tested notes for rendered equations, scroll ownership, numeric draft input, and residual-floor auto-scaling.

## 1.3.5

Focus: HappyMeasure multi-trace import, plot safety, selected-model equation transparency, and numeric input editing.

- Add browser-side HappyMeasure CSV v2 multi-trace import for single-v2, wide-v2, and long-v2 files.
- Add backend multi-trace import helper and regression tests for wide-v2 and long-v2.
- Add trace list and selected-trace workflow; fitting uses one selected trace while other traces remain visible for comparison.
- Fix SVG plot fill/stitching bug by keeping fit paths unfilled and sorting line-series points for display.
- Add live equation/equivalent-circuit preview for the currently selected model before running a fit.
- Fix numeric text boxes so partial negative/scientific notation input does not commit NaN or block typing.
- Expand user-facing documentation around multi-trace import, selected-trace fitting, equivalent-circuit assembly, and actual convergence logic.
- Update project rules for HappyMeasure import, plot safety, and numeric input editing.


## 1.3.5

- Make Model Builder add menus use the same unified function library in main, series, and parallel topology buckets.
- Keep placement as the explicit topology decision instead of hiding functions behind series/parallel-specific menus.
- Clarify that legacy composite mode supports only the classic topology while graph_dc uses component placement.
- Update user-facing topology documentation and version display.


## 1.3.0

- Add experimental DC graph solver mode for topology-assembled models.
- Add solver-mode configuration and graph-solver regression tests.
- Keep legacy composite solver available for compatibility.

# Changelog

## v1.4.5 - Run-state feedback, Stop action, and expanded zoom

- Added visible fitting-running feedback in the toolbar and workspace.
- Added a Stop action that lets users ignore an in-flight fit result and recover the UI.
- Expanded app zoom limits for high-resolution displays.

## v1.4.3 - HappyMeasure CSV import compatibility

- Improved HappyMeasure CSV v2 import for single, wide, and long exports.
- Added current-source handling so `Current_A, Voltage_V` exports are converted into IV-fitter voltage/current arrays correctly.
- Added tests for HappyMeasure current-source single, wide, and long files.

## v1.4.2 - LAN startup and fetch diagnostics fix

- Reworked `04c_run_lan_dev.bat` so one script explicitly starts both backend and frontend in separate windows.
- Added a backend health-check wait before launching the frontend, so backend startup failures are visible before browser testing.
- Added LAN-safe frontend API-base inference as a fallback when `VITE_API_BASE` is not set.
- Expanded LAN troubleshooting notes for `TypeError: Failed to fetch`, firewall blocks, occupied ports, and multiple IPv4 adapters.

## v1.4.0 - Photocurrent and light-response modeling

- Added light-response modeling as first-class Law / Form / Placement components rather than a hard-coded `-Iph` parameter.
- Added backend laws for constant photocurrent, voltage-dependent photocurrent, photoconductive branch current, and photo-modulated main-path voltage drop.
- Added model-specific equation summaries for photocurrent terms so normal formula preview can show `Iph`, `Iph(Vj)`, `Gph Vj`, and `R0/(1+photo_gain)` terms.
- Updated Model Builder filtering so main-path-only laws do not appear in branch-only contexts and branch-current laws do not appear as main-path voltage drops.
- Removed the user-facing circuit read-order phrase that exposed implementation/discussion wording.
- Added photocurrent guidance warnings for dark-first fitting, near-bound photocurrent parameters, and over-parameterized voltage-dependent photocurrent fits.
- Documented dark/light fitting workflow and left presets plus ΔI(V) two-trace preview as future features.

## 1.1.3-plot-control-convergence-tabs

### Added
- Added sidebar hamburger control to collapse/restore the left navigation panel.
- Added a Fit & convergence user-facing tab covering staged fitting, initial values, bounds, residual inspection, and convergence interpretation.
- Added per-plot visibility controls so users can show one plot, several plots, or all plots.
- Added local plot zoom controls: X/Y zoom buttons, X pan buttons, reset, mouse-wheel X zoom, and Shift+wheel Y zoom.
- Made component initial values explicit in Model Builder with an Initials button, initial/bounds/fixed editor, and reset-to-defaults action.

### Changed
- Moved Parameters and Warnings below the plots in the main workspace instead of keeping them as a separate right-side result column.
- Reorganized Fit setup into clearer Range, Objective, and Run options sections.
- Enlarged and clamped chart hover tooltips so the hover text is fully covered by the tooltip background.

### Rationale
Patch-level UI iteration within the 1.1 line: no backend schema or API break, but the main workflow is more transparent and controllable.

## 1.1.2-user-doc-tabs

### Added
- Added left-panel navigation tabs for Workspace, User guide, Function guide, and Fitting logic.
- Added persistent lower-left app version display in the sidebar.
- Added registry-driven user-facing function documentation inside the UI.
- Added product rule requiring user-facing documentation tabs to be checked for consistency before each release.

### Fixed
- Added frontend-side numerical sanity fallback so an implausibly exploded fit is not shown as green completed even if an old/stale backend response lacks quality-gate error warnings.
- Updated stale README version text and replaced outdated Plotly architecture wording.
- Removed generated Python/pytest cache files from the handoff package.

### Rationale
Minor bump from 1.1.1 to 1.1.2 because this adds a user-visible navigation/documentation workflow while preserving the existing API and model schema.

## 1.0.0

- Marked Web UI MVP as a 1.0 candidate architecture snapshot.
- Added schema-stability and release-checklist docs.
- Added sample trace and reproducible fit-request example.
- Added version endpoint and 1.0 schema/reproducibility tests.

## 1.0.0

- Added residual-floor and optional multistart controls to FitConfig/backend.
- Added fitting parity and diagnostics plan.
- Added tests for multistart warnings and residual-floor serialization.

## 1.0.0

- Added frontend function-library drawer, equation preview, and model-transparency components.
- Strengthened user transparency and scientific wording documentation.
- Added styling for help/preview panels without changing backend schemas.

## 1.0.0

- Added CSV/TXT text import with quality summaries and finite-row filtering.
- Added reproducible FitResult JSON export and parameter CSV export helpers/endpoints.
- Documented import/export transparency rules.

## 1.0.0

- Added physics-oriented ModelSpec validation and validation endpoint integration.
- Added function-extension and physics-modeling policy docs.
- Fit warnings now include schema/physics transparency warnings.

## 1.0.0

- Added desktop-packaging assessment and local backend launcher stub.
- Added roadmap to 1.0 candidate.
- Updated agent handoff with current run/test instructions.
- Kept architecture local-first and frontend-agnostic.

## 0.4.0

- Added Markdown report export endpoint and frontend report panel.

## 0.3.0

- Added implicit junction-voltage solver, branch contributions, compliance mask, expanded metrics, and stderr estimates.

## 0.2.0

- Added interactive frontend Model Builder, CSV import, Plotly plots, and fit configuration UI.

## 0.1.0

- Initial FastAPI + React greenfield scaffold.

## 1.0.1-dev-rules-dx

Developer-experience and process-rules patch.

### Added
- Root-level PowerShell scripts for setup, backend tests, backend smoke checks, backend run, frontend run, combined dev run, and Python environment checks.
- Root `.venv` convention to avoid repeated backend subfolder virtual environments.
- Development rules covering Python version baseline, environment confirmation, mistake-learning, testing responsibility, compact package size, physics transparency, function-extension discipline, documentation-audience separation, and the Explain-actions rule.
- Human developer setup guide.
- Agent developer rules.
- Documentation audience policy.
- HPQ4-like mock IV CSV at `examples/HPQ4_mock_IV_trace_webui_test.csv`.

### Changed
- README now starts with a Windows quick-start flow.
- `.gitignore` now excludes root/backend venvs, node modules, build artifacts, caches, and logs.

### Rationale
This patch codifies lessons from setup friction: do not require manual venv activation, always verify the human developer environment first, and separate user/developer/agent documentation.

## 1.0.2-one-click-windows-scripts

### Added
- Root-level `.bat` wrappers for environment check, setup, backend tests, backend run, frontend run, and combined dev run.
- One-click Windows workflow documentation.
- Development rule requiring one-click scripts for common human workflows when possible.
- Agent rule warning not to rely only on PowerShell `.ps1` scripts.

### Rationale
PowerShell blocks `.ps1` files on many Windows installations. The `.bat` wrappers use process-local `-ExecutionPolicy Bypass` so users can double-click common workflows without permanently changing system policy.

## 1.0.3-windows-script-fix

### Fixed
- Removed stale `ignoreDeprecations` from `tsconfig.json` so frontend build works with the installed TypeScript version.
- Fixed PowerShell parser error caused by `$PythonVersion:` inside a double-quoted string.
- Hardened PowerShell scripts against the same variable-colon interpolation hazard.

### Added
- `validate_scripts.ps1` and `validate_scripts.bat` to check PowerShell script syntax before setup/install.
- Development and agent rules requiring helper script validation before handoff.

### Rationale
One-click scripts only help if they are syntax-checked before users run them. This patch codifies script validation as part of the handoff process.

## 1.0.4-numbered-one-click-scripts

### Added
- Numbered root-level one-click Windows wrappers:
  - `00_validate_scripts.bat`
  - `01_check_environment.bat`
  - `02_setup_dev.bat`
  - `03_test_backend.bat`
  - `04_run_dev.bat`
  - `04a_run_backend_only.bat`
  - `04b_run_frontend_only.bat`
- Rule requiring human-facing scripts to be numbered when they have a recommended order.

### Changed
- README now documents the numbered workflow explicitly.
- Human developer setup and Windows one-click script docs now point to numbered files first.
- Unnumbered `.bat` files remain as compatibility aliases.

## 1.0.5-clean-numbered-scripts

### Fixed
- Removed redundant unnumbered `.bat` aliases and numbered wrapper chains.
- Replaced thin call-through numbered wrappers with direct numbered scripts.

### Added
- Development and agent rules forbidding pointless wrapper chains when a simple rename/direct script is sufficient.

### Rationale
Numbering scripts should simplify the human workflow, not add extra files and indirection. The project root now exposes one clear numbered script per human action.

## 1.0.6-node-lts-and-handoff-rules

### Added
- `01a_install_node_lts.bat`, an optional one-click helper for installing/checking Node.js LTS when npm is missing.
- Development rule requiring every handed-off commit/package to be coherent and handoff-ready.
- Development rule requiring guided install paths for optional external tools such as Node.js/npm.
- Agent handoff rule requiring docs, changelog, tests/limitations, script sanity, and next action clarity before handoff.

### Changed
- `setup_dev.ps1` now tells users exactly what to do when npm is missing: run `01a_install_node_lts.bat`, then rerun `02_setup_dev.bat`.
- README, Windows script docs, and human developer setup docs now explain the npm-missing path.

## 1.0.7-test-handoff-fix

### Fixed
- Fixed backend test collection errors caused by missing `sample_trace()` export in `test_backend_mvp.py`.
- Updated import/export test to match actual parameter ID casing (`D1.I0_A`).
- Updated multistart test so it enables at least one free parameter before expecting multistart warnings.

### Added
- `docs/TESTED_1_0_7.md` with exact checks run and results.
- Development and agent rules requiring package tests to be run against the exact handoff tree when possible.

### Verified
- `PYTHONPATH=backend python -m pytest backend/tests -q` → 15 passed.
- `python -m compileall -q backend/ivfitter backend/tests` → passed.

## 1.0.8-frontend-blank-fix

### Fixed
- Fixed frontend build configuration that could cause the Vite page to render blank.
- Updated `tsconfig.json` to use `moduleResolution: "Bundler"` and silence the TypeScript 6 deprecation warning.
- Added React/ReactDOM/Plotly type packages to frontend dev dependencies.
- Added Vite client type reference for `import.meta.env` and CSS side-effect imports.
- Updated frontend `FitConfig` type to include backend fields used by the UI.

### Added
- `docs/TESTED_1_0_8.md` with backend and frontend validation results.
- Development and agent rules requiring `npm run build` validation for frontend handoffs.
- README blank-page troubleshooting note.

### Verified
- Backend tests: 15 passed.
- Backend compileall: passed.
- Frontend `npm install`: passed.
- Frontend `npm run build`: passed.

## 1.0.9-plotly-runtime-and-root-rules-fix

### Fixed
- Fixed blank-page runtime error in `PlotWorkspace` caused by treating the `react-plotly.js` runtime module object as a React component.
- Replaced `react-plotly.js` usage with a local `PlotlyChart` wrapper that calls `Plotly.react()` on a div.
- Switched frontend dependency to `plotly.js-dist-min` and removed the direct `react-plotly.js` dependency.

### Added
- Root-level `PROJECT_RULES.md` as the highest-priority durable project rules file.
- Runtime React rule requiring browser-console validation for blank-page issues.
- `docs/TESTED_1_0_9.md` with exact validation results.

### Verified
- Backend tests: 15 passed.
- Backend compileall: passed.
- Frontend `npm install`: passed.
- Frontend `npm run build`: passed.

## 1.0.10-frontend-dependency-hygiene

### Fixed
- Removed heavy Plotly dependency from the MVP frontend to avoid large npm downloads and timeout-prone installs.
- Replaced Plotly charts with a compact built-in SVG chart component.
- Changed frontend run script so it no longer silently runs `npm install`; it now stops and tells the user to run `02_setup_dev.bat` if dependencies are missing.
- Added project-local `frontend/.npmrc` pointing to the public npm registry.

### Added
- Privacy rule forbidding local paths/user identifiers in commit messages, docs, changelog, and handoff notes.
- Setup/run separation rule.
- `docs/NPM_TROUBLESHOOTING.md`.
- `docs/TESTED_1_0_10.md`.

### Verified
- Backend tests: 15 passed.
- Backend compileall: passed.
- Frontend `npm install`: passed.
- Frontend `npm run build`: passed.

## 1.1.0-responsive-workspace

### Changed
- Reworked the Web UI into a viewport-oriented responsive workspace with side-by-side controls, plots, and results on landscape displays.
- Added app-local zoom controls and Ctrl + mouse-wheel zoom support.
- Changed panels to use internal scrolling instead of one long document-style page scroll.
- Added portrait/narrow-screen fallback layout.

### Added
- `docs/RESPONSIVE_WORKSPACE.md`.
- Version-bump rule requiring patch/minor/major selection based on change impact.
- `docs/TESTED_1_1_0.md`.

### Version rationale
This is a minor version bump from 1.0.x to 1.1.0 because it changes the main user workflow and layout in a backward-compatible, user-visible way.

### Verified
- Backend tests.
- Backend compileall.
- Frontend `npm install`.
- Frontend `npm run build`.

## 1.1.1-numerical-sanity-hover

### Fixed
- Added backend numerical quality gates so exploded fits are not presented as clean successful fits.
- Updated fit status display to show quality-gate failures and error counts.
- Fixed function/polarity UI so functions without polarity do not show a misleading `forward` selector.
- Collapsed component parameter editors by default to reduce left-panel length.
- Improved parameter/bounds formatting with compact engineering notation.

### Added
- Hover tooltip support in the local SVG chart component.
- Robust chart scaling with clipped-point indicator.
- `backend/ivfitter/core/fit_quality.py`.
- `frontend/src/model/format.ts`.
- `docs/NUMERICAL_SANITY_AND_HOVER.md`.
- Modular UI rule in `PROJECT_RULES.md` and development rules.
- Fit-completed quality-gate rule.

### Version rationale
Patch bump from 1.1.0 to 1.1.1 because this is a bug/sanity/UX hardening update within the existing 1.1 responsive workspace.

### Verified
- Backend tests.
- Backend compileall.
- Frontend `npm install`.
- Frontend `npm run build`.

## 1.3.8

- Replaced equation preview strings with model-specific rendered formula cards.
- Reworked right-side workspace scrolling with explicit flex scroll ownership.
- Fixed numeric inputs so values such as `-0.1` can be typed without transient NaN commits.
- Automatically estimates and updates residual floor when the selected trace changes.
- Added tested notes and rules for rendered equations, numeric input drafts, and residual-floor auto-scaling.
