# Tested current version

Version: v1.5.18

Validated in this package:

- Backend pytest suite.
- Backend compileall.
- Frontend Vitest suite: pending local dependency repair.
- Frontend production build: pending local dependency repair.

Key change: user-facing component labels now describe mathematical form and circuit placement more neutrally. The advanced voltage-dependent current component is exposed as **Bias-dependent current branch** with canonical `bias_dependent_current` ids. Legacy `photocurrent_voltage_dependent` saved models remain supported as aliases.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm run test
npm run build
```

Expected result:

- Backend tests pass.
- Backend package and tests compile.
- Frontend unit tests pass when frontend dev dependencies are installed.
- Frontend production build passes when frontend dev dependencies are installed.

Manual checks recommended:

1. Open Model Builder and confirm the renamed advanced options, including **Bias-dependent current branch**, **Reverse leakage / soft-breakdown current**, and **Bias-dependent series conductance modifier**.
2. Load or construct a legacy `photocurrent_voltage_dependent` model and confirm it still validates/fits.
3. Check the User manual Function Guide and equation preview for neutral bias-dependent current wording.
