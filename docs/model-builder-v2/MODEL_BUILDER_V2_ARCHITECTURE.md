# Model Builder V2 Architecture

## Purpose

Model Builder V2 replaces the plus-button topology-growth prototype with an isolated, graph-native schematic editor. The editor is designed for two-terminal IV fitting models with fixed `V` and `GND` terminals. Users drag component functions into the canvas, wire ports freely, and the compiler extracts only the connected V-to-GND subgraph for fitting.

## Non-negotiable boundaries

1. `SchematicGraph` is the only front-end model truth.
2. React Flow is a renderer and interaction layer only.
3. React Flow nodes/edges must not be treated as solver truth.
4. Legacy Model Builder code is isolated behind the legacy entry switch.
5. Model Builder V2 does not import legacy model-builder CSS.
6. No `final-overrides.css` or catch-all override pile is allowed.
7. Graph validation and graph compilation are pure domain functions.
8. Backend receives a graph-like `GraphSpec`; it never reads React Flow state.

## Directory structure

```text
frontend/src/model-builder-v2/
  domain/
    schematicTypes.ts          # source-of-truth graph types
    componentCatalog.ts        # preloaded component function presets
    initialGraph.ts            # V/GND and legacy-to-v2 starter graph
    schematicMutations.ts      # pure graph mutation functions
    expressionValidation.ts    # safe expression checks
    graphValidation.ts         # V-to-GND connectivity and warnings
    graphCompile.ts            # SchematicGraph -> backend GraphSpec
  reactflow/
    SchematicCanvas.tsx        # React Flow wrapper and event bridge
    reactFlowAdapter.ts        # SchematicGraph -> ReactFlow render graph
    nodes/                     # terminal, junction, component nodes
    edges/                     # orthogonal wire renderer
  panels/
    ComponentPalette.tsx       # function library
    ComponentInspector.tsx     # R(V)/I(V)/dV(I)/residual editor
    ValidationPanel.tsx        # user-facing graph status
  styles/
    model-builder-v2.css       # owned stylesheet for V2 only
```

## Data model

`SchematicGraph` contains:

- fixed terminals `V` and `GND`,
- optional junction nodes,
- two-terminal components,
- wires connecting node or component ports,
- component behavior definitions.

A component can be one of:

- `R_of_V`: resistance expression `R = f(V, params)`, compiled as `I - V/R = 0`.
- `I_of_V`: current expression `I = f(V, params)`, compiled as `I - f(V) = 0`.
- `dV_of_I`: voltage-drop expression `V = f(I, params)`, compiled as `V - f(I) = 0`.
- `residual`: implicit residual `F(I,V,params) = 0`.

Resistors and diodes are presets, not architecture branches. A Shockley diode is an `I(V)` preset. A constant resistor is an `R(V)` preset.

## UI model

The user works like a schematic editor:

1. V and GND are fixed on the canvas.
2. The left palette contains preloaded component functions.
3. The user drags components into the canvas.
4. The user connects ports using wires.
5. Wires are rendered orthogonally.
6. Components not on a V-to-GND connected subgraph are ignored and visually marked.
7. The right inspector edits the selected component expression and parameters.

## Validation model

Validation builds a connectivity graph from wires and ports, then finds components spanning between the V-connected and GND-connected sets. It reports:

- no active V-to-GND path,
- dangling/disconnected components,
- invalid expressions,
- parameter conflicts and bound issues.

## Compile model

`compileSchematicGraph()` converts only active V-to-GND components into `GraphSpec`. The graph spec includes backend nodes derived by unioning connected wire ports. Component metadata preserves:

- user label,
- behavior mode,
- user expression,
- preset id and label.

## Styling rules

- V2 owns `model-builder-v2.css`.
- Do not add V2 rules to `final-overrides.css` or legacy `model-builder.css`.
- Do not duplicate selector definitions.
- Do not use `!important` except documented third-party React Flow overrides; this V2 stylesheet currently uses none.

## Current implementation level

This revision implements the V2 skeleton plus the core schematic editing path: palette, canvas, component drag/drop, port wiring, component inspector, expression validation, parameter table, V-to-GND subgraph validation, and `GraphSpec` compilation. It is intentionally isolated from the legacy builder so that future work can replace legacy without mixing assumptions.
