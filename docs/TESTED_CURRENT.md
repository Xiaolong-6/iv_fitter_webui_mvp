# Tested current — v1.5.42

Validated after the compact chart-control hotfix. This release scopes main chart SVG sizing to the direct chart SVG and prevents nested toolbar icons from becoming plot-sized.

Commands run:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests tools/audit_release_page.py tools/update_github_release.py
```

Observed result:

- Backend pytest: passed, 122 tests.
- Python compileall: passed.
- Frontend Vitest/build: not completed in this environment because `npm install` is blocked by the package mirror returning 404 for `electron-to-chromium-1.5.371.tgz`.

Local release validation still required:

```bash
cd frontend
npm install
npm run test -- --run --reporter=dot
npm run build
```

Manual browser checks recommended: Data plot preview, Fitting Linear I-V + signed residual view, Fitting All diagnostic plots, plot/parameter resize handle, chart icon controls at 100%/125%/150% zoom, Manual compact section tabs, English/Chinese switching.


## v1.5.42 fitting plot layout hotfix

Validated backend tests and Python compileall after removing duplicate Fitting panel headings and tightening paired plot layout. Frontend dependency installation remains environment-dependent if the npm mirror cannot provide electron-to-chromium.

Commands run in this environment:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests tools/audit_release_page.py tools/update_github_release.py
```

Expected local release validation before tagging:

```bash
cd frontend
npm install
npm run test -- --run --reporter=dot
npm run build
```
