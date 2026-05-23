# IV-fitter Web UI MVP

**v1.3.9 focus:** unified Ohmic-law nicknames, root dependency manifests, compact Model Builder summary, and user/developer information separation.

Top-level rules file: `PROJECT_RULES.md`.


Current version: 1.3.9

## Windows quick start

Expected baseline:

- Python 3.12.x
- Node.js LTS
- Git
- PowerShell

Check your environment:

```powershell
.\scripts\check_python.ps1
node --version
npm --version
git --version
```

First-time setup:

```powershell
.\scripts\setup_dev.ps1
```

Run tests:

```powershell
.\scripts\test_backend.ps1
```

Run backend:

```powershell
.\scripts\run_backend.ps1
```

Run frontend in another terminal:

```powershell
.\scripts\run_frontend.ps1
```

A mock HPQ4-like IV test CSV is included at:

```text
examples/HPQ4_mock_IV_trace_webui_test.csv
```


## Current user-facing UI

The left panel contains main tabs:

- **Workspace**: data import, model builder, fit setup, plots, parameters, warnings, and report export.
- **User guide**: step-by-step fitting workflow for real users.
- **Function guide**: registry-driven explanation of available model functions.
- **Fitting logic**: transparent explanation of data flow, optimization, warnings, and numerical quality gates.

The app version is displayed at the lower-left of the sidebar.

## Documentation map

- Human developer setup: `docs/HUMAN_DEVELOPER_SETUP.md`
- Development rules: `docs/DEVELOPMENT_RULES.md`
- Agent developer rules: `docs/AGENT_DEVELOPER_RULES.md`
- Documentation audience policy: `docs/USER_DOCUMENTATION_POLICY.md`

---

# IV-fitter Web UI MVP

**v1.3.8 focus:** HappyMeasure multi-trace import, safe plot rendering, selected-model equation transparency, and numeric input editing without NaN commits. 1.0.0

Local-first greenfield Web UI prototype for photodiode I-V fitting.

## Architecture

- Backend: Python, FastAPI, Pydantic, NumPy/SciPy.
- Frontend: React, TypeScript, Vite, compact SVG charts.
- Model state: `ModelSpec` / `ComponentSpec`.
- Model construction: topology + function + polarity.

## Backend

```bash
cd backend
python -m venv .venv
pip install -e .[dev]
python -m pytest -q
uvicorn ivfitter.api.main:app --reload
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Version-control note

This is a complete source snapshot for version 1.0.0. Commit it as a single milestone on your local branch if you want a clean history.






## Current milestone

Focus: 1.0 candidate snapshot with stable schemas, release checklist, sample data, and reproducibility guarantees.

## Numbered one-click Windows workflow

Use these files from the project root. They are numbered in the recommended order so you do not need to remember commands. The root directory intentionally keeps only the numbered human-facing .bat scripts.

```text
00_validate_scripts.bat       Check helper-script syntax only; safe first check.
01_check_environment.bat      Check Python 3.12, pip, and basic environment.
01a_install_node_lts.bat    Optional: install/check Node.js LTS if npm is missing.
02_setup_dev.bat              Create/reuse root .venv and install dependencies.
03_test_backend.bat           Run backend tests.
04_run_dev.bat                Start backend and frontend in separate windows.
```

Optional separate launchers:

```text
04a_run_backend_only.bat
04b_run_frontend_only.bat
```


What these scripts do:

- They avoid manual PowerShell setup and avoid manual `venv` activation.
- They use process-local PowerShell execution-policy bypass only for the launched script.
- They do not permanently change your system execution policy.
- They are safe to rerun; setup reuses `.venv` if it already exists.
## Script validation

If setup scripts were changed, double-click:

```text
validate_scripts.bat
```

This checks PowerShell script syntax without installing dependencies.

## Blank page troubleshooting

If `04_run_dev.bat` starts both windows but the browser page is blank:

1. Close the frontend window.
2. Double-click `04b_run_frontend_only.bat`.
3. If it still shows a blank page, run:

```text
03_test_backend.bat
```

and send the frontend/backend terminal output to the developer/assistant.

This package is validated with `npm run build`; a blank page usually means a browser console/runtime error or stale local frontend cache.

## npm install/network troubleshooting

If frontend startup says `vite is not recognized`, frontend dependencies were not installed. Run:

```text
02_setup_dev.bat
```

The project now keeps setup and run separate. Run scripts do not silently install dependencies.

## Responsive workspace

The app is designed as a one-screen workspace on common landscape displays:

```text
sidebar | controls | plots | results
```

Use the toolbar zoom controls or `Ctrl + mouse wheel` to change app-local density. On portrait/narrow screens, the app stacks sections vertically.


## Function/placement separation

As of v1.3.8, the Web UI treats a function as an equation law and placement/topology as a separate model-instance property. User-facing documentation tabs must remain consistent with the backend registry and solver behavior.
