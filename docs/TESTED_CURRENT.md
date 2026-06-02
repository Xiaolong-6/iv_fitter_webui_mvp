# Tested current package

## Package

Model Builder V3 toolbar integration package prepared as v1.8.38.

## What changed in this package

- The existing Synthetic IV trace workflow is exposed directly in the Model Builder V3 canvas toolbar between Save and Go to fitting.
- `ModelBuilder` now passes `canvasActions` into `SchematicBuilderV3`, so parent workflow tools are not discarded by the V3 wrapper.
- The Synthetic IV trace launch control is styled as a compact floating canvas button while preserving the existing modal, generate-and-import, and CSV-only behavior.
- Current README/manual/roadmap/handoff docs describe V3 as the active Model Builder path and document the canvas Synthetic IV trace action.
- Root, frontend, backend, and lockfile version metadata are synchronized to v1.8.38.

## Validation run in this workspace

```powershell
npm --prefix frontend exec tsc -- --noEmit --skipLibCheck --jsx react-jsx --moduleResolution bundler --module esnext --target es2020 frontend/src/vite-env.d.ts frontend/src/model-builder-v3/SchematicBuilderV3.tsx frontend/src/model-builder-v3/panels/ComponentPalettePanel.tsx frontend/src/components/ModelBuilder.tsx frontend/src/pages/FittingPage.tsx frontend/src/pages/components/WorkflowSections.tsx frontend/src/components/SyntheticTraceTool.tsx
```

Result: passed.

```powershell
npm run build
```

Result: passed. Vite still reports the existing React Flow `"use client"` directive warning and a large chunk-size warning.

```powershell
npm --prefix frontend run test -- --run src/pages/__tests__/FittingPage.test.tsx src/components/__tests__/ModelBuilder.test.tsx
```

Result: failed against legacy Model Builder DOM expectations. The V3 render path no longer crashes, but the old tests still query V2-era selectors such as `equivalent-circuit-canvas`, `model-preset-select`, plus-driven insertion controls, and `.model-webpage-stack`.

Additional backend validation should still be run before public release:

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```
