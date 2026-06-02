# Model Builder V2 Acceptance Checklist

## Version 1 skeleton acceptance

- [x] `frontend/src/model-builder-v2/domain/` exists.
- [x] `frontend/src/model-builder-v2/reactflow/` exists.
- [x] `frontend/src/model-builder-v2/panels/` exists.
- [x] `frontend/src/model-builder-v2/styles/` exists.
- [x] V2 has fixed V and GND terminals.
- [x] V2 has a left component palette.
- [x] V2 has an empty/free canvas area.
- [x] V2 has a right inspector placeholder and selected-component editor.
- [x] V2 does not import legacy Model Builder CSS.
- [x] `final-overrides.css` is removed from the source tree.
- [x] V2 stylesheet has no `!important` declarations.

## Functional schematic-editor acceptance

- [x] User can drag a component function from the palette into the canvas.
- [x] User can select a component.
- [x] User can move a component.
- [x] User can connect component and terminal ports.
- [x] Wires render as orthogonal Manhattan paths.
- [x] User can delete a selected wire from the wire label control.
- [x] User can delete a selected component from the inspector.
- [x] User can duplicate a selected component.
- [x] Disconnected components remain visible but are marked ignored.
- [x] Validation detects no active V-to-GND path.
- [x] Validation detects active components on the V-to-GND subgraph.
- [x] Graph compiler ignores disconnected components.

## Component-law acceptance

- [x] Inspector supports `R(V)`.
- [x] Inspector supports `I(V)`.
- [x] Inspector supports `ΔV(I)`.
- [x] Inspector supports `F(I,V)=0` residual.
- [x] Resistor is implemented as an `R(V)` preset.
- [x] Shockley diode is implemented as an `I(V)` preset.
- [x] User expression is preserved as written.
- [x] User parameters support symbol, value, lower, upper, and fit flag.
- [x] Expression validation rejects unknown symbols.
- [x] Expression validation blocks unsafe JS-like tokens.

## UI polish acceptance

- [x] Main interaction is palette-drag and port-wire editing, not plus-button explosion.
- [x] V and GND are visually fixed terminals.
- [x] Component cards emphasize user label first, behavior chip second.
- [x] Disconnected/ignored components are visually reduced.
- [x] Validation messages are user-facing and concise.
- [x] Copy avoids old main-path/shunt-branch mental model.

## External audit readiness checklist

- [x] Architecture document exists.
- [x] Acceptance document exists.
- [x] Migration document exists.
- [x] Audit document exists.
- [x] User manual was rewritten for actual current behavior.
- [x] Documentation index references V2 documents.
- [x] Project rules state that V2 must remain isolated from legacy CSS and schema shortcuts.

## Still out of scope for this release

- Transient simulation with capacitance/inductance.
- Full SPICE-compatible netlisting.
- Multi-terminal devices.
- Playwright screenshot regression, because this package does not include installed browser/test dependencies.
