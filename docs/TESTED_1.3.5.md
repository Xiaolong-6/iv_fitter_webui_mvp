# TESTED 1.3.5

Validation run for v1.3.5 handoff package.

## Automated checks

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend && npm install && npm run build
```

## Manual checks

1. Switch UI language to 中文 and confirm the main workflow panels are translated.
2. Confirm model preview no longer displays backend/debug equation strings as raw plain text.
3. Confirm D1 + Rs + Rsh appears as structured circuit, junction voltage, branch current, and solver cards.
4. Confirm version footer shows v1.3.5.
