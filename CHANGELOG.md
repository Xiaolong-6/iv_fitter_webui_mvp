# Changelog

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
