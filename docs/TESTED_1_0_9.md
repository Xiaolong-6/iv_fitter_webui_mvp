# Tested in 1.0.9

## Fix verified

The previous frontend could build but fail at runtime with:

```text
Element type is invalid ... Check the render method of PlotWorkspace
```

Root cause: `react-plotly.js` was imported as a React component, but the runtime module shape produced an object instead of a valid React component.

## Change

`PlotWorkspace` now uses a local `PlotlyChart` wrapper around `Plotly.react()` from `plotly.js-dist-min`.

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
backend tests: 15 passed
backend compileall: passed
frontend npm install: passed
frontend npm run build: passed
```

Browser runtime still needs human local verification because this environment cannot open the user's Windows browser, but the specific `react-plotly.js` invalid element path has been removed.
