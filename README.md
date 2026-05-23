# IV-fitter Web UI MVP

Current version: **1.3.13**

IV-fitter Web UI is a local-first tool for importing I-V traces, building a circuit model, running fits, and checking whether the result is physically plausible before reporting it.

This repository contains:

```text
React/Vite frontend + FastAPI fitting backend + Python fitting core
```

It is a Web UI prototype for the IV-fitter workflow. It is not yet a full replacement for the legacy desktop/Tkinter workflow.

## What users do in the app

1. Open **Data** and import or paste a voltage/current trace.
2. Confirm the selected dataset name, voltage unit, and current unit.
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
- `docs/TESTED_1_3_13.md`

## Current v1.3.13 focus

- Move the equivalent circuit into Model Builder so topology is explained where users edit topology.
- Keep Model Builder compact by moving explanatory text into hover help.
- Use one top-level portal tooltip system for both new help icons and legacy title hover text.
- Keep Data import metadata editable for dataset name and voltage/current units.

## Known limitations

- Backend equation summaries are still partly string-based internally; the frontend renders model-specific formula cards from those summaries.
- Fit-quality interpretation is improving, but users should still inspect residual plots and warnings before trusting a report.
- Advanced model details still expose internal law/form/placement concepts when expanded.
