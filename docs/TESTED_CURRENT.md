# Tested current — v1.7.7

Validated after webpage-flow cleanup and Report plot/metric polish.

## Scope

- Removed the top global workflow context/status bar.
- Import/Data page now collapses the Import data card into a compact loaded summary after import or parse; the Hide / Change data state is removed.
- Model Builder now shows Main path and Junction branches as parallel columns on wide screens, with responsive stacking on smaller windows.
- Model preview includes a Go to Fitting button above the preview.
- Report plots are height-bounded to prevent the post-fit infinite-height rendering bug.
- Fit process and quality metrics now use human-readable names and formatted values in both the in-app Report page and exported HTML.
- Fitting physics, backend APIs, saved-model compatibility, and numerical result data are unchanged.

## Commands run in this environment

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Observed result

- Backend pytest: passed.
- Backend compileall: passed.

## Not verified in this environment

- Frontend Vitest/build, because frontend dependencies are not installed in this sandbox.
- Manual browser checks.
- Full release packaging and portable smoke test.

## Manual browser checks required

1. No top Trace/Model/Fit/Report/Next context bar should appear on Data, Model, Fitting, or Report pages.
2. Import page should show only Import data before loading data; after import/parse it should show a compact loaded summary followed by Trace selection, Plot review, and Spreadsheet preview.
3. Model Builder should show Main path and Junction branches side by side on a wide screen and stacked on narrow screens.
4. Model preview should show a Go to Fitting button above the preview.
5. Report plots should remain compact after a fit and must not grow indefinitely.
6. Fit process and quality metrics should use human-readable metric names and formatted values.
