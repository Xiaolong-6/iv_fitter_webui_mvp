# IV-fitter Web UI hotfix report — v1.8.19

## Issue

The v1.8.18 Model Builder page could show a large blank area above the circuit canvas. The debug/synthetic trace control was rendered as a normal first child of `model-webpage-stack`; later full-height grid overrides gave that first row the available `1fr` height, pushing the actual React Flow canvas to the bottom of the viewport.

## Fix

- Passed the synthetic/debug tool into `ModelBuilder` as `canvasActions`.
- Rendered `canvasActions` inside the existing React Flow top-left preset panel.
- Removed the standalone normal-flow debug row before the Model Builder section.
- Added targeted v1.8.19 CSS rules so `workflow-view-model` uses one full-height canvas row.

## Validation

Executed against this tree:

```bash
npm --prefix frontend test -- --run       # passed: 14 files / 108 tests
npm --prefix frontend run build           # passed; existing Vite warnings only
PYTHONPATH=backend pytest -q backend/tests # passed
```

Browser automation in this sandbox could not navigate to localhost/file URLs due the environment policy, so final visual confirmation still needs one manual browser check on your machine.
