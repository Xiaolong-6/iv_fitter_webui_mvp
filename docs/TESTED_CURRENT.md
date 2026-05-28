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
cd frontend
npm run build
```

## Observed result

- Backend pytest: passed, 122 tests.
- Python compileall: passed.
- Frontend build/test: blocked in this container because frontend dependencies are incomplete and the current package mirror still fails to provide required packages such as electron-to-chromium. No frontend pass is claimed here.

## Required local release checks

```bash
cd frontend
npm install
npm run test -- --run --reporter=dot
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
