# v1.9.6 verification-fix update

The current package is v1.9.6. It corrects the frontend test failures left in the prior v1.9.5 staged package. In this workspace, `npm ci`, frontend Vitest, frontend production build, backend compile, and backend pytest were all run successfully. Browser manual smoke testing and Windows portable packaging still require local/manual validation.

Important fix: `handleToPort` now treats the React Flow terminal handle id `node` as a node handle, not as a component `n` port. Do not regress this behavior when changing component handle IDs.

# IV-fitter Web UI agent handoff

## Current baseline

Continue from the Model Builder interaction branch. The only active frontend Model Builder path is now **Model Builder**, an isolated graph-native schematic editor under `frontend/src/model-builder/`. V1/V2 frontend source and V2 active docs have been removed; current UI work should target Model Builder.

## Non-negotiable project rules

- If the architecture or implementation intent is unclear, stop and confirm before changing code.
- Keep fitting physics, backend APIs, saved-model compatibility, and report numerical semantics unchanged unless the user explicitly asks for a model/physics change.
- Do not claim tests passed unless they were actually run in the current working tree.
- Do not put human local paths, private names, API tokens, or personal data in commits, changelogs, release notes, screenshots, or generated docs.
- Do not create `final-overrides.css` or global CSS patch piles. Model Builder CSS must stay isolated.

## Model Builder summary

Model Builder source of truth:

```text
Mb3Graph
  nodes: fixed terminals and generated junctions
  components: two-terminal R(V), I(V), dV(I), constant-current, or custom elements
  wires: port-to-port connections
```

React Flow is only the renderer and interaction surface. The Model Builder domain/state layer owns mutations, validation, templates, presets, and the current canvas interaction model.

Important Model Builder files:

- `frontend/src/model-builder/SchematicBuilder.tsx`
- `frontend/src/model-builder/canvas/CanvasAdapter.tsx`
- `frontend/src/model-builder/domain/templates.ts`
- `frontend/src/model-builder/domain/presets.ts`
- `frontend/src/model-builder/domain/validation.ts`
- `frontend/src/model-builder/panels/ComponentListPanel.tsx`
- `frontend/src/model-builder/panels/ComponentPalettePanel.tsx`
- `frontend/src/model-builder/panels/InspectorPanel.tsx`
- `frontend/src/model-builder/styles/model-builder.css`

## Known Model Builder caveats

- Model Builder uses an internal component template list; runtime registry extension is not yet wired into the Model Builder palette.
- Synthetic IV trace and Go to fitting are Model Builder canvas toolbar actions; equation preview/report synchronization should stay driven by Model Builder graph metadata.
- Backend graph-native fitting must be treated as experimental unless the current release notes explicitly say otherwise.
- If the browser shows a blank Model Builder page with no console error, first inspect container sizing and React Flow named imports; Model Builder requires an explicit canvas height and named `ReactFlow` import from `@xyflow/react`.

## Current page architecture

### Import / Data

- Import file, paste data, and HappyMeasure CSV v2 compatibility are still legacy-stable areas.
- Do not weaken all-trace spreadsheet preview or selected-trace highlighting.

### Model

- Default: Model Builder schematic editor.
- Model Builder should keep parent workflow actions inside the canvas toolbar when available; Synthetic IV trace and Go to fitting are already wired.

### Fit

- Fit setup stays compact and sticky at the top.
- Advanced solver/objective/run controls should not push plots/parameters down.

### Report

- Report remains a single-column reader layout.
- Exports must not overlap dock/sidebar.
- Equivalent circuit/report rendering must not claim unsupported Model Builder graph semantics.

## Validation commands

From the project root:

```bash
cd frontend
npm ci --registry=https://registry.npmjs.org/
npm run test -- --run --reporter=dot
npm run build

cd ../backend
python -m pytest -q
python -m compileall -q ivfitter
```

## Manual smoke checks before release

1. Launch the frontend; the app must not open to a blank page.
2. Open Model Builder; the floating title, component list, canvas, validation status/Go to fitting action, Synthetic IV trace action, and inspector must all be visible.
3. Drag a component from the palette to the canvas.
4. Connect V → component → GND.
5. Confirm disconnected components are dimmed/ignored and the active V-to-GND subgraph is highlighted/validated.
6. Edit a component behavior/expression/parameter table and confirm validation messages update.
7. Open Synthetic IV trace from the Model Builder canvas toolbar and confirm the dialog appears.
8. Run frontend build/tests and backend tests before claiming release readiness.
