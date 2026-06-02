# IV-fitter Web UI agent handoff

## Current baseline

Continue from the Model Builder V3 interaction branch. The default Model Builder path is now **Model Builder V3**, an isolated graph-native schematic editor under `frontend/src/model-builder-v3/`. V2 and legacy artifacts remain useful references, but current UI work should target V3 unless the user explicitly asks otherwise.

## Non-negotiable project rules

- If the architecture or implementation intent is unclear, stop and confirm before changing code.
- Keep fitting physics, backend APIs, saved-model compatibility, and report numerical semantics unchanged unless the user explicitly asks for a model/physics change.
- Do not claim tests passed unless they were actually run in the current working tree.
- Do not put human local paths, private names, API tokens, or personal data in commits, changelogs, release notes, screenshots, or generated docs.
- Do not create `final-overrides.css` or global CSS patch piles. Model Builder V3 CSS must stay isolated.

## Model Builder V3 summary

V3 source of truth:

```text
Mb3Graph
  nodes: fixed terminals and generated junctions
  components: two-terminal R(V), I(V), dV(I), constant-current, or custom elements
  wires: port-to-port connections
```

React Flow is only the renderer and interaction surface. The V3 domain/state layer owns mutations, validation, templates, presets, and the current canvas interaction model.

Important V3 files:

- `frontend/src/model-builder-v3/SchematicBuilderV3.tsx`
- `frontend/src/model-builder-v3/canvas/CanvasAdapterV3.tsx`
- `frontend/src/model-builder-v3/domain/templates.ts`
- `frontend/src/model-builder-v3/domain/presets.ts`
- `frontend/src/model-builder-v3/domain/validation.ts`
- `frontend/src/model-builder-v3/panels/ComponentListPanel.tsx`
- `frontend/src/model-builder-v3/panels/ComponentPalettePanel.tsx`
- `frontend/src/model-builder-v3/panels/InspectorPanel.tsx`
- `frontend/src/model-builder-v3/styles/model-builder-v3.css`

## Known V3 caveats

- V3 uses an internal component template list; runtime registry extension is not yet wired into the V3 palette.
- Synthetic IV trace and Go to fitting are V3 canvas toolbar actions; equation preview/report synchronization still needs deeper V3 integration.
- Backend graph-native fitting must be treated as experimental unless the current release notes explicitly say otherwise.
- If the browser shows a blank Model Builder page with no console error, first inspect container sizing and React Flow named imports; V3 requires an explicit canvas height and named `ReactFlow` import from `@xyflow/react`.

## Current page architecture

### Import / Data

- Import file, paste data, and HappyMeasure CSV v2 compatibility are still legacy-stable areas.
- Do not weaken all-trace spreadsheet preview or selected-trace highlighting.

### Model

- Default: Model Builder V3 schematic editor.
- Legacy builder is available elsewhere for compatibility.
- V3 should keep parent workflow actions inside the canvas toolbar when available; Synthetic IV trace and Go to fitting are already wired.

### Fit

- Fit setup stays compact and sticky at the top.
- Advanced solver/objective/run controls should not push plots/parameters down.

### Report

- Report remains a single-column reader layout.
- Exports must not overlap dock/sidebar.
- Equivalent circuit/report rendering must not claim unsupported V3 graph semantics.

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
2. Open Model Builder V3; the floating title, component list, canvas, validation status/Go to fitting action, Synthetic IV trace action, and inspector must all be visible.
3. Drag a component from the palette to the canvas.
4. Connect V → component → GND.
5. Confirm disconnected components are dimmed/ignored and the active V-to-GND subgraph is highlighted/validated.
6. Edit a component behavior/expression/parameter table and confirm validation messages update.
7. Open Synthetic IV trace from the V3 canvas toolbar and confirm the dialog appears.
8. Run frontend build/tests and backend tests before claiming release readiness.
