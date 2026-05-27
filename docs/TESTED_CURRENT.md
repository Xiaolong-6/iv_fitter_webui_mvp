## v1.5.10 local API and diagnostics hardening check

Scope: address the audit hardening items that are low-risk for the current desktop/LAN workflow. The default localhost app remains frictionless, while LAN mode can protect API routes with a simple shared token. Unexpected internal errors are now logged server-side and shown to the frontend as a generic 500 unless `IVFITTER_DEBUG_ERRORS=1` is set. Local file-dialog import no longer returns an absolute path as a display label.

Expected behavior:

- Normal local dev without `IVFITTER_API_TOKEN` continues to work without login or headers.
- When `IVFITTER_API_TOKEN` is set, `/api/component-registry` and other non-health API routes require `X-IVFITTER-API-Key`; `/api/health` and `/api/version` remain open for diagnostics.
- `04c_run_lan_dev.bat` generates one per-session token and passes it to both backend and frontend.
- `open-import-file-dialog` returns `selected_name` and a basename-only `selected_path` compatibility label, not the host absolute path.
- Unexpected backend exceptions return `Internal server error. See backend log for details.` by default.
- `softplus()` handles extreme negative inputs without emitting the previous logaddexp warning.

Validation run in this handoff:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend && npm install && npm run build
```

Result: backend tests and frontend production build passed locally in the artifact container.

## v1.5.9 compact Fit setup diagnostics check

Scope: reduce the crowded bottom-docked Fit setup status area after v1.5.8 without moving the dock. The default footer now shows one compact summary row and one short primary message; long gate-failure text, fit-process metrics, and warning diagnostics are available only inside the collapsed Details / diagnostics drawer.

Expected behavior:

- Fit setup remains bottom-docked in the left setup pane.
- The top of Fit setup keeps only Run fit / Stop fit / Report actions plus voltage range and advanced run options.
- The footer shows one-line status such as `Converged, gate failed · RMSE ... · ... warnings`.
- Gate failure defaults to `Gate failed: fitted values were not promoted to initials.`
- Full gate-failure explanation, quality metrics, solver process, warning list, and suggested diagnostics actions are hidden until Details / diagnostics is expanded.
- Expanding Details / diagnostics scrolls internally and does not overlay the Model Builder or force the left pane to become a warning dump.

Validation run in this handoff:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

Result: backend tests passed locally in the artifact container. Frontend build was not run because node_modules are not included in the container; validate locally with `npm install` then `npm run build`.

## v1.5.8 bottom-docked Fit setup panel check

Scope: repair the v1.5.7 layout regression where the Fit setup card occupied a full viewport-height section, created a large blank area, and pushed Model Builder below the status footer.

Expected behavior:
- The entire Fit setup card, including Run/Stop/Report, voltage range, advanced options, and fit-status footer, is reserved at the bottom of the left setup pane.
- Model Builder and Equation Preview scroll in the area above the bottom dock.
- The bottom dock is panel-local, same width as the left pane, not a full-window overlay.
- The dock does not cover or hide Model Builder content; layout space is reserved by flexbox.
- Advanced options can scroll inside the dock when expanded.

Validation run in this package:
- `PYTHONPATH=backend python -m pytest backend/tests -q`
- `python -m compileall -q backend/ivfitter backend/tests`

Frontend build was not rerun in this container because node dependencies are not installed. Run locally with:
- `cd frontend`
- `npm install`
- `npm run build`

## v1.5.7 fit setup bottom status footer check

- Moved Fit setup status badges/messages into a panel-local bottom footer with reserved space, while keeping Run fit / Stop fit / Report at the top.
- The Fit setup panel now uses a flex-column shell: top action area, scroll-contained setup body, and bottom status footer.
- Backend validation passed: `PYTHONPATH=backend python -m pytest backend/tests -q` and `python -m compileall -q backend/ivfitter backend/tests`.
- Frontend build could not be completed in this container because `node_modules` / React type packages were not installed; run `npm install` then `npm run build` in the frontend or root package before release.


## v1.4.40 no-data action hierarchy check

- With no trace loaded, Run fit and Report are disabled and rendered as neutral unavailable actions.
- The empty Plots card uses a larger primary Import data button as the intended next action.
- After a trace is imported or generated, Run fit returns to the normal primary action hierarchy.

# IV-fitter Web UI agent handoff

Current package: **v1.4.35**.

This file is the current handoff for future coding agents. It replaces old root-level `HANDOFF_*` files and version-specific handoff fragments.

## First documents to read

1. `PROJECT_RULES.md`
2. `docs/DOCUMENTATION_INDEX.md`
3. this file
4. `README.md`
5. `docs/TESTED_CURRENT.md`

## Product purpose

IV-fitter Web UI has one core job: help users import I-V data, build physically interpretable circuit models, fit traces, inspect residuals/warnings, and export defensible results. Do not add features that make this workflow slower, less reliable, or more confusing.

## Current architecture

```text
React/Vite frontend -> FastAPI API -> Python fitting core
```

- Frontend owns interaction, layout, language selection, and user-facing documentation.
- Backend owns import parsing, model validation, fitting, warnings, equation summaries, and report data.
- The model architecture is Law / Form / Placement. User-facing placement is **Main path** and **Branches**.

## Current important features

- HappyMeasure CSV v2 import compatibility for single, wide, and long exports, including current-source conversion.
- Data workspace unit selectors describe the imported column units and rescale the trace to internal SI V/A.
- The app is a general compact-circuit fitting tool. Avoid presenting the workflow as specific to one device family; domain-specific interpretations belong in the user's modeling/report narrative.
- Model Builder equivalent-circuit preview uses a compact topology diagram with main path on top and branches below Vj.
- Model Builder is compact: component nicknames are edited directly, and parameter initials/bounds/fixed state are handled in the Parameters table rather than duplicated in builder cards.
- Parameters are displayed by placement and component instance. Keep parameter keys unchanged for fitting, save/load, JSON export/import, and reports. After a completed fit, fitted values are written into the model as next-run initial values only if the fit passes reportability/quality gating; poor fits remain visible but must not silently overwrite trusted initials. The restore button should recover the pre-fit value snapshot only, not rename parameters or alter serialization. Synthetic traces can also seed initials from stored ground-truth metadata when parameter keys match.
- Model preview belongs below Model Builder and starts collapsed by default.
- User-facing text should move toward content modules and translation-ready documents; start with `docs/LOCALIZATION_AND_TEXT.md` before adding new visible UI copy.
- User manual Function Guide is user-facing by default. Internal schema terms are only allowed in collapsed Advanced details.
- Mobile portrait layout has a sticky full-width run action, compact voltage range controls, and a backend connection banner.
- Fit setup owns compact fitting status, Run fit/Stop/Report actions, no-trace validation, running feedback, and Diagnostics disclosure. Keep this area compact and layered: status badges, action row, then contextual messages.
- Fitting has visible running feedback, Stop behavior for ignoring an in-flight result, and expanded app-local zoom. While fitting, disable model/parameter/setup/import/report edits but keep Stop available.
- LAN testing helper `04c_run_lan_dev.bat` starts both backend and frontend and prints phone/tablet URLs.

## Known boundaries

- Graph DC solver remains experimental; do not present it as the default report-grade solver without additional validation.
- Two-trace `ΔI(V)` light/dark preview is not implemented.
- One-click light-response presets are not implemented.
- The lightweight math renderer is purpose-built for the app's formulas; it is not a general LaTeX engine.
- Do not introduce new frontend libraries, math-rendering packages, services, or build systems without explicit user approval.

## Documentation policy

- Use `docs/DOCUMENTATION_INDEX.md` as the map.
- Use `docs/TESTED_CURRENT.md` for current validation.
- Use `docs/VALIDATION_HISTORY.md` for historical validation summaries.
- Do not recreate root-level `HANDOFF_*.md` or many `docs/TESTED_*.md` files for routine internal versions.
- Keep README human-facing. Put agent/process details here or in `PROJECT_RULES.md`.

## Required validation before handoff

For code or UI changes, run when feasible:

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

For docs-only changes, still run the full set if dependency availability allows it; otherwise clearly state what was not run.

## Required manual test in final response

After every change, provide a 3-step browser test that does not require reading source code. The user should be able to verify the change through the UI or visible files.


## v1.4.35 validation caveat

- `npm.cmd run test:parameter-ui`, `npm.cmd run build`, backend `compileall`, and `git diff --check` passed for v1.4.35, with only normal CRLF conversion warnings from Git.
- Backend fitting math was not intentionally changed in v1.4.35. Full backend pytest was not rerun in the Codex desktop validation environment because the bundled Python did not include `pytest`; the previous full-backend pytest caveat still applies.

## v1.4.35 Fit setup and Model Builder interaction note

- Fit setup must remain visually compact. Use small status badges for Ready/Running/Converged, warning counts, and error counts. Do not reintroduce full-width amber backgrounds for successful converged states.
- Put residual caution and backend warnings inside one Diagnostics disclosure. Avoid separate persistent "Caution" and "Warnings" blocks.
- Disabled Stop and Report should look neutral. Stop should be visually dangerous only while an actual fit is running.
- `V min` / `V max` blank placeholders should show the selected trace's actual finite min/max voltage. Leaving them blank still means backend `v_min`/`v_max` are unset and the full selected trace range is used.
- Duplicate model selections should disable only Add, not the model dropdown. Users must be able to change the dropdown away from a duplicate choice.

## v1.4.33 parameter auto-seeding and localization note

- Parameter table organization is display-only. Do not rename internal parameter keys when changing grouping, filters, labels, export, report, or save/load behavior.
- Prefer `frontend/src/model/parameterGrouping.ts` for grouping, component batch behavior, whole-model seed-from-fitted logic, and restore-from-snapshot logic instead of reimplementing those rules inside React components.
- Prefer `frontend/src/content/localizedText.ts` and `frontend/src/model/i18n.ts` for visible labels/help text. Avoid scattering translation strings across component bodies.
- Keep explanatory text out of the visible Workspace surface when it can live in HelpTips, the user manual, or localization docs.


## v1.4.9 selected-column HappyMeasure fix

HappyMeasure combined wide-v2 files contain a trace-metadata table before the actual `# section,data` table. The generic single-trace importer must read the explicit data section before applying user-selected `voltage_col` / `current_col`; otherwise selected columns such as `Voltage_V` and `T001 Device_14 [Current_A]` are reported as missing. Keep the anonymized fixture in `examples/parser_fixtures/happymeasure/` for regression coverage.


## Sample data note

The Data page sample loader is intentionally tied to the full anonymized HappyMeasure combined wide-v2 CSV. Do not replace it with a cropped fixture or a synthetic in-memory trace unless the user explicitly asks. The sample is meant to exercise the same importer path users need for HappyMeasure multi-trace files.


## Plot selector note

The Plots section now owns a user-facing trace selector. Do not re-add explanatory text like "Showing selected trace only..." in the plot header; the selector itself communicates which trace is active. Keep Data and Plot trace selectors bound to the same selected-trace state.


## Main-path transport note

Main path now exposes advanced transport / voltage-drop forms in the Model Builder menu. Keep this distinction intact:

- branch functions contribute current at `V_j`;
- main-path functions consume voltage or modify effective series transport before branch currents are evaluated.

Do not reframe branch current laws as main-path terms unless they have a clear voltage-drop or transport-modifier evaluation form. Do not add device-specific aliases when the same math is already represented by an existing circuit term or custom expression.


## Stabilization note

Current stabilization guards include: APP_VERSION fallback to `dev`, abortable equation-preview requests, expanded ErrorBoundary coverage, diagnostic-only graph_dc reportability, deprecated `seed_scale_factors` warning, stricter photocurrent sign validation, and near-zero-current exclusion for log-magnitude metrics. Keep these regression tests active when changing fitting configuration, equation preview, or model validation.

## v1.4.18 stabilization refactor note

This release is a refactor-only stabilization pass. Model Builder add/duplicate rules now live in pure frontend modules under `frontend/src/model-builder/`. Fitting orchestration stays in `fitting_engine.py`, while model evaluation, residuals, metrics, multistart, warnings, and reportability decisions are split into focused backend helper modules. Do not re-inline these helpers into UI or fitting orchestration unless a testable architecture reason is documented.

## v1.4.18 semantic consistency note

Backend validation is the guardrail for imported or hand-edited model JSON. Location, placement, and evaluation form must agree: series components are only valid as series voltage drops or series conductance modifiers, while core/parallel components are only valid as current branches. Duplicate same law/form/placement/polarity components are non-reportable errors.


## v1.4.29 User manual integration note

The in-app User manual now integrates the reviewed tutorial-style manual draft. Treat `frontend/src/components/UserDocumentationPage.tsx` as the source for the UI manual content and `frontend/src/styles/user-documentation.css` as the dedicated style layer. The UI intentionally separates English and Chinese through the language selector; do not paste bilingual paragraphs into one visible panel. Keep formulas rendered through `MathFormula` and keep backend implementation details collapsed in Advanced details.


## v1.4.29 manual-reader note

The User Manual is intentionally a navigation-style reader rather than a long scroll page. Keep it one-section-at-a-time. The Function Guide should remain selector/detail, not a full list of expanded model cards. The Law/Form/Placement chapter is integrated into the manual to explain how laws become meaningful model terms.


## v1.4.29 workflow note

Default D1 is now explicit forward-polarity with primary role metadata. Ordinary duplicate Add still blocks same law/form/placement/polarity; use the D2 role-aware action for a two-diode model. The Parameters table is interactive and edits the next-fit model parameters. Diagnostics live inside Fit setup. Keep fit controls out of Data and User Manual views.


## v1.4.29 layout note

The Parameters table is intentionally responsive: desktop/wide screens should allocate more width to the editable table and avoid cramped horizontal scrolling, while small screens may keep horizontal scroll as a safety fallback.


## v1.4.29 compact-status note

The Fit setup action area should stay compact. Do not reintroduce stacked full-height status, verdict, and warning boxes. Keep detailed verdict and warning lists behind one Diagnostics disclosure.


## v1.4.29 Parameters layout note

Persistent warnings no longer occupy a result-grid side panel, so the old two-column result grid should not constrain Parameters. Keep `.main-result-grid` single-column unless another persistent side panel is reintroduced.


## v1.4.29 Model Builder note

Do not duplicate disabled-button explanations as visible inline warnings under Add rows. Keep duplicate/equivalent guidance available through the disabled button title/hover unless there is a true blocking error that needs a top-level warning.

- v1.4.29 correction: the role-aware D2 action is single-use. Do not allow repeated D3/D4 secondary diodes from the same button.


## v1.4.29 Data page note

The Data page should stay in a two-row aligned layout: Import data + Trace selection in row 1, Paste data + Spreadsheet preview in row 2. Do not repeat V/I column names in both Trace facts and Import quality; keep metadata compact.


## v1.4.29 mobile Data note

Keep the Data page mobile preview contained: Spreadsheet preview should scroll internally and not extend behind the bottom navigation. Navigation tabs intentionally have no subtitles. Sidebar note: “Fit locally. Review before reporting.”

- v1.4.29 correction: Workspace section-header subtitles are intentionally hidden; do not re-add range/objective/run-option hint text after section titles.

- v1.4.29 correction: keep hover/help wording user-facing. Avoid exposing schema/developer terms in UI titles or HelpTips; put deeper schema language only in advanced documentation.

- v1.4.29 correction: Main path / Junction branches explanatory text is HelpTip-only; do not repeat it visibly below headers.


## v1.4.29 sidebar note

Dock/sidebar default is collapsed. Language selector dropdown options are explicitly styled dark-on-light for readability in the dark sidebar.


## v1.4.29 audit/workflow note

Run timeout is now part of FitConfig and defaults to 60 s. Frontend abort is paired with backend cooperative timeout checks; do not rely on browser abort alone for long solver runs. Starting a new run must clear old result/report/warning/verdict state. Parameters table should use scientific notation for very small/large numbers.
