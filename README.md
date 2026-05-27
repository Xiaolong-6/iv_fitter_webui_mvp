# IV-fitter Web UI MVP

Current version: **1.5.19**

IV-fitter Web UI is a local-first browser app for fitting I-V traces with compact circuit models. It helps a user import voltage/current data, build a model from mathematical circuit terms, run a fit, inspect diagnostics, and export a result only after the residuals, warnings, parameters, and model structure make sense.

```text
React/Vite frontend + FastAPI backend + Python fitting core
```

The app is a working prototype for the IV-fitter workflow. It is not yet a full replacement for the mature desktop/Tkinter workflow, and fit results should still be reviewed before reporting.

## What Users Do

1. Open **Data** and import or paste a voltage/current trace.
2. Confirm the selected trace and imported column units. The app converts imported values to SI V/A for preview, plots, and fitting.
3. Open **Workspace** and set the voltage range and fitting objective in the bottom Fit setup dock.
4. Build the model in **Model Builder**.
5. Click **Run fit**.
6. Inspect plots, residuals, diagnostics, parameters, and equations.
7. Export a report only after the model, warnings, selected trace, voltage range, and residuals are defensible.

## Current UI Areas

- **Data:** CSV/TXT/DAT import, publication/demo multi-trace auto-detection, pasted-data import, synthetic trace generation, dataset naming, unit selection, trace selection, import-quality summary, and spreadsheet preview.
- **Workspace:** Model Builder, Model preview, plots, grouped Parameters table, diagnostics, report generation, and a full-width bottom Fit setup dock.
- **User manual:** tutorial-style workflow guide, Function Guide, fitting logic, convergence guidance, reporting notes, and glossary.

## Current Workflow Details

- **Fit setup** lives in a full-width bottom dock so Model Builder keeps its vertical space. It keeps status, actions, and messages in compact layers:
  - status badges such as Ready, Running, Converged, warnings, and errors;
  - action buttons with **Run fit** as the main idle action and **Stop** as the high-priority action only while fitting;
  - contextual info/diagnostics below the buttons.
- Empty data is shown as an informational state until the user tries to run a fit with no trace loaded.
- If `V min` or `V max` is blank, the backend uses the full selected trace range. The empty input placeholder shows the concrete selected-trace min/max voltage instead of a vague `auto`.
- Completed fits automatically write fitted values back into the model as the next initial values. Use **Restore initial values** in Parameters to recover the pre-fit values from the most recent run.
- Diagnostics are compact by default. Residual cautions and warning details open upward from the bottom dock instead of occupying persistent Model Builder space.
- During a running fit, model edits, parameter edits, fit setup inputs, data import actions, and report generation are disabled. **Stop** remains available.

## Model Builder

The user-facing model is organized as:

- **Main path:** terms that consume voltage or modify the main current path before junction branches see the remaining voltage.
- **Junction branches:** current-producing terms evaluated at the internal junction voltage and summed into terminal current.

Model Builder rows are intentionally compact: each component shows an editable nickname, the component name, per-component polarity when relevant, and a Remove button. Detailed law/form/placement information is available through hover text and in the User manual rather than repeated inline.

The app treats components as mathematical circuit terms. It should not require a user to frame the problem as a specific device family. Domain-specific interpretations belong in the user's modeling judgment, diagnostics, and report narrative.

## Parameters

The Parameters table is grouped first by placement, then by component instance. It keeps internal parameter keys unchanged for fitting, save/load, exported JSON, and reports. Component-level controls can fit or fix all parameters in that component without changing serialization.

## Current Notable Capabilities

- Plain CSV/TXT import compatibility for single traces, wide publication/demo files with one voltage column and multiple current/current-density traces, and long trace-grouped files.
- HappyMeasure CSV v2 import compatibility for single, wide, and long files, including current-source conversion.
- Synthetic IV trace generation from the current Model Builder model, with voltage sweep controls, optional noise, seed, current compliance, and ground-truth metadata.
- Grouped parameter editing with next-fit initials, bounds, fit/fixed state, fitted values, uncertainty, and interpretation hints.
- Main-path terms such as Ohmic resistance, diode-like series barrier drop, bias-dependent series conductance modifier, custom transport modifier, and softplus voltage drop.
- Branch terms such as Shockley diode, Ohmic leakage/shunt behavior, soft-threshold power-law current branch, reverse leakage / soft-breakdown current, and custom expressions.
- Model preview with beginner-friendly equation steps and softplus definition.
- Mobile portrait layout with compact controls and sticky mobile Run fit action.
- LAN phone/tablet testing helper for local network testing.
- User-facing Function Guide with internal schema details hidden in Advanced details.

## Windows Quick Start

Expected baseline:

- Python 3.12.x
- Node.js LTS
- Git
- PowerShell

Run these from the project root:

```powershell
.\00_validate_scripts.bat
.\01_check_environment.bat
.\02_setup_dev.bat
.\03_test_backend.bat
.\04_run_dev.bat
```

Optional split launch:

```powershell
.\04a_run_backend_only.bat
.\04b_run_frontend_only.bat
```

## Test From a Phone or Tablet

For phone/tablet browser testing on the same local network, use:

```powershell
.\04c_run_lan_dev.bat
```

The LAN launcher starts backend and frontend in separate windows, prints a phone URL such as `http://192.168.x.x:5173`, sets the frontend API base to the detected computer IP, enables a per-session API token, and checks backend health before launching the frontend.

Prerequisites:

- Run `02_setup_dev.bat` first.
- Put the computer and phone on the same Wi-Fi, or connect the computer to the phone hotspot.
- Allow Windows Firewall access on **Private networks** if prompted.
- Use the printed LAN URL on the phone, not `localhost`.
- Keep both new PowerShell windows open while testing.
- The launcher automatically generates `IVFITTER_API_TOKEN` and passes the same value to the frontend as `VITE_IVFITTER_API_TOKEN`; do not mix a frontend window from an old launcher session with a backend window from a new session.

Troubleshooting `TypeError: Failed to fetch`:

1. On the computer, open `http://127.0.0.1:8000/api/health`. It should return `{"status":"ok"}`.
2. On the phone, open `http://<computer-LAN-IP>:8000/api/health`. If this fails but the computer health URL works, Windows Firewall or the Wi-Fi network is blocking the backend.
3. If the script lists multiple IPv4 addresses, the first one may be a VPN/virtual adapter. Disconnect VPN/virtual adapters or use a phone hotspot and rerun the script.

University or company Wi-Fi may block device-to-device access; a phone hotspot is usually the simplest fallback. This is a local development/testing helper only. It is not a public deployment mode. If manually exposing the backend beyond localhost, set `IVFITTER_API_TOKEN` and keep `IVFITTER_CORS_ORIGINS` limited to the intended frontend origins.

## Validation Commands

Frontend:

```bash
cd frontend
npm install
npm run test
npm run build
```

See `docs/FRONTEND_TESTING.md` for the Vitest test policy and coverage focus.

Backend:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

## Source Layout

```text
frontend/   React UI
backend/    FastAPI API and fitting core
docs/       user, developer, agent, and validation documentation
examples/   sample import data and fit requests
```

Dependency manifests live at the repository root:

```text
requirements.txt
package.json
DEPENDENCIES.md
```

## Documentation Map

Use `docs/DOCUMENTATION_INDEX.md` as the documentation entry point.

Most important files:

- `PROJECT_RULES.md` — operating rules for agents/developers.
- `docs/WEBUI_AGENT_HANDOFF.md` — current handoff and known boundaries.
- `docs/TESTED_CURRENT.md` — current validation record.
- `docs/VALIDATION_HISTORY.md` — consolidated validation history.
- `docs/DATA_IMPORT_EXPORT.md` — import/export behavior and HappyMeasure compatibility.
- `docs/RESPONSIVE_WORKSPACE.md` — responsive layout, mobile behavior, and zoom.
- `docs/ROADMAP.md` — current roadmap.

## Known Limitations

- Graph DC solver remains experimental and diagnostic-only unless explicitly validated for a reporting workflow.
- Backend equation summaries are still partly string-based internally.
- Fit-quality interpretation is improving, but users should still inspect residual plots and diagnostics before trusting a report.
- Light/dark two-trace `Delta I(V)` preview and one-click light-response presets remain future features.

## Sample Data

The Data page **Load sample data** button loads an anonymized HappyMeasure combined/wide CSV containing 14 traces. The bundled sample is stored in:

- `examples/parser_fixtures/happymeasure/happymeasure_combined_wide_v2_anonymized.csv`
- `frontend/public/sample_data/happymeasure_combined_wide_v2_anonymized.csv`

The sample preserves the multi-trace row count and voltage/current data needed to test importer behavior, while removing sample identifiers, timestamps, port names, and trace fingerprints.

User-facing demo IV traces live under `examples/demo_data/iv_traces/`. In the local app, Import CSV/TXT opens that folder by default when the runtime supports local OS file dialogs; users can still browse anywhere.


### v1.5.19 full-width bottom Fit setup dock

- Moved Fit setup out of the left Model Builder pane and into an app-level bottom dock spanning the workspace.
- Restored vertical scrolling space for Model Builder and Model preview.
- Added a shared upward drawer for Advanced run options and Status Details.
- Kept fit lifecycle, report export, backend API, saved models, and numerical behavior unchanged.

### v1.5.18 semantic component label cleanup

- Renamed advanced component labels to emphasize mathematical form and circuit placement rather than a single physical interpretation.
- Renamed the advanced voltage-dependent current law to **Bias-dependent current branch** in the Model Builder, equation preview, parameter display, and user manual.
- Clarified **Reverse leakage / soft-breakdown current**, **Soft-threshold power-law current branch**, **Bias-dependent series conductance modifier**, and **Diode-like series barrier drop** wording.
- Added canonical `bias_dependent_current` registry/law id while keeping legacy `photocurrent_voltage_dependent` saved models loadable and fit-compatible.
- Kept serialized parameter keys unchanged for old JSON/report compatibility, but changed display descriptions to neutral current-scale/bias wording.

### v1.5.17 internal stability refactor

- Extracted fit lifecycle state helpers into `frontend/src/model/fitLifecycle.ts` so run-id, stale-result, cancelled, timeout, and report-availability rules can be tested outside the page component.
- Extracted report filename/artifact helpers into `frontend/src/model/reportArtifacts.ts`.
- Added frontend regression tests for stale-result rejection, cancelled/timeout state derivation, report availability, and report filename normalization.
- Preserved existing UI behavior; this release is an internal stability refactor, not a feature expansion.

### v1.5.16 frontend test foundation

The frontend now has a formal Vitest suite for fast model/UI-logic regression checks. Initial coverage includes parameter formatting, parameter status classification, fit diagnostics helpers, bounds suggestion application, Model Builder rules, and representative i18n keys. Run it with `cd frontend && npm run test`.

### v1.5.15 reporting polish

Fit results now use more consistent parameter formatting in the Parameters table and provide three export paths after generating a report: a sectioned report CSV, a parameter-only CSV, and a structured diagnostics JSON document. The CSV is intended for spreadsheet review; the JSON is intended for reproducibility, batch comparison, and downstream analysis.
