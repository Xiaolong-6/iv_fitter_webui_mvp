# Model Builder V2 Self-Audit

## Scope audited

This audit reviews the V2 schematic-editor implementation added under `frontend/src/model-builder-v2/` and the related integration in `frontend/src/components/ModelBuilder.tsx`.

## Architectural findings

### Pass: V2 isolation

V2 is isolated under `frontend/src/model-builder-v2/`. Legacy code remains available but is not modified beyond adding an entry switch in `ModelBuilder.tsx`.

### Pass: domain/UI separation

Pure domain files define graph types, mutations, expression validation, connectivity validation, and graph compilation. React Flow is adapted from `SchematicGraph` and does not become solver truth.

### Pass: CSS ownership

V2 has one owned stylesheet: `frontend/src/model-builder-v2/styles/model-builder-v2.css`. The late override file was removed from the package. The V2 CSS has no `!important` declarations.

### Pass: user-facing model logic

The inspector presents component behavior as `R(V)`, `I(V)`, `ΔV(I)`, or `F(I,V)=0`. Resistor and diode are presets of these behaviors.

## Product findings

### Improved

The new workflow avoids the plus-button explosion that made complex models unreadable. Users can drag component functions from a palette and wire them freely between fixed V and GND terminals.

### Improved

Disconnected components are allowed during construction but ignored by the compiler. This supports iterative visual design without forcing a valid model at every intermediate step.

### Remaining limitation

The UI currently supports two-terminal component functions only. This is intentional for IV fitting and avoids premature SPICE complexity.

### Remaining limitation

Browser screenshot regression was not added because this clean source package does not include installed browser tooling. The acceptance document records this explicitly.

## Risk review

- Risk: backend solver may still have legacy assumptions. Mitigation: V2 emits graph-native `model.graph`; backend graph solver work must consume this contract.
- Risk: users may expect freehand wire waypoints. Mitigation: current wires are automatic orthogonal routes; manual waypoint editing can be added later without changing `SchematicGraph`.
- Risk: old tests may assert legacy builder DOM by default. Mitigation: legacy builder remains available and V2 should get dedicated tests in follow-up test work.

## External audit readiness

This package is ready for an external reviewer to evaluate V2 architecture and interaction direction. It should not be represented as a full SPICE simulator. It is a graph-native two-terminal IV model schematic editor with custom component-law support.


## 2026-06-01 — Model Builder V2 zoom/layout hotfix

- Contained V2 in the model workflow viewport at high app zoom.
- Added responsive V2 layout rules and internal preview scrolling.
- Added React Flow ResizeObserver refit for app zoom/container resize.
- See `MODEL_BUILDER_V2_ZOOM_LAYOUT_HOTFIX.md`.
