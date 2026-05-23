# Tested current package — v1.4.16

Scope: stabilization hotfix on top of v1.4.15. This package closes audit blockers without adding new modeling features.

## Fixes validated

- Frontend version fallback is `dev` instead of a stale concrete version string.
- Equation-preview API requests are abortable during rapid model edits.
- ErrorBoundary coverage now includes Fit config, Model Builder, Equation preview, and Warnings panels.
- `graph_dc` results are marked as diagnostic/not-reportable with an error-severity warning.
- `seed_scale_factors` is accepted for backward compatibility but emits a deprecation warning and remains ignored.
- Photocurrent magnitude parameters are explicitly required to be non-negative.
- `direction_sign = 0` is rejected; use `-1` or `+1`.
- Log-magnitude metrics exclude near-zero measured-current points and report the excluded count.
- Ordinary duplicate component addition is blocked for identical law/form/placement/polarity signatures.

## Commands run

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

## Results

- `npm install`: passed
- `npm run build`: passed
- `PYTHONPATH=backend python -m pytest backend/tests -q`: passed, 59 tests
- `python -m compileall -q backend/ivfitter backend/tests`: passed

## Manual browser check

1. Open the app and confirm the sidebar/version shows v1.4.16.
2. In Workspace, switch Solver mode to `graph_dc`, run a fit, and confirm the result is marked Not reportable/diagnostic rather than report-grade.
3. Rapidly add/remove model components and confirm Equation preview does not flicker into stale formulas or crash the page.
