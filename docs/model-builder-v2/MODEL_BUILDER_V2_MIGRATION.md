# Model Builder V2 Migration Plan

## Strategy

V2 is introduced as an isolated implementation. Legacy Model Builder remains available behind an entry switch so existing workflows are not destroyed during migration.

## What is migrated now

- The default legacy single-diode model is represented as a starter V2 schematic:
  - `V -> Rs -> J1`
  - `J1 -> D1 -> J2`
  - `J1 -> Rsh -> J2`
  - `J2 -> GND`
- The V2 graph is stored in `model.graph` using `schema_version = schematic_v2`.
- User component law metadata is preserved in `GraphComponent.metadata`.

## What is not reused

- Legacy visible `main path` / `shunt branch` UI concepts are not reused.
- Legacy plus-button topology growth is not the V2 primary interaction.
- Legacy `model-builder.css` is not imported by V2.
- `final-overrides.css` is not allowed.

## Compatibility contract

The legacy `ModelSpec` remains present for old pages/tests. V2 writes a graph-native `GraphSpec` into `model.graph`. Fitting configuration already defaults to `graph_dc`, so backend-side graph features can consume `model.graph` without React Flow knowledge.

## Next migration steps

1. Replace the legacy Model Builder entry after external UX acceptance.
2. Convert all saved presets into explicit `SchematicGraph` templates.
3. Add import/export of V2 graph JSON.
4. Expand backend graph solver coverage for arbitrary graph topologies.
5. Delete legacy Model Builder only after parity tests and manual user acceptance.
