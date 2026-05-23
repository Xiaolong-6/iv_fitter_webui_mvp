# Tested in 1.0.7

This patch was tested against the exact packaged source tree.

## Checks run

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

## Results

```text
15 passed
compileall passed
```

## Fixes verified

- `test_backend_mvp.py` now exports `sample_trace()` used by import/export, multistart, and schema tests.
- Parameter CSV assertion now matches the actual stable component ID format `D1.I0_A`.
- Multistart test now marks one parameter as fit-enabled before expecting the multistart warning.
