# Agent handoff: Web UI MVP 1.0.0

## Current state

This branch contains a greenfield FastAPI + React implementation independent of the Tkinter app. It is a local-first prototype, not a replacement release.

## What works

- Headless backend schemas: `ModelSpec`, `ComponentSpec`, `FitRequest`, `FitResult`.
- Registry-driven function library.
- Topology/function/polarity Model Builder in React.
- Browser-side CSV import.
- Plotly diagnostic plots.
- Backend fitting with implicit junction-voltage solve.
- Branch-contribution arrays.
- Compliance-like exclusion mask.
- Markdown report export.

## Run backend tests

```bash
cd backend
python -m pytest -q
```

## Run backend server

```bash
cd backend
pip install -e .[dev]
uvicorn ivfitter.api.main:app --reload
```

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

## Important design rule

Do not add UI-only model flags. Add functions to the backend registry and let the frontend render from the registry.

## v1.3.11 audit-readiness handoff note

Current package focus: audit-readiness cleanup after v1.3.10.

Important current facts:

- User-facing model buckets are Main path and Branches.
- Rs and Rsh are default nicknames for Ohmic-law instances, not separate mathematical laws.
- Data import belongs in the Data tab, with file import, paste import, selected-trace dropdown, and spreadsheet preview.
- Normal UI should not expose developer wrapper names or internal placement keys unless advanced/details are opened.
- PROJECT_RULES.md was consolidated in v1.3.11; future agents should update durable rules, not append repeated version-specific incident blocks.
- Known next work: Fit Quality Verdict, parameter interpretability labels, structured backend equation schema, and manual UI/browser audit.

## v1.3.12 audit-fix handoff note

Current package focus: fixing the external v1.3.11 audit findings before handoff.

Important current facts:

- Backend tests now include audit-regression tests and should report 32 passed.
- Standard errors include residual variance scaling.
- Legacy implicit solve and graph KCL failures are no longer silently converted into plausible-looking curves.
- API version comes from `ivfitter.__version__`; frontend `APP_VERSION` is injected from root `package.json` through Vite.
- Import column fallbacks now warn when column names are ambiguous.
- Plot and parameter panels have ErrorBoundary protection.
- Equation previews are debounced while editing model parameters.
- ModelBuilder has been expanded into readable helper subcomponents for safer future agent edits.

Known next work remains: full Fit Quality Verdict, parameter identifiability/status labels, structured backend equation schema, and manual UI/browser audit on Windows.
