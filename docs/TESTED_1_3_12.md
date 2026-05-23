# Tested v1.3.12

Validation performed for the v1.3.12 audit-fix handoff package.

## Commands run

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
PYTHONPATH=backend python -m compileall -q backend/ivfitter backend/tests
npm install
npm run build
```

## Results

- Backend tests: 32 passed.
- Python compileall: passed.
- Frontend TypeScript/Vite build: passed.

## Added regression coverage

- stderr residual-variance scaling;
- unbracketed legacy junction solver failure;
- graph solver KCL failure;
- graph solver failure propagation into FitWarning;
- nonpositive temperature validation;
- ambiguous import column fallback warnings;
- dynamic API version endpoint;
- unsafe custom-expression rejection.

## Manual validation still required

Open the app in a browser and verify: Data tab import/paste, selected-trace plotting, Model Builder polarity/nickname editing, equation cards, plot ErrorBoundary fallback behavior, Chinese/English UI switch, and report export.
