# Tested current — v1.5.38

Validated after User Manual update-panel cleanup, release-check status refinement, and manual equation wording polish.

Commands run in this package:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests tools/audit_release_page.py tools/update_github_release.py
cd frontend
npm run test -- --run --reporter=dot
npm install
```

Observed result:

- Backend pytest: passed, 122 tests.
- Backend compileall and release-tool compileall: passed.
- Frontend tests/build: not completed in this environment because `frontend/node_modules` was absent and `npm install` could not fetch `electron-to-chromium` from the configured package mirror. No frontend source or package dependency was intentionally changed beyond app version metadata and release-check/manual UI files.

Expected local validation before public release:

```bash
cd frontend
npm install
npm run test -- --run --reporter=dot
npm run build
```

Manual checks still required before public release:

1. Open User Manual at 100%, 125%, and 150% zoom.
2. Confirm the left sidebar is primarily section navigation and the Updates footer is compact.
3. Check update status when local version is newer than the latest public release; it should say local version is newer than public release, not simply Up to date.
4. Expand release details and confirm release notes/assets do not permanently occupy the sidebar.
5. Toggle Chinese/English and confirm update labels render.
6. Confirm valid/invalid Report tab behavior from v1.5.37 remains unchanged.
7. Confirm Fitting Parameters table containment remains unchanged from v1.5.37.
