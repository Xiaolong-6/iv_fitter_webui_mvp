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
