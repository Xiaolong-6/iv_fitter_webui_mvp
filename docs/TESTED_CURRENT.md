# Tested current — v1.5.43

Validated after Fitting responsive polish and Data import workflow cleanup.

## Scope

- Fit setup pane-width responsive behavior and compact action rows.
- Plot/parameter default split changed to plot-priority.
- Chart controls moved into compact chart-header rows, not data overlays.
- Parameter toolbar and component summaries compacted for high zoom.
- Data page input sources consolidated into Upload / Paste / Sample tabs with drag-and-drop upload and structured trace metadata.

## Commands run in this environment

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests tools/audit_release_page.py tools/update_github_release.py
npm run build
npm run test:frontend -- --reporter=dot
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/release_build.ps1 -SkipPackage
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/release_build.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build_portable_windows.ps1
```

## Observed result

- Backend pytest: passed, 122 tests.
- Python compileall: passed.
- Frontend production build: passed after production TypeScript config stopped compiling Vitest test files.
- Frontend unit tests: passed, 9 files / 33 tests.
- Release build without packaging: passed, including frontend build, frontend unit tests, backend pytest, and backend compile check.
- Standard release package: passed, created `release/iv-fitter-webui-v1.5.43.zip`.
- Windows portable package: passed, created `release/portable-dist/IV-fitter-v1.5.43-win-portable.zip`.
- Portable smoke test: passed. Launched `IV-fitter.exe` with `IVFITTER_NO_BROWSER=1` and `IVFITTER_PORT=8876`; `/api/health` returned `ok` and `/api/version` returned `1.5.43`.
- Note: `npm ci` against the lockfile still timed out when the environment rewrote lockfile package URLs to the internal package mirror. For this local validation run, frontend dependencies were restored with `npm install --package-lock=false --registry=https://registry.npmjs.org/` and the lockfile was not changed.

## Required local release checks

```bash
cd frontend
npm install
npm run test -- --reporter=dot
cd ..
npm run build
```

## Manual browser checks required

1. Fitting page at 100%, 125%, and 150–160% browser zoom.
2. App zoom 55–100%.
3. Low-height landscape.
4. Data page before and after import, including upload, paste, sample, and drag-drop.
5. Paired plot views: Linear I-V + signed residual and Log |I| + log residual.
6. Parameters table at high zoom with long component names.
7. English/Chinese language toggle.
