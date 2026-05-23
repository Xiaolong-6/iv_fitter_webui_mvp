# Tested in 1.1.1

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

## Manual checks still recommended

Open the app locally and verify:

- bad numerical fits show a failed/error status rather than green completed;
- chart hover shows nearest-point tooltip;
- clipped extreme points show `clipped N`;
- constant Rs / shunt / diode add rows do not show a fake forward polarity selector;
- component parameters are collapsed by default and can be opened with Edit.
