# Self-audit — v1.5.28 fit/report UI stabilization

## Scope

This version is a UI/report polish pass based on v1.5.27. It does not change fitting equations, optimizer behavior, backend API contracts, saved-model compatibility, or CSV/JSON report schemas.

## Changes audited

- Removed the Fitting-page Details drawer that only redirected users to Report.
- Made Advanced run options always visible below the compact fit status in the Fit setup panel.
- Kept Run fit, Stop fit, and Report on one compact action row.
- Tightened Parameters table density and kept it internally scrollable so plots are not displaced.
- Tightened Data page top row and plot review containment to avoid large blank cards.
- Reworked Report into a more scientific report page: report status, model/equation card, explicit warning list, grouped parameter table, clearer export buttons, and readable report preview.
- Added model/equation content to downloadable HTML reports.

## Known limitations

- HTML report plots are static SVG generated from fit curves; interactive browser controls are not embedded.
- Pixel-perfect layout was not verified with screenshot regression testing; manual checks are still recommended at 100%, 125%, and 150% UI scale.
- The model equation text uses the backend equation summary; future work can improve symbolic formatting further.

## Validation checklist

Run before release:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm run test -- --run
npm run build
```
