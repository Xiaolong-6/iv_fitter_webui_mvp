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

## Handoff requirements

- [ ] Provide a 3-step browser test in the final response.
- [ ] State exactly what was changed.
- [ ] State what was not changed.
- [ ] State validation commands and results.
- [ ] Provide the final zip only unless the user asks for intermediate packages.
