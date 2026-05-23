# Tested in 1.1.0

## Checks run

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm install
npm run build
```

## Results

```text
backend tests: passed
backend compileall: passed
frontend npm install: passed
frontend npm run build: passed
```

## Manual check still needed

Open the local app on the target Windows display and verify that:

- the workspace is no longer a long single scrolling page in landscape;
- the controls, plots, and results are visible as side-by-side panels;
- Ctrl + mouse wheel changes app-local zoom;
- portrait/narrow layout stacks sections correctly.
