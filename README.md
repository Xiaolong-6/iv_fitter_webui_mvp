# IV-fitter Web UI MVP

Current version: **1.3.12**

**v1.3.12 focus:** fixes from the external audit: covariance/stderr correctness, solver-failure surfacing, dynamic versioning, import warnings, ErrorBoundary protection, debounced equation preview, and ModelBuilder maintainability.

Top-level rules file: `PROJECT_RULES.md`.

## What this is

A local-first Web UI prototype for IV fitting:

```text
Python fitting backend + FastAPI API + React/Vite frontend
```

The project is currently a greenfield Web UI branch/package. It is not yet a full replacement for the legacy Tkinter workflow.

## Windows quick start

Expected baseline:

- Python 3.12.x
- Node.js LTS
- Git
- PowerShell

Use the numbered scripts from the project root:

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

Setup and run are intentionally separate. `04_run_dev.bat` should launch only; it should not silently install dependencies.

## Root dependency entry points

Dependency manifests are available at the project root for overwrite-friendly handoff:

```text
requirements.txt
package.json
DEPENDENCIES.md
```

The frontend source still lives under `frontend/`, and the backend source still lives under `backend/`.

## Current user-facing UI

The left dock contains:

- **Workspace**: fit setup, model builder, plots, parameters, warnings, and model formula preview.
- **Data**: CSV/TXT/DAT import, pasted-data import, selected-trace dropdown, and spreadsheet preview.
- **User guide**: task-oriented instructions for real users.
- **Function guide**: user-facing function/law explanations with advanced details hidden.
- **Fitting logic**: transparent explanation of how the model is assembled and solved.
- **Fit & convergence**: how to read convergence, warnings, and fit quality.

The app version and language selector are displayed in the left dock footer.

## Current modeling semantics

The UI uses user-facing model buckets:

```text
Main path
Branches
```

Internally, the code still preserves legacy `core / series / parallel` fields for compatibility, but normal UI should not present those as the user's mental model.

The mathematical abstraction is:

```text
component = law + form + placement + parameters + nickname + optional polarity
```

Rs and Rsh are default nicknames for Ohmic-law instances, not separate mathematical laws.

## Data import

The Data tab supports ordinary V/I tables and HappyMeasure multi-trace CSV exports. HappyMeasure wrapper details are intentionally hidden from normal body text and shown only in help/advanced notes.

A mock HPQ4-like IV CSV remains available at:

```text
examples/HPQ4_mock_IV_trace_webui_test.csv
```

## Validation commands

Backend:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

Frontend:

```bash
npm install
npm run build
```

## Documentation map

- Top-level rules: `PROJECT_RULES.md`
- Audit readiness review: `docs/AUDIT_FIXES_1_3_12.md`
- Agent handoff: `docs/WEBUI_AGENT_HANDOFF.md`
- Human developer setup: `docs/HUMAN_DEVELOPER_SETUP.md`
- Dependency overview: `DEPENDENCIES.md`
- Data import/export notes: `docs/DATA_IMPORT_EXPORT.md`
- Function extension guide: `docs/FUNCTION_EXTENSION_GUIDE.md`
- Physics modeling policy: `docs/PHYSICS_MODELING_POLICY.md`
- User transparency policy: `docs/USER_TRANSPARENCY_UX.md`
- Tested notes: `docs/TESTED_1_3_12.md`

## Known audit-relevant limitations

- This package passed automated backend and frontend build checks, but browser interaction was not manually clicked in this environment.
- Backend equation summaries are still partly string-based internally; the frontend renders model-specific formula cards. Future work should move this toward structured backend equation objects.
- Full fit-quality verdict and parameter-identifiability explanations are still roadmap work, although numerical failure paths are now more explicitly surfaced.
- Advanced/developer details intentionally expose internal IDs when expanded.
