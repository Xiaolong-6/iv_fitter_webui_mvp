# Tested current — v1.5.39

Validated after changing the User Manual to a continuous scrollable reader with left quick-position navigation.

Commands run in this package:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests tools/audit_release_page.py tools/update_github_release.py
cd frontend
npm install
npm run test -- --run --reporter=dot
npm run build
```

Observed result:

- Backend pytest: passed, 122 tests.
- Backend compileall and release-tool compileall: passed.
- Frontend tests/build: not completed in this environment because `frontend/node_modules` was absent and `npm install` could not fetch `electron-to-chromium` from the configured package mirror. No fitting, backend API, reportability, or release-manager runtime logic was intentionally changed.

Expected local validation before public release:

```bash
cd frontend
npm install
npm run test -- --run --reporter=dot
npm run build
```

Manual checks still required before public release:

1. Open User Manual and confirm all sections appear in one continuous scrollable document.
2. Click left-side section items and confirm the content pane scrolls to the selected section.
3. Scroll manually and confirm the active section highlight follows the reader position.
4. Switch English/Chinese and confirm the reader resets to the first section and remains continuous.
5. Check 100%, 125%, and narrow viewport layouts.
