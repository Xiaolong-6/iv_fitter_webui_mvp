# Tested current version

Version: v1.5.15

Validated in this package:

- Backend pytest suite.
- Backend compileall.
- Frontend production build.
- Report export regression tests for parameter CSV, sectioned report CSV, and diagnostics JSON.

Key change: parameter display and report exports are now more reviewable and reproducible.


---

## v1.5.14 fit lifecycle hardening check

Validated on this package after applying the fit-run lifecycle guard.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
npm ci
npm run build
```

Expected result:

- Backend tests pass.
- Backend package and tests compile.
- Frontend production build passes.

Manual checks recommended:

1. Start a fit, click Stop fit, and confirm the footer shows `Cancelled` and no report is available for that stopped run.
2. Start a new fit immediately after stopping the previous one; the old aborted response must not overwrite the new run state.
3. Set a very short timeout, run a fit, and confirm the footer shows `Timeout` and late results are ignored.
4. Run a normal fit afterward and confirm the status footer, parameter table, plots, and Report button update only from the latest run.
