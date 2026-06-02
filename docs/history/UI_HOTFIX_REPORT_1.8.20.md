# IV-fitter Web UI hotfix report — v1.8.20

## Scope

Model Builder circuit-canvas visual semantics fix on top of v1.8.19.

## Fixed

- Neutralized default circuit wires so blue/purple no longer appear to encode physical current or voltage paths.
- Hid React Flow handles from normal viewing; they remain available internally for deterministic wiring.
- Removed persistent `+` buttons from circuit wires and moved add actions into the canvas toolbar.
- Added `+ Branch`, `+ Main`, and an options popover for selecting the definition used by each add action.
- Reduced selected-state overpainting: selected components now own the visual emphasis while linked edges stay neutral and subtle.
- Widened component cards and improved long-label handling.
- Made delete controls hover/selected-only and visually subordinate.
- Updated exported equivalent-circuit SVG to match the canvas semantics.

## Validation

- `npm --prefix frontend test -- --run`: passed, 14 files / 110 tests.
- `npm --prefix frontend run build`: passed; existing `@xyflow/react` module-directive warning and bundle-size warning only.
- `PYTHONPATH=backend pytest -q backend/tests`: passed.
- `python -m py_compile` on edited/critical backend modules: passed.

## Browser note

Automated browser screenshot capture was attempted in this environment, but Chromium access to local dev-server URLs was blocked by the container policy (`ERR_BLOCKED_BY_ADMINISTRATOR`). No manual browser visual pass is claimed.
