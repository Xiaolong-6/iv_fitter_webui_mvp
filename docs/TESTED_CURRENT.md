# Tested current — v1.5.27

Validation performed for the v1.5.27 polarity/layout stabilization package.

Commands:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm run test
npm run build
```

Focus areas:
- Diode-like series barrier drop polarity is available and validated.
- Model Builder remains fixed while Model preview scrolls.
- Fitting/Report desktop-landscape layouts are contained.
- Parameter hover text explains meaning instead of internal keys.

