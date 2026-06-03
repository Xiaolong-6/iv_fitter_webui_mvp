# Tested current package

## Package

Model Builder V3 cleanup package prepared as v1.8.38.

## What changed in this package

- The existing Synthetic IV trace workflow is exposed directly in the Model Builder V3 canvas toolbar between Save and Go to fitting.
- `ModelBuilder` now passes `canvasActions` into `SchematicBuilderV3`, so parent workflow tools are not discarded by the V3 wrapper.
- The Synthetic IV trace launch control is styled as a compact floating canvas button while preserving the existing modal, generate-and-import, and CSV-only behavior.
- Current README/manual/roadmap/handoff docs describe V3 as the active Model Builder path and document the canvas Synthetic IV trace action.
- Legacy V1/V2 frontend Model Builder source has been removed; `ModelBuilder` now depends on V3 types and V3 rendering only.
- The old global `styles/model-builder.css` shell has been removed; Model Builder styling is owned by V3 CSS.
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

Earlier result: failed against legacy Model Builder DOM expectations.

Current focused V3 cleanup validation:

```powershell
npm --prefix frontend run test -- --run src/components/__tests__/ModelBuilder.test.tsx src/model-builder-v3/__tests__/adapter.test.ts src/model-builder-v3/__tests__/compile.test.ts src/model-builder-v3/__tests__/reducer.test.ts src/model-builder-v3/__tests__/componentFactory.test.ts
```

Result: passed, 5 test files / 26 tests.

```powershell
npm --prefix frontend run test -- --run src/components/__tests__/ModelBuilder.test.tsx src/model-builder-v3/__tests__/adapter.test.ts src/model-builder-v3/__tests__/compile.test.ts src/model-builder-v3/__tests__/reducer.test.ts src/model-builder-v3/__tests__/componentFactory.test.ts src/model/__tests__/htmlReport.test.ts src/model/__tests__/reportArtifacts.test.ts
```

Result: passed, 7 test files / 32 tests.

Additional backend validation should still be run before public release:

```bash
cd backend
python -m pytest -q
python -m compileall -q ivfitter
```
