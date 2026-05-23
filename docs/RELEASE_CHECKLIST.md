# Release checklist

## Before packaging

- [ ] README version matches package/backend/frontend versions.
- [ ] `docs/DOCUMENTATION_INDEX.md` points to current docs.
- [ ] `docs/WEBUI_AGENT_HANDOFF.md` reflects current state.
- [ ] `docs/TESTED_CURRENT.md` contains the current validation record.
- [ ] Old generated folders are removed: `node_modules`, `dist`, `frontend/dist`, `__pycache__`, `.pytest_cache`, `*.pyc`.

## Validation commands

```powershell
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

## Manual browser checks

- [ ] Import a CSV or pasted trace.
- [ ] Build a simple model and run a fit.
- [ ] Confirm warnings/result panels update.
- [ ] Open User manual -> Function Guide.
- [ ] Test mobile portrait layout at <= 640 px.
- [ ] If relevant, test LAN launch with `04c_run_lan_dev.bat`.

## Release-candidate gates

These are the current gates before calling a build a release candidate rather than an internal alpha:

- [ ] Representative desktop/Tkinter parity check is complete on real IV datasets.
- [ ] At least 2-5 benchmark traces are committed under `examples/` or documented test fixtures, with expected-fit tolerances or expected warnings.
- [ ] JSON import/export schema compatibility is checked against a saved result from the current package.
- [ ] Packaging path is chosen and documented: browser-local scripts, desktop wrapper, or another local launcher.
- [ ] Known alpha-only limitations are explicit in README and handoff docs, especially graph solver status and missing light/dark two-trace preview.
- [ ] Windows desktop, mobile portrait, and LAN phone/tablet browser checks have current validation notes.

Can remain non-blocking for alpha if documented:

- [ ] One-click light-response presets.
- [ ] Optional light/dark `Delta I(V)` preview.
- [ ] Fully structured backend equation schema replacing string summaries.

## Handoff requirements

- [ ] Provide a 3-step browser test in the final response.
- [ ] State exactly what was changed.
- [ ] State what was not changed.
- [ ] State validation commands and results.
- [ ] Provide the final zip only unless the user asks for intermediate packages.
