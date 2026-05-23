# Audit fixes — v1.3.12

Source audit: `audit_iv_fitter_v1_3_11.md`.

## Fixed P0/P1/P2 items

- Corrected `_stderr` covariance scaling with final residual variance.
- Removed silent fixed-point fallback from the legacy junction-voltage solver.
- Propagated non-finite legacy/graph solver predictions as error warnings.
- Changed `graph_dc` warning severity from info to warning.
- Added deterministic bounded/log-space multistart seed generation.
- Added nonpositive-temperature validation.
- Moved FastAPI version and `/api/version` to `ivfitter.__version__`.
- Added environment-variable override for CORS origins via `IVFITTER_CORS_ORIGINS`.
- Changed fit/import exception handling to use 422 for value/validation errors and 500 for unexpected runtime errors.
- Added warnings for ambiguous import column fallback.
- Added React ErrorBoundary protection around PlotWorkspace and ParameterTable.
- Debounced model equation preview requests.
- Replaced hardcoded frontend `APP_VERSION` with Vite-injected `VITE_APP_VERSION` from root package version.
- Refactored ModelBuilder into readable helper subcomponents.
- Recomputed residual-floor estimate when selected trace data changes, not only when trace_id changes.
- Added chart accessibility basics: title, desc, role, aria-label, keyboard focus, hover live region.
- Added regression tests covering the audit fixes.

## Still intentionally left as future work

- Full parameter-identifiability labels and fit-quality verdict are not complete yet.
- Backend equation summary is still partly string-based; future work should make it a structured equation schema.
- The UI still needs manual browser clicking on Windows before production release.
