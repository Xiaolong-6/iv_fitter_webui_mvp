# Model Builder V2 audit-fix notes — 2026-06-01

## Scope

This patch addresses the agent audit findings after the V2 blank-screen hotfix.

## Code fixes

- `SchematicCanvas.tsx` now imports `ReactFlow` as a named export from `@xyflow/react`.
- Removed the unused `addEdge` import and the corresponding `void addEdge` statement.
- `ModelBuilder.tsx` now passes `registry`, `previewContent`, `canvasActions`, and `onGoToFitting` into V2 instead of silently discarding them.
- `SchematicBuilderV2.tsx` now displays a scope banner explaining which parent workflow functions are native to V2 and which remain external/legacy.
- V2 toolbar can show canvas actions and a Go to Fit action when supplied by the parent workflow.
- V2 CSS adds explicit visibility/container safeguards for the workflow page and keeps the stylesheet free of `!important`.

## Test coverage added

- Added `frontend/src/model-builder-v2/__tests__/graphCompile.test.ts`.
- Coverage now checks `schematic_v2` GraphSpec output, preservation of the source schematic, expression metadata preservation, empty-draft compile behavior, and `applySchematicGraphToModel` round-trip behavior.

## Documentation governance

- Moved V2 architecture/acceptance/migration/audit/hotfix docs to `docs/model-builder-v2/`.
- Moved historical release/hotfix reports to `docs/history/`.
- Moved superseded V1 Model Builder graph/CSS iteration reports to `docs/archive/`.
- Updated `docs/DOCUMENTATION_INDEX.md` links.
- Rewrote `docs/ARCHITECTURE.md` to include Model Builder V2, `SchematicGraph`, and `schematic_v2`.
- Rewrote `docs/ROADMAP.md` and `docs/WEBUI_AGENT_HANDOFF.md` so they no longer describe V1 as the current model-builder baseline.

## Blank-screen follow-up

A no-console blank screen can still be caused by browser/container CSS sizing rather than a thrown JavaScript exception. This patch keeps V2 mounted in a visible, isolated shell and preserves a toolbar-level path back to the legacy builder. If a blank page still appears, inspect the DOM for `.mbv2-shell` and `.mbv2-canvas`; if they are present with zero height, the next fix should target parent workflow sizing rather than React Flow logic.
