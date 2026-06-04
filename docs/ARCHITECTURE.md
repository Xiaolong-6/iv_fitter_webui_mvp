# Architecture

## Runtime split

```text
React/Vite frontend -> FastAPI API -> Python fitting core
```

The fitting engine owns scientific behavior. FastAPI is an adapter. React is the user-facing client.

## Model Builder architecture

Model Builder is the default user-facing model editor. It is implemented as an isolated graph-native schematic editor under:

```text
frontend/src/model-builder/
  canvas/       React Flow adapters, nodes, edges, drag/drop, and wire interactions
  domain/       graph data, component templates, presets, validation, collision helpers
  panels/       component list, toolbar, preset list, and inspector panels
  state/        reducer, actions, and starter graph factory
  styles/       Model Builder-only CSS; no legacy model-builder stylesheet imports
```

The Model Builder source of truth is `Mb3Graph`, not React Flow nodes/edges. React Flow is only the renderer and interaction layer:

```text
Mb3Graph -> canvas adapter -> React Flow nodes/edges
React Flow event -> mb3Reducer/domain helpers -> Mb3Graph
Mb3Graph -> validation -> V-to-GND path status and short-circuit warning
```

Model Builder fixes two terminal nodes, `V` and `GND`, and lets the user drag two-terminal components from the Components list onto the canvas. Components expose behaviors such as `R(V)`, `I(V)`, `dV(I)`, or custom residual forms; resistor, Shockley diode, constant-current, saved custom, and saved model entries are templates/presets rather than separate topology classes. Disconnected components remain on the canvas but are ignored until connected into a valid V-to-GND subgraph.

The Model Builder canvas toolbar owns clear canvas, presets, save preset, Synthetic IV trace, and Go to fitting actions. Parent workflow actions such as Synthetic IV trace should be passed into Model Builder as canvas actions instead of being rendered as external document-flow rows that can disturb canvas sizing.

Backend graph-native fitting support remains experimental unless the current release notes explicitly mark it production-ready. The frontend must not claim unsupported graph topologies are fit-ready.
## Compatibility model schema

Older saved models and backend compatibility paths may still use the **Law / Form / Placement** schema.

- **Law**: the mathematical relation, such as Shockley diode, Ohmic resistance, soft-threshold power-law current, reverse leakage / soft-breakdown current, or a custom expression.
- **Form**: how the relation participates numerically, such as `current_branch` or `voltage_drop`.
- **Placement**: where the relation appears in the user model, primarily **Main path** or **Branches**.

This schema is no longer an active frontend builder architecture. Model Builder should not rebuild placement buckets in the UI; it compiles the free schematic graph and keeps compatibility details out of the normal user workflow.

## Data flow

```text
CSV/TXT/Data paste -> backend import parser -> TraceData -> FitRequest -> FitResult -> UI plots/warnings/report
```

Import parsing happens in the backend so column decisions, dropped rows, unit handling, and HappyMeasure compatibility are consistent between browser and API tests.

## Fitting flow

1. The frontend sends the selected trace, fit range, model spec, and fit config.
2. The backend validates the model and data.
3. The fitting engine evaluates the selected model path. Compatibility models may use Law/Form/Placement assembly; Model Builder graph models use graph-native data where supported.
4. The API returns parameters, warnings, metrics, curves, and equation summaries.
5. The frontend renders plots, diagnostics, equation preview, and report/export panels.

## Solver boundary

The implicit compatibility solver remains available for older model specs. The graph DC solver remains experimental unless the current release notes explicitly mark graph-native fitting as production-ready. The frontend must not claim unsupported graph topologies are fit-ready.

## Frontend boundary

The frontend may render model summaries, formula cards, circuit previews, and user documentation. It must not invent scientific behavior that is not represented in the backend model spec and registry.

## Styling boundary

Model Builder owns `frontend/src/model-builder/styles/model-builder.css`. It must not import legacy `model-builder.css`, and it must not recreate `final-overrides.css` style cascades. Any React Flow-specific override must be local to Model Builder and documented in the stylesheet section where it appears.

## Documentation boundary

User-facing documentation explains physical use, I-V curve effects, parameter meaning, and fitting strategy first. Schema IDs, internal parameter keys, adapter names, and serialization details belong only in developer docs or collapsed Advanced details.
