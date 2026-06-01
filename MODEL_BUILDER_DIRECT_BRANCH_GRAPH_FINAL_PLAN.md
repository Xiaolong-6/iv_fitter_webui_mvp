# Model Builder direct branch-graph rewrite — final plan and handoff notes

## Direct conclusion

The Model Builder is now treated as a directly editable circuit graph, not as a visible module/container editor and not as a fixed `main path + shunt branch` drawing.

The user-facing interaction model is:

```text
V -- (+) -- GND
```

Clicking a `+` on a path inserts a component into that path. Clicking the lower/global `+` adds another parallel path between the same two junctions. A path may contain any number of ordered series components. The same two junctions may have any number of parallel paths.

## Architecture principle

The UI must model:

```text
nodes + paths + ordered components
```

not:

```text
modules + cards + legacy main/shunt buckets
```

The existing legacy backend schema still has `core`, `series`, and `parallel` arrays. For this frontend rewrite, graph behavior is represented by component metadata:

- `metadata.pathId` identifies which editable path a component belongs to.
- `metadata.pathOrder` orders components in series inside that path.
- missing `pathId` is migrated visually at render time:
  - series components -> `path:main`
  - branch components -> one path per component, `path:<component id>`

This lets the UI support repeated components, multiple parallel paths, and serial insertion without exposing legacy buckets to users.

## Component behavior model

A component is not fundamentally “resistor” or “diode” in the UI. A component is an editable relation using local variables:

- `V`: local voltage drop across the selected component/path
- `I`: local path current

Supported behavior modes:

1. `R(V)` — voltage-dependent resistance, rendered as `I = V / R(V)`.
2. `I(V)` — direct current expression.
3. `ΔV(I)` — voltage-drop expression.
4. `F(I,V)=0` — custom residual.

Ohmic resistance and Shockley diode are presets/special cases of these behavior modes, not separate UI architectures.

## User-defined formula and fitting parameters

The selected-component inspector now exposes:

- component name;
- behavior mode: `R(V)`, `I(V)`, `ΔV(I)`, or custom residual;
- preset selector for quick conversion;
- sign/polarity selector;
- expression textarea using `V` and `I`;
- parameter table with symbol, initial value, lower bound, upper bound, and fit checkbox;
- add/remove parameter actions.

User formulas are preserved as user-facing law text. The solver layer should later compile them into residuals, but it must not rewrite the displayed law as a different physical model.

## Frontend implementation notes

Major files changed:

- `frontend/src/components/model-builder/modelFlowGraph.ts`
  - Replaced old Vext/Vi/GND + floating-card layout with a direct branch graph.
  - Renders V and GND terminals, left/right junction dots, ordered paths, component nodes, serial insertion edges, and a parallel-path add control.

- `frontend/src/components/model-builder/ButtonEdge.tsx`
  - Edge plus buttons now carry `addMode`, `pathId`, and `insertIndex`.
  - Supports serial insertion into a path and parallel path creation.

- `frontend/src/components/model-builder/ModelFlowCanvas.tsx`
  - Added `addAt()` placement-aware insertion.
  - Adds path metadata and shifts `pathOrder` for serial insertion.
  - Adds behavior/parameter editing callbacks.

- `frontend/src/components/model-builder/ComponentCanvasEditor.tsx`
  - Rewritten selected-component inspector around `R(V)`, `I(V)`, `ΔV(I)`, and custom residual behavior.
  - Added expression editor and custom parameter table.

- `frontend/src/components/model-builder/flowNodes.tsx`
  - Restyled terminals, junctions, components, and floating plus actions.

- `frontend/src/components/model-builder/flowContext.tsx`
  - Extended context API for placement-aware insertion, behavior editing, and parameter-table edits.

- `frontend/src/components/model-builder/types.ts`
  - Added behavior and edge insertion metadata types.

- `frontend/src/model/customLawValidation.ts`
  - Added local `V` and `I` as the primary user variables and allowed common custom parameter symbols.

- `frontend/src/model-builder/rules.ts`
  - Duplicate component behavior is no longer blocked at UI level because repeated branches/components are valid in branch-graph editing.

- `frontend/src/styles/model-builder.css`
  - Added direct branch graph, plus-button, junction, terminal, and inspector parameter-table styling.

## Verification

Run from project root:

```bash
npm --prefix frontend install --ignore-scripts
npm --prefix frontend run test -- --run --reporter=dot
npm --prefix frontend run build
```

Verified in this handoff:

- Frontend tests: 14 files passed, 115 tests passed.
- Frontend build: passed.
- Known build warnings: existing `@xyflow/react` module-level `use client` warning and Vite chunk-size warning. Neither blocks the build.

## Manual browser check

1. Open Model Builder. Confirm the canvas shows `V`, black junction dots, `Rs` on the upper path, and `D1` / `Rsh` as parallel paths connected between the same junctions, not floating cards.
2. Click a `+` on a path. Confirm a component can be inserted into that exact path without changing other paths.
3. Select a component. Confirm the inspector exposes `R(V)`, `I(V)`, `ΔV(I)`, expression editing with `V` and `I`, polarity/sign, and a parameter table with fit checkboxes.

## Known limitation / next backend step

This handoff completes the direct branch-graph UI rewrite on top of the existing legacy model arrays. The backend fitting schema is still largely legacy-composite oriented. The next architectural step is to make backend fitting consume graph-native `nodes + paths + components + residuals`, flatten metadata-defined paths into a residual system, and assemble KCL automatically.

## v1.8.36 ELK layout update

The direct branch graph must not be positioned by hand-coded triangular coordinates. Layout is now treated as a separate pipeline:

```text
metadata-backed branch graph
  -> ELK layered layout
  -> React Flow node positions
  -> smooth-step/orthogonal circuit wires with EdgeLabelRenderer + buttons
```

Implementation notes:

- `elkjs` is a frontend dependency.
- `buildFlowGraphWithElk()` builds an ELK graph with terminals, left/right junctions, and component nodes.
- ELK options use layered layout, rightward direction, and orthogonal routing.
- The synchronous `buildFlowGraph()` remains as a deterministic fallback for tests and initial paint.
- React Flow remains the interaction/render layer; screen positions are never the model source of truth.

Acceptance additions:

1. Wires must not create large diagonal triangular layouts.
2. Adding a serial component or parallel path must trigger relayout.
3. The graph must remain readable for 1, 2, and 3+ parallel paths.
4. Edge plus buttons must remain on the relevant path segment after relayout.

## ELK routing alignment hotfix — 2026-05-31

The direct branch graph renderer must not split layout responsibility between ELK and hand-coded row coordinates.

Fixes applied:

1. **Circuit wires use straight/custom routed paths, not smooth-step curves**
   - `ButtonEdge.tsx` now uses `getStraightPath` as the fallback path generator.
   - When ELK supplies section points, the edge renderer uses those points directly as an SVG polyline path.
   - This removes the visible zig-zag/smooth-step artifacts that made the circuit look like a workflow graph.

2. **ELK edge sections are preserved**
   - `buildFlowGraphWithElk()` now extracts `laidOut.edges[].sections` and passes normalized `routePoints` into React Flow edge data.
   - React Flow no longer blindly discards ELK's routed edge geometry.

3. **Junction sizing is consistent with layout intent**
   - ELK junction nodes are now small junction dots instead of tall fake obstacles.
   - The rendered React Flow junction rail still spans the visible path handles, but ELK is no longer forced to route around a non-existent tall block.

4. **Y coordinates come from ELK when available**
   - Component node `x` and `y` both come from ELK layout output.
   - Path handle y positions are derived from ELK component centers where possible.
   - The old `rowY(pathIndex)` logic remains only as a fallback when ELK fails or a path has no laid-out component.

Verification:

```bash
npm --prefix frontend install --ignore-scripts
npm --prefix frontend run test -- --run --reporter=dot
npm --prefix frontend run build
```

Result: frontend tests passed, frontend build passed. Existing Vite warnings remain non-blocking.
