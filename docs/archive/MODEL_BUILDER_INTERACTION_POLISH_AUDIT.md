# Model Builder interaction polish audit — direct graph UI

## Scope

This package applies a focused follow-up to the graph-native Model Builder after browser review showed that the graph was technically connected but still did not match the intended direct-editing interaction.

## User-visible fixes

1. **Empty-state direct-editing start**
   - When the model has no components, the canvas now renders the intended start state:
     `V — (+) — GND`.
   - The middle `+` inserts a component into the main path.

2. **No arrow-ended terminal wire**
   - Terminal wires no longer use an arrowhead marker.
   - The canvas now presents the model as a circuit graph, not a flowchart.

3. **No dashed V-shaped parallel-add guide**
   - The old helper edges from junctions down to the parallel `+` created a misleading V-shaped visual branch.
   - Those guide edges were removed.
   - The parallel add affordance remains as a floating `+` below the current branch set.

4. **Direct graph semantics preserved**
   - Path-edge `+` remains the serial insertion control.
   - Floating lower `+` remains the add-parallel-path control.
   - Component laws remain user-facing behavior modes: `R(V)`, `I(V)`, `ΔV(I)`, or custom residual.

## Files changed

- `frontend/src/components/model-builder/modelFlowGraph.ts`
- `MODEL_BUILDER_INTERACTION_POLISH_AUDIT.md`
- `CHANGELOG.md`
- `PROJECT_RULES.md`

## Static audit

- `getSmoothStepPath` is not used in the Model Builder graph edge renderer.
- `MarkerType` arrowheads are no longer imported or applied in `modelFlowGraph.ts`.
- `edge:add-parallel-guide-*` edges are absent.
- `final-overrides.css` remains absent.
- `package-lock.json` contains no OpenAI-internal npm registry URL.

## Not completed in this polish pass

- Browser screenshot regression tests were not added.
- The backend is still not a full SPICE-class simulator; this remains a DC/steady-state graph fitting system.
- npm install/test/build could not be completed inside this container because frontend dependency installation timed out. The source package is clean and excludes `node_modules`.

## Manual browser checks

1. Open Model Builder with an empty/custom model and verify the first state is `V — (+) — GND`.
2. Click the middle `+`; verify a component appears on the path and plus buttons remain on adjacent path segments.
3. Click the lower floating `+` after at least one branch exists; verify a new parallel path appears without any dashed V-shaped guide line.
