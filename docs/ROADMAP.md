# Roadmap

This file replaces older roadmap fragments.

## Current status

The Web UI is an internal alpha/prototype with a working local browser workflow and a new default **Model Builder** schematic editor.

Current capabilities:

- Data import and pasted-data import.
- HappyMeasure CSV v2 compatibility.
- Model Builder: the single active frontend builder path, with a graph-native free two-terminal schematic editor, fixed V/GND terminals, drag-in components, a dependency-light iframe canvas, presets/save, canvas Synthetic IV trace action, Go to fitting action, and V-to-GND validation.
- Fit diagnostics, warnings, residual plots, and formula/report preview on the main workflow.
- User-facing manual and external testing guide.

## Near-term priorities

1. Stabilize Model Builder browser behavior on Windows: no blank canvas, no hidden panels, reliable preview-canvas rendering, and toolbar actions that stay inside the canvas layer.
2. Expand Model Builder test coverage: graph mutations, component templates, validation, toolbar actions, and screenshot/manual smoke checks.
3. Connect Model Builder graph state to the backend graph solver with explicit user-facing limitations.
4. Continue integrating Model Builder-adjacent tools: equation preview, registry-driven extensions, and export/report synchronization. Synthetic IV trace and Go to fitting are now canvas toolbar actions.
5. Fit-quality verdicts with clearer user actions.
6. Better real-dataset regression suite, including HappyMeasure and representative diode/resistor/custom-law traces.

## Release-candidate priorities

- Confirm parity against the mature desktop/Tkinter workflow on representative IV datasets.
- Stabilize JSON export/import schema around `model_builder` and older-model compatibility loading.
- Decide packaging strategy: browser-local scripts, desktop wrapper, or other local launcher.
- Add benchmark traces with expected-fit tolerances.
- Add browser smoke/screenshot coverage for Model Builder: empty graph, single component, V-to-GND connected graph, disconnected component, and custom law editing.
- Run browser manual tests on Windows, mobile portrait, and LAN phone/tablet modes.

## Product guardrail

Do not add features that make the core workflow slower, less reliable, or harder to explain: import I-V data, build a physically interpretable model, fit, inspect diagnostics, and export defensible results.

For Model Builder, do not reintroduce hidden legacy placement assumptions. The user-facing model editor is a schematic graph: fixed V/GND terminals, two-terminal components, wires, validation, and compilation of only the active V-to-GND subgraph.

## API compatibility lifecycle

- `/api/v2/...` is the canonical frontend/backend API path.
- Bare `/api/...` aliases are retained for pre-v2 local clients and old scripts.
- Do not remove aliases until an external beta has confirmed no active tester package depends on them.
- When removal is approved, document the target version here and in `CHANGELOG.md` before deleting decorators.
