# Tested current — v1.5.26

Validated after adaptive workflow layout polish, resizable Model/Report panes, Data page containment, parameter-table scroll containment, portrait-mode CSS checks, and HTML report plot export.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm run test
npm run build
```

Observed result in this package:

- Backend pytest: passed, 123 tests.
- Backend compileall: passed.
- Frontend Vitest: passed, 8 files / 27 tests.
- Frontend production build: passed.

Manual browser checks still recommended:

1. Verify Data page card heights at 100%, 125%, and 150% app zoom.
2. Drag the Model page and Report page column dividers.
3. Confirm Fitting plots stay visible while the Parameters table scrolls internally.
4. Confirm portrait/narrow layout stacks pages without horizontal overflow.
5. Download the HTML report and verify plots, metrics, parameters, and warnings render correctly.
6. Hover parameter names and confirm the tooltip explains the parameter meaning rather than internal parameter keys.
