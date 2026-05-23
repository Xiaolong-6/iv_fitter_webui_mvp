# Human developer setup

This document is for a human developer working locally on Windows.

## Expected environment

Use Python 3.12.x and Node.js LTS.

Check your environment:

```powershell
py -0p
py -3.12 --version
py -3.12 -m pip --version
node --version
npm --version
git --version
```

Or run:

```powershell
.\scripts\check_python.ps1
```

## First-time setup

From the repository root:

```powershell
.\scripts\setup_dev.ps1
```

This creates a root `.venv`, installs backend dependencies, and installs frontend dependencies if `npm` is available.

You do not need to manually activate the virtual environment.

## Backend tests

```powershell
.\scripts\test_backend.ps1
```

Full backend smoke check:

```powershell
.\scripts\smoke_backend.ps1
```

## Run backend

```powershell
.\scripts\run_backend.ps1
```

Then open:

```text
http://127.0.0.1:8000/api/health
http://127.0.0.1:8000/api/version
http://127.0.0.1:8000/api/component-registry
```

## Run frontend

In another terminal:

```powershell
.\scripts\run_frontend.ps1
```

## Run both

```powershell
.\scripts\run_dev.ps1
```

## Why the venv is at the repository root

This is a full-stack repository with `backend/` and `frontend/`. A root `.venv` avoids repeated virtual environments in subfolders and avoids PowerShell activation-policy problems by letting scripts call `.venv/Scripts/python.exe` directly.

## What the setup scripts do

- `setup_dev.ps1` creates or reuses the root `.venv`, installs backend dependencies, and installs frontend dependencies if Node/npm is available.
- `check_python.ps1` only inspects your Python installation; it does not modify the project.
- `test_backend.ps1` runs backend tests using the root `.venv`.
- `run_backend.ps1` starts the local FastAPI backend.
- `run_frontend.ps1` starts the local Vite/React frontend.
- `run_dev.ps1` opens backend and frontend terminals together.

These scripts are meant to prevent repeated manual virtual-environment setup.

## Numbered one-click Windows workflow

Use these root-level files in order:

```text
00_validate_scripts.bat
01_check_environment.bat
02_setup_dev.bat
03_test_backend.bat
04_run_dev.bat
```

Use the optional split launchers only when you want backend/frontend in separate manual control:

```text
04a_run_backend_only.bat
04b_run_frontend_only.bat
```

The numbers are intentional. They show the normal startup and verification order for human developers.

The unnumbered `.bat` files remain as compatibility aliases.

## If npm is missing

Backend setup and backend tests can run without Node.js. The frontend needs Node.js LTS.

If `02_setup_dev.bat` reports:

```text
npm was not found
```

double-click:

```text
01a_install_node_lts.bat
```

This optional script checks for npm and can install Node.js LTS through `winget` after asking for confirmation. After Node.js is installed, rerun:

```text
02_setup_dev.bat
```
