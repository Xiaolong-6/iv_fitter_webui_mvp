# Tested current version

Version: v1.5.19

Validated in this package:

- Backend pytest suite.
- Backend compileall.
- Frontend Vitest suite: pending local dependency repair.
- Frontend production build: pending local dependency repair.

Key change: Fit setup moved from the left Model Builder pane into a full-width bottom dock. Advanced run options and Status Details now share an upward, mutually exclusive drawer from that dock. This is a rendering/layout release only; fitting behavior, backend APIs, reports, saved models, and equations are unchanged.

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

1. Open Workspace and confirm Fit setup appears in the full-width bottom dock, not in the left Model Builder pane.
2. Confirm Model Builder and Model Preview scroll using the recovered left-pane height.
3. Toggle Advanced and Details; each should open upward in the same drawer area, close the other mode, and close when clicked again.
4. Confirm Run fit, Stop fit, Report availability, compact status, and diagnostics behavior match the previous release.
