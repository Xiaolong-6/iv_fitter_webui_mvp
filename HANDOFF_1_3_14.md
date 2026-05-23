# IV-fitter Web UI v1.3.14 handoff

This package was modified locally from the uploaded `iv_fitter_webui_mvp-main.zip`. No git commit was made.

## What changed

- Fixed Data workspace display-unit selectors so they do not mutate the SI arrays used for fitting.
- Routed browser CSV/TXT import through the backend multi-trace import endpoint.
- Added a compact import-quality panel in the Data workspace.
- Reworked the Model Builder equivalent-circuit preview into a left-to-right SVG topology schematic.
- Bumped project/package/backend/frontend/UI fallback versions to 1.3.14.
- Updated README, CHANGELOG, PROJECT_RULES, WEBUI_AGENT_HANDOFF, and added `docs/TESTED_1_3_14.md`.

## Validation run in this package

```text
npm install
npm run build
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

Results: frontend build passed; backend tests passed (32 tests); compileall passed.

## How to run on Windows

From the extracted project root, use the existing numbered scripts:

```text
00_validate_scripts.bat
01_check_environment.bat
02_setup_dev.bat
03_test_backend.bat
04_run_dev.bat
```

For split launch:

```text
04a_run_backend_only.bat
04b_run_frontend_only.bat
```

## Suggested commit title if you commit manually

```text
Fix data-unit safety and improve circuit preview
```

## Suggested commit body

```text
- Keep Data workspace unit selectors display-only so imported SI fitting arrays are not rescaled by preview-unit changes.
- Route browser CSV/TXT import through the backend multi-trace import endpoint and surface import-quality diagnostics.
- Replace the disconnected equivalent-circuit blocks with a left-to-right SVG topology schematic in Model Builder.
- Bump version to 1.3.14 and update changelog, README, project rules, handoff, and tested notes.
```
