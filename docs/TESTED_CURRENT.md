# Tested current — v1.5.37

Validated after Report invalid-fit UX polish, User Manual cleanup, Parameters containment regression fix, and Release Manager infrastructure.

Commands to run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests tools/audit_release_page.py tools/update_github_release.py
cd frontend
npm run test -- --run --reporter=dot
npm run build
```

Expected result:

- Backend tests pass.
- Backend package, tests, and release tools compile.
- Frontend unit tests pass.
- Frontend production build passes.

Manual checks still required before public release:

1. Valid fit report.
2. Invalid numerical-explosion diagnostic report.
3. Warning-only fit report.
4. Chinese/English language toggle.
5. Manual page independent scrolling and Updates panel.
6. Fitting Parameters table at 100%, 125%, and 150% app zoom.
7. Narrow/mobile viewport.
