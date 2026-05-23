# Tested v1.4.7

Scope: User-facing Function Guide rewrite plus documentation and regression checks.

## Commands run

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

## Results

- `npm install`: passed
- `npm run build`: passed
- `PYTHONPATH=backend python -m pytest backend/tests -q`: passed
- `python -m compileall -q backend/ivfitter backend/tests`: passed

## Manual browser check

1. Open **User manual → Function Guide**.
2. Confirm each function card starts with user-facing purpose/use-case/curve-effect/parameter/fitting-advice text.
3. Confirm internal terms such as law IDs, placements, adapter names, and parameter keys appear only after opening **Advanced details**.
