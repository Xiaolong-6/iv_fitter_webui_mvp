# Tested current — v1.5.23

Validated after workflow UI polish, Data plot review, report two-column layout, and test-covered HTML report export.

Commands to run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm run test
npm run build
```

# Tested current version

Version: v1.5.19

Validated in this package:

- Backend pytest suite.
- Backend compileall.
- Frontend Vitest suite: pending local dependency repair.
- Frontend production build: pending local dependency repair.

Key change: the UI is reorganized around workflow pages: Start here, Data, Model, Fitting, Report, and Help. Existing Data import, Model Builder, Fit setup, plots, parameters, diagnostics, exports, and manual content are moved into task-specific pages. This is an information-architecture release only; fitting behavior, backend APIs, reports, saved models, and equations are unchanged.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm run test
npm run build
```

Expected result:

- Backend tests pass.
- Backend package and tests compile.
- Frontend unit tests pass when frontend dev dependencies are installed.
- Frontend production build passes when frontend dev dependencies are installed.

Local note: the backend pytest suite passes with the repository `.venv`. The default `python` and `py -3.12` interpreters on this machine do not currently have `pytest` installed. Frontend validation remains blocked because `frontend/node_modules` is incomplete (`vitest` has no generated `.bin` entry, and type packages such as `aria-query`, `chai`, and `deep-eql` are missing). A repair attempt with `npm install` timed out against the package registry.

Manual checks recommended:

1. Confirm the default page is Start here.
2. Navigate to Data, Model, Fitting, Report, and Help; state should persist while switching pages.
3. Confirm Data renders import/preview, Model renders Model Builder and preview, Fitting renders Fit setup/plots/parameters, Report renders unavailable state before fitting plus export controls, and Help renders the manual.
4. Confirm Run fit, Stop fit, Report availability, compact status, and diagnostics behavior match the previous release.
