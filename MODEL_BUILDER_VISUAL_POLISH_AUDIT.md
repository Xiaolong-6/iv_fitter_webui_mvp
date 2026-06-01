# Model Builder Visual Polish Audit — Direct Graph Controls

## Scope

This hotfix targets the direct branch-graph Model Builder UI after graph-native wiring was introduced. The goal is not to change the mathematical model; it is to make the displayed circuit read closer to the intended interaction model:

- terminal axis stays horizontal;
- split/merge rails are lighter and less visually dominant;
- serial insertion controls are quieter by default;
- the parallel-add affordance is a semantic pill control instead of a lonely dashed `+`;
- component cards are more compact and less button-like.

## Files changed

- `frontend/src/components/model-builder/modelFlowGraph.ts`
- `frontend/src/components/model-builder/flowNodes.tsx`
- `frontend/src/components/model-builder/ButtonEdge.tsx`
- `frontend/src/styles/model-builder.css`
- `CHANGELOG.md`
- `PROJECT_RULES.md`

## Implementation details

### 1. Terminal alignment

- `TERMINAL_H` now matches the rendered terminal height.
- Right terminal edge gets explicit `routePoints` at `MAIN_Y`, so merge-junction to GND is drawn horizontally instead of slightly diagonal.

### 2. Circuit proportions

- Component render constants now match compact CSS dimensions.
- Branch vertical gap is reduced.
- Main/branch spacing is slightly increased so the line after main components is not visually cramped.

### 3. Quieter add controls

- Serial edge `+` controls now use the `xy-edge-action-serial` class and render smaller/fainter by default.
- They become prominent on hover/focus.
- Parallel path addition is now represented by a semantic pill button: `+ Add parallel path` / `+ 添加并联路径`.

### 4. Junction and wire refinement

- Junction rails are thinner.
- Branch tap dots are smaller.
- Wire stroke is reduced to a circuit-like weight.
- Component selected glows are less aggressive.

## Static checks performed

- TypeScript transpile check on changed files using `typescript.transpileModule`:
  - `ButtonEdge.tsx`: passed
  - `flowNodes.tsx`: passed
  - `modelFlowGraph.ts`: passed
- Confirmed no `final-overrides.css` import is present.
- Confirmed no OpenAI internal npm registry URL is present in `frontend/package-lock.json`.

## Build/test status

A full local `npm run build` could not be completed in this container because frontend dependencies are incomplete after npm installation timed out. The failure was dependency-resolution related (`react` types/runtime missing), not a TypeScript syntax error in the changed files.

Run locally after extracting:

```bat
cd frontend
rmdir /s /q node_modules
npm ci --registry=https://registry.npmjs.org/
npm run build
npm run test -- --run --reporter=dot
```

## Remaining validation needed

Manual browser validation should check:

1. GND wire is horizontal.
2. Split/merge rails are no longer visually heavy.
3. Default view is not overloaded by serial `+` buttons.
4. The lower control clearly reads as `+ Add parallel path`, not a physical branch.
5. Component insertion and parallel path insertion still work.
