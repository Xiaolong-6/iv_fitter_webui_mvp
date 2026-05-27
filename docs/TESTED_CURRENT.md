# Tested current version

Version: v1.5.20

Validated in this package:

- Backend pytest suite.
- Backend compileall.
- Frontend Vitest suite.
- Frontend production build.

Key change: the Start here page is simplified into a minimal welcome hero plus a four-step workflow, sidebar tabs now use explicit icons, and the Data page gains a Plot review section that reuses the existing PlotWorkspace component. This is a UI polish release only; fitting behavior, backend APIs, reports, saved models, and equations are unchanged.

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
- Frontend unit tests pass.
- Frontend production build passes.

Validation note: `npm install` was run before frontend validation in this environment. `frontend/node_modules` and `frontend/dist` are intentionally not included in the packaged source archive.

Manual checks recommended:

1. Confirm the default page is Start here and uses the minimal hero/workflow layout without duplicated Quick actions.
2. Navigate to Data, Model, Fitting, Report, and Help; state should persist while switching pages.
3. Confirm Data renders import/preview plus Plot review, Model renders Model Builder and preview, Fitting renders Fit setup/plots/parameters, Report renders unavailable state before fitting plus export controls, and Help renders the manual.
4. Confirm Run fit, Stop fit, Report availability, compact status, and diagnostics behavior match the previous release.
