# TESTED 1.3.6

Validation target for v1.3.6 handoff package.

## Automated checks

Run from the project root:

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm install
npm run build
```

## Manual UI checks

1. Start the app with `04_run_dev.bat`.
2. Open the workspace in desktop landscape layout.
3. Switch to Chinese and English; confirm the right plot/results column remains scrollable.
4. Confirm the equation preview, parameter table, warnings, and report area can all be reached by scrolling the right column.
5. Confirm the left controls column still scrolls independently.
