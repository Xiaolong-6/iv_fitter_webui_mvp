# IV-fitter Web UI MVP

Current version: **1.4.29**











> v1.4.29 audit/workflow note: Plots empty state now has an Import data shortcut; Run options include a 60 s default timeout with frontend abort and backend cooperative timeout; starting a run clears previous fit verdict/warnings; Parameters table uses scientific notation for extreme values; several backend/frontend audit issues were closed.

> v1.4.28 navigation note: the dock/sidebar now starts collapsed by default, and the language selector dropdown uses readable light-background option colors in the dark sidebar.

> v1.4.27 mobile/data note: the Data page now contains the Spreadsheet preview inside an internal scroll area on mobile so it no longer stretches behind the bottom navigation. Navigation tabs are leaner, with no per-tab subtitles, and the sidebar note is shortened to “Fit locally. Review before reporting.”

> v1.4.26 Data page note: the Data page now uses a two-row aligned layout: Import data aligns with Trace selection, and Paste data aligns with Spreadsheet preview. Trace-selection summary chips were deduplicated so V/I column names are not repeated in both facts and import-quality blocks.

> v1.4.25 Model Builder note: duplicate-add guidance is no longer repeated as a visible inline message. Disabled Add buttons still expose the reason through the button hover/title.

> v1.4.24 layout note: after moving warnings to the Workspace-top banner, the Parameters result section now spans the full right pane instead of being constrained to the old two-column result grid.

> v1.4.23 layout note: the Workspace top area is now compact. Fit status is a single-line summary with expandable details, and warnings use a one-line dismissible summary instead of stacking multiple full-height boxes.

> v1.4.22 layout note: the interactive Parameters table now auto-expands on wide screens so editable initials/bounds and interpretation columns use the available Workspace width instead of staying cramped with unnecessary horizontal scroll.

> v1.4.21 workflow note: default D1 now carries explicit forward polarity, two-diode fitting uses a role-aware D2 action instead of ordinary duplicate Add, the Parameters table can edit next-fit initial values/bounds/fixed state, and warnings are summarized at the top of Workspace with a dismiss button.

> v1.4.20 manual note: the User Manual is now a navigation-style reader. It shows one section at a time, uses a selector/detail Function Guide, and includes a Law/Form/Placement chapter explaining how model terms become physically meaningful.

> v1.4.9 importer note: HappyMeasure combined wide-v2 files now import correctly even when the UI/API passes explicit selected columns. The package includes an anonymized regression fixture under `examples/testdata/`.

IV-fitter Web UI is a local-first tool for importing I-V traces, building physically interpretable circuit models, running fits, checking residuals/warnings, and exporting defensible results.

```text
React/Vite frontend + FastAPI backend + Python fitting core
```

It is a Web UI prototype for the IV-fitter workflow. It is not yet a full replacement for the legacy desktop/Tkinter workflow.


### v1.4.19 tutorial-style User Manual

The in-app **User manual** now uses a tutorial-style structure adapted from the reviewed v1.4.18 manual draft. It explains what IV-fitter solves, how main-path and branch terms assemble into a self-consistent circuit equation, how fitting/residuals/reportability should be interpreted, and how to choose fitting recipes. English and Chinese are shown through the existing language selector rather than as a bilingual wall of text.

## What users do in the app

1. Open **Data** and import or paste a voltage/current trace.
2. Confirm the selected dataset name and display units; fitting data remains V/A internally.
3. Open **Workspace** and choose the fit range and objective settings.
4. Build the model in **Model Builder**.
5. Run the fit.
6. Inspect status, plots, residuals, parameters, warnings, and equations.
7. Export a report only after the model, units, warnings, and residuals make sense.

## Current UI areas

- **Data**: CSV/TXT/DAT import, pasted-data import, dataset naming, unit selection, trace selection, import-quality summary, and spreadsheet preview.
- **Workspace**: fit setup, Model Builder, equivalent-circuit preview, plots, parameter diagnostics, warnings, Stop action, and formula preview.
- **User manual**: user-facing workflow, Function Guide, fitting logic, convergence guidance, and reporting notes.

## Current notable capabilities

- HappyMeasure CSV v2 import compatibility for single, wide, and long files, including current-source conversion.
- Light-response model terms: constant photocurrent, voltage-dependent photocurrent, photoconductive branch, and photo-modulated main path.
- Mobile portrait layout with compact controls and sticky mobile Run fit action.
- Backend connection banner for fetch failures.
- LAN phone/tablet testing helper.
- User-facing Function Guide with internal schema details hidden in Advanced details.

## Windows quick start

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

## Test from a phone or tablet on the same Wi-Fi

For phone/tablet browser testing on your local network, use:

```powershell
.\04c_run_lan_dev.bat
```

The LAN launcher starts both required services in separate windows: backend on `0.0.0.0:8000` and frontend on `0.0.0.0:5173`. It prints a phone URL such as `http://192.168.x.x:5173`, sets the frontend API base to the detected computer IP, and checks backend health before launching the frontend.

Prerequisites:

- Run `02_setup_dev.bat` first.
- Put the computer and phone on the same Wi-Fi, or let the computer connect to the phone hotspot.
- Allow Windows Firewall access on **Private networks** if prompted.
- Use the printed LAN URL on the phone, not `localhost`.
- Keep both new PowerShell windows open while testing.

Troubleshooting `TypeError: Failed to fetch`:

1. On the computer, open `http://127.0.0.1:8000/api/health`. It should return `{"status":"ok"}`.
2. On the phone, open `http://<computer-LAN-IP>:8000/api/health`. If this fails but the computer health URL works, Windows Firewall or the Wi-Fi network is blocking the backend.
3. If the script lists multiple IPv4 addresses, the first one may be a VPN/virtual adapter. Disconnect VPN/virtual adapters or use a phone hotspot and rerun the script.

University or company Wi-Fi may block device-to-device access; a phone hotspot is usually the simplest fallback. This is a local development/testing helper only. It is not a public deployment mode.

## Developer entry points

Dependency manifests live at the repository root:

```text
requirements.txt
package.json
DEPENDENCIES.md
```

Source layout:

```text
frontend/   React UI
backend/    FastAPI API and fitting core
docs/       user, developer, agent, and validation documentation
examples/   sample import data and fit requests
```

## Validation commands

Frontend:

```bash
npm install
npm run build
```

Backend:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

## Documentation map

Use `docs/DOCUMENTATION_INDEX.md` as the documentation entry point.

Most important files:

- `PROJECT_RULES.md` — operating rules for agents/developers.
- `docs/WEBUI_AGENT_HANDOFF.md` — current handoff and known boundaries.
- `docs/TESTED_CURRENT.md` — current validation record.
- `docs/VALIDATION_HISTORY.md` — consolidated validation history.
- `docs/DATA_IMPORT_EXPORT.md` — import/export behavior and HappyMeasure compatibility.
- `docs/RESPONSIVE_WORKSPACE.md` — responsive layout, mobile behavior, and zoom.
- `docs/ROADMAP.md` — current roadmap.

Historical root-level `HANDOFF_*` files and old per-version `docs/TESTED_*` files were removed in v1.4.8. Their useful information is consolidated into the files above.

## Known limitations

- Graph DC solver remains experimental; do not use it as report-grade default without additional validation.
- Backend equation summaries are still partly string-based internally.
- Fit-quality interpretation is improving, but users should still inspect residual plots and warnings before trusting a report.
- Light/dark two-trace `ΔI(V)` preview and one-click light-response presets remain future features.


### Sample data

The Data page **Load sample data** button now loads a full anonymized HappyMeasure `combined-v2` / `wide-v2` CSV containing 14 traces. The bundled sample is stored in:

- `examples/testdata/happymeasure_combined_wide_v2_anonymized.csv`
- `frontend/public/sample_data/happymeasure_combined_wide_v2_anonymized.csv`

The sample preserves the original multi-trace row count and voltage/current data needed to test importer behavior, while removing sample identifiers, timestamps, port names, and trace fingerprints.

### Plot trace selector

The Workspace **Plots** section includes a trace selector in the plot header. This lets users switch the displayed trace directly from the plot area without returning to the Data tab. Switching traces follows the same selected-trace workflow used elsewhere: the next fit/report belongs to the newly selected trace.


### v1.4.18 main-path transport options

The Model Builder main path now includes more than an Ohmic resistance and a series diode barrier. It exposes:

- **Basic · Effective Ohmic resistance**
- **Advanced · Series diode barrier**
- **Advanced · Softplus transport modifier**
- **Advanced · Custom transport modifier**
- **Interpretive · Photo-modulated effective main path**

Main-path terms are still voltage-drop or transport-bottleneck terms. They are not copies of branch current laws. The photo-modulated effective main-path option is intentionally guarded against simultaneous use with an ordinary Ohmic series resistance in single-trace fitting, because those two are usually mathematically indistinguishable without a light/dark or optical-power workflow.
