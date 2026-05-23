# IV-fitter Web UI MVP

Current version: **1.4.2**

IV-fitter Web UI is a local-first tool for importing I-V traces, building a circuit model, running fits, and checking whether the result is physically plausible before reporting it.

This repository contains:

```text
React/Vite frontend + FastAPI fitting backend + Python fitting core
```

It is a Web UI prototype for the IV-fitter workflow. It is not yet a full replacement for the legacy desktop/Tkinter workflow.

## What users do in the app

1. Open **Data** and import or paste a voltage/current trace.
2. Confirm the selected dataset name and display units; fitting data remains in V/A internally.
3. Open **Workspace** and choose the fit range and objective settings.
4. Build the model in **Model Builder**. The equivalent circuit lives there because it describes what the current model actually means.
5. Run the fit.
6. Inspect the status banner, log I-V plot, residual plots, parameter table, and warnings.
7. Export a report only after the model, units, warnings, and residuals make sense.

## Current UI areas

- **Data**: CSV/TXT/DAT import, pasted-data import, dataset naming, unit selection, trace selection, and spreadsheet preview.
- **Workspace**: fit setup, model builder with equivalent circuit, plots, parameter diagnostics, warnings, and formula preview.
- **User manual**: complete user-facing workflow, function guide, fitting logic, convergence guidance, and reporting notes.

The app version and language control are shown in the left dock footer.


## Light-response modeling

v1.4.0 supports manually adding light-response components from Model Builder:

- **Constant photocurrent source** (`Iph`): a bias-independent current branch for simple photodiode-like light current.
- **Voltage-dependent photocurrent** (`Iph(V)`): a branch for collection efficiency, field-assisted gain, or trap-assisted gain that changes with junction voltage. The advanced threshold parameters are fixed by default to reduce overfitting.
- **Photoconductive branch** (`Gph`): a light-induced conductive path proportional to junction voltage.
- **Photo-modulated main path** (`Rphoto`): a main-path voltage-drop term for light-modulated transport, contact, or channel resistance.

Dark/light workflow:

1. Fit the dark trace using the simplest defensible dark model.
2. Use those dark parameters as seeds, or fix the dark-like parameters if the light fit is under-constrained.
3. Add one light-response component and fit the selected light trace.
4. Inspect residuals and warnings before adding more voltage-dependent parameters.

Future features intentionally not included in v1.4.0: one-click light-response presets and direct two-trace ΔI(V) preview.

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

### Test from a phone or tablet on the same Wi-Fi

For phone/tablet browser testing on your local network, use:

```powershell
.\04c_run_lan_dev.bat
```

The LAN launcher starts **both** required services in separate windows: backend on `0.0.0.0:8000` and frontend on `0.0.0.0:5173`. It prints a phone URL such as `http://192.168.x.x:5173`, sets the frontend API base to the detected computer IP, and checks backend health before launching the frontend.

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

Setup and launch are intentionally separate. `04_run_dev.bat` should only start the app; it should not silently install dependencies.

## Developer entry points

Dependency manifests live at the repository root for handoff clarity:

```text
requirements.txt
package.json
DEPENDENCIES.md
```

Source layout:

```text
frontend/   React UI
backend/    FastAPI API and fitting core
docs/       user, developer, policy, audit, and tested notes
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

For users:

- In-app **User manual**
- `docs/DATA_IMPORT_EXPORT.md`
- `docs/REPORTING.md`
- `docs/USER_TRANSPARENCY_UX.md`

For developers:

- `docs/HUMAN_DEVELOPER_SETUP.md`
- `DEPENDENCIES.md`
- `docs/FUNCTION_EXTENSION_GUIDE.md`
- `docs/SCHEMA_STABILITY.md`

For agents and handoff:

- `PROJECT_RULES.md`
- `docs/WEBUI_AGENT_HANDOFF.md`
- `docs/DEVELOPMENT_RULES.md`
- `docs/AGENT_DEVELOPER_RULES.md`

For audit/history:

- `CHANGELOG.md`
- `docs/AUDIT_FIXES_1_3_12.md`
- `docs/AUDIT_READINESS_REVIEW_1_3_11.md`
- `docs/TESTED_1_3_16.md`

## Current v1.4.0 focus

- Adds light-response modeling as first-class Law / Form / Placement components, not as a hard-coded `-Iph` special case.
- New addable backend laws: constant photocurrent, voltage-dependent photocurrent, photoconductive branch, and photo-modulated main path.
- Keeps the default model simple: D1 + Ohmic main-path Rs + Ohmic branch Rsh. Photocurrent terms are manually added when fitting light traces.
- Recommended workflow: fit the dark trace first, seed or fix dark-like parameters, then add the smallest necessary photocurrent term for the selected light trace.
- Presets and two-trace ΔI(V) preview are intentionally left as future features so the selected-trace-first workflow remains stable.

## Known limitations

- Backend equation summaries are still partly string-based internally; the frontend renders model-specific formula cards from those summaries.
- Fit-quality interpretation is improving, but users should still inspect residual plots and warnings before trusting a report.
- Advanced model details still expose internal law/form/placement concepts when expanded.


### v1.4.3 HappyMeasure import note

IV-fitter imports HappyMeasure CSV v2 single, wide, and long exports. Voltage-source files map `Voltage_V` to voltage and `Current_A` to current. Current-source files are converted so measured `Voltage_V` becomes the IV-fitter voltage array and sourced `Current_A` becomes the current array.



### v1.4.7 Function Guide note

The User manual Function Guide is now written for real users rather than developers. Each model term explains what physical behavior it represents, when to use it, when to avoid it, how it changes the I-V curve, what the main parameters mean, and how to fit it safely. Internal schema details such as law identifiers, supported forms, placements, and parameter keys are kept in collapsed Advanced details.

### v1.4.5 run-state note

The workspace now gives visible feedback while a fit is running, exposes a Stop action to ignore an in-flight result, and permits higher app zoom levels for high-resolution displays.
