# Model Builder Graph-Native Completion Audit

Date: 2026-05-31

## Direct conclusion

This iteration removes the broken mixed ELK/manual visual layout and completes a usable graph-native path for the current application scope:

- The visible Model Builder canvas is a direct circuit graph, not floating cards and not gray modules.
- The default single-diode preset renders as a series path from `V` into a split junction, then parallel branch paths to the merge junction and `GND`.
- Every path segment exposes a `+` insertion affordance for serial component insertion.
- The lower dashed `+` adds another parallel branch between the same split/merge junction pair.
- Component behavior is edited as `R(V)`, `I(V)`, `dV(I)`, or custom residual `F(I,V)=0`.
- User expressions are preserved and mapped only through local variables `V` and `I`.
- Custom parameter symbols, values, bounds, and fit flags are editable.
- Backend graph DC solving supports graph-native custom `R(V)`, `I(V)`, and `dV(I)` components through safe expression evaluation.

## What was deleted/replaced conceptually

The UI no longer treats the graph as visible nested modules. The canvas model now follows:

```text
terminal → ordered series path → split junction → one or more ordered branch paths → merge junction → reference terminal
```

This is still compatible with the legacy `series/core/parallel` buckets, but the rendering and solver semantics are graph-oriented.

## Major implementation changes

### Frontend

- `frontend/src/components/model-builder/modelFlowGraph.ts`
  - Rewritten around deterministic circuit graph layout.
  - Main series components are rendered before the split junction.
  - Branch components are rendered as true parallel paths between the same left/right junctions.
  - The junction rail includes all path y-positions and a main connection position.
  - Edges are straight path segments; no smoothstep/sawtooth routing.
  - `buildFlowGraphWithElk()` now defers to the deterministic circuit layout to avoid the previous mixed-coordinate failure mode.

- `frontend/src/components/model-builder/ButtonEdge.tsx`
  - Uses `getStraightPath`.
  - Edge label `+` buttons are retained for serial/parallel insertion.

- `frontend/src/components/model-builder/ComponentCanvasEditor.tsx`
  - Inspector supports `R(V)`, `I(V)`, `dV(I)`, and `F(I,V)=0`.
  - User-facing local variables are `V` and `I`.
  - Parameter table supports symbol/value/lower/upper/fit.
  - Dynamic parameter names are passed into expression validation.

- `frontend/src/model/customLawValidation.ts`
  - Validation accepts user-added parameter symbols.
  - Removed hard error warnings that forced old main/branch variable assumptions.

- `frontend/src/styles/model-builder.css`
  - Added true visual junction rails and straight circuit-wire styling overrides.

### Backend

- `backend/ivfitter/components/custom.py`
  - Added `evaluate_custom_variable_expression()` for explicit safe `V`/`I` variable mapping.
  - Added `min`/`max` aliases to the safe expression environment.

- `backend/ivfitter/core/graph_solver.py`
  - Rewritten as a DC graph solver that can use `model.graph` directly when present, otherwise assembles from legacy buckets.
  - Supports custom behavior metadata:
    - `R_of_V`: `I = V / R(V)`
    - `I_of_V`: `I = expression(V)`
    - `dV_of_I`: solves `expression(I) = V`
    - `custom_residual`: solves `F(I,V)=0`
  - Preserves user formula text; only variable mapping and residual evaluation are performed.

- `backend/ivfitter/core/fitting_engine.py`
  - Graph-only component parameters are included in fit packing.
  - `graph_dc` is no longer marked unreportable solely for using the graph solver.

## Tests added/updated

- Added `backend/tests/test_graph_custom_law_solver.py`:
  - verifies custom `R(V)` graph edge current,
  - verifies multiple custom `I(V)` parallel branches,
  - verifies custom `dV(I)` solve.

- Updated frontend graph wiring tests to match the new direct graph edge IDs.

## Verification run

Commands run:

```bash
PYTHONPATH=backend pytest -q backend/tests
npm --prefix frontend run test -- --run --reporter=dot
npm --prefix frontend run build
```

Results:

```text
Backend tests: passed
Frontend tests: 14 files / 115 tests passed
Frontend build: passed
```

Known non-failing warnings:

```text
@xyflow/react "use client" warning from Vite
Vite chunk-size warning
React act(...) warnings in existing ModelFlowCanvas tests
```

## Self-audit

### Passed acceptance items

- Default components are no longer isolated floating cards.
- `Rs` is rendered as a series-path component before the branch junction.
- `D1` and `Rsh` are rendered as parallel branch paths between the same junctions.
- The old smoothstep/sawtooth edge problem is removed.
- The canvas shows visible junction rails with black junction dots.
- Serial insertion remains path-bound.
- Parallel insertion remains available through the lower `+` action.
- Component law editing uses `R(V)`, `I(V)`, `dV(I)`, and residual forms.
- Custom parameters can be added and fitted.
- Backend graph solver can compute custom graph components.
- Build and test commands pass.

### Remaining limitations

These are not hidden:

- This is a DC graph solver, not a full SPICE simulator. It does not support capacitance, inductance, transients, or dynamic state variables.
- The frontend still maps graph editing through the legacy `series/core/parallel` buckets for compatibility. Fully arbitrary multi-internal-node editing is supported at backend `GraphSpec` level but not yet fully exposed as a freeform canvas UI.
- There is no Playwright screenshot regression suite yet. The functional tests and build pass, but browser visual regression would still be valuable.
- Undo/redo for every graph mutation is not implemented as a dedicated history stack; existing app-level state behavior remains.

## Handoff

Use this package as the new branch-graph baseline. Do not reintroduce smoothstep edges, floating component stacks, gray module containers, or a mixed ELK/manual coordinate system.
