# v1.9.6 verification-fix update

The current package is v1.9.6. It corrects the frontend test failures left in the prior v1.9.5 staged package. In this workspace, `npm ci`, frontend Vitest, frontend production build, backend compile, and backend pytest were all run successfully. Browser manual smoke testing and Windows portable packaging still require local/manual validation.

Important baseline: Model Builder now uses the preview iframe canvas, not the old React Flow interaction surface. Do not reintroduce React Flow panels or legacy placement UI while working on the active builder.

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

The active renderer is the dependency-light preview iframe. The React side owns floating menus, inspector editing, persistence, compile status, Synthetic IV, and Go to fitting. The domain layer owns graph compilation, validation, templates, presets, and fitting-facing model output.

Important Model Builder files:

- `frontend/src/model-builder/SchematicBuilder.tsx`
- `frontend/src/model-builder/preview/PreviewCanvas.tsx`
- `frontend/src/model-builder/preview/PreviewChrome.tsx`
- `frontend/src/model-builder/preview/canvasState.ts`
- `frontend/src/model-builder/preview/previewStorage.ts`
- `frontend/public/model-builder-preview.html`
- `frontend/public/model-builder-preview.css`
- `frontend/public/model-builder-preview-config.js`
- `frontend/public/model-builder-preview.js`
- `frontend/src/model-builder/domain/templates.ts`
- `frontend/src/model-builder/domain/presets.ts`
- `frontend/src/model-builder/domain/validation.ts`
- `frontend/src/model-builder/styles/preview-canvas.css`

## Known Model Builder caveats

- Model Builder uses an internal component template list; runtime registry extension is not yet wired into the Model Builder palette.
- Synthetic IV trace and Go to fitting are Model Builder canvas toolbar actions; equation preview/report synchronization should stay driven by Model Builder graph metadata.
- Backend graph-native fitting must be treated as experimental unless the current release notes explicitly say otherwise.
- If the browser shows a blank Model Builder page with no console error, first inspect iframe sizing, `/model-builder-preview.html`, and the preview script load order. The iframe must load `model-builder-preview-config.js` before `model-builder-preview.js`.

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
