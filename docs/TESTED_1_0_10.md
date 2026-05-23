# Tested in 1.0.10

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

## Fixes verified

- Frontend no longer depends on Plotly packages.
- Frontend build passes with compact React/Vite dependencies.
- Run script no longer hides `npm install`; setup and run are separated.

## Additional fix

Removed stale `ignoreDeprecations` from `tsconfig.json`; it was invalid with the installed TypeScript version and no longer needed after switching to `moduleResolution: "Bundler"`.
