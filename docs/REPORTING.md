# Reporting and diagnostics

Fit reports should be reproducible and understandable without reading source code.

A defensible report/export should record:

- software version;
- selected trace name and import quality;
- exact model specification;
- exact fit configuration and fit range;
- fitted parameter values, units, bounds, and fit/fixed state;
- warnings and diagnostics;
- equation summary;
- plotted curve arrays sufficient to redraw the fit.

## Reporting rule

Do not treat a pretty curve as sufficient. Reports should help the user judge whether the model is physically plausible and whether warnings invalidate the result.

## Future reporting work

- Richer fit-quality verdicts with explicit next steps.
- Branch-contribution plots.
- Fit comparison reports.
- Browser-side figure export.
