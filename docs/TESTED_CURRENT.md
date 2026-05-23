# Tested current package — v1.4.19

## v1.4.19 validation

Validated tutorial-style User Manual integration with:

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

Expected results: frontend build passes, backend tests pass, compileall passes. Regression tests continue to cover user-facing Function Guide constraints and backend semantic consistency.

## Manual integration checks

- User manual starts with what IV-fitter solves, then workflow, data import, Model Builder concepts, Function Guide, formula assembly, fitting mechanics, recipes, residuals, reportability, light response, troubleshooting, and glossary.
- Formula content uses rendered equation blocks rather than raw plain-text formula lines.
- English and Chinese content are selected through the app language selector; the UI does not show both languages as one long mixed document.
- Advanced function implementation details remain collapsed inside Function Guide cards.
