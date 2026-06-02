# Model Builder V2 blank-screen hotfix

## Problem

The first isolated V2 package could open to a blank/empty frontend area on some local runs. The likely failure modes were:

1. `SchematicBuilderV2` published its graph into parent app state immediately on mount, which could trigger a parent-model reset before the user interacted with the page.
2. The React Flow canvas parent used `min-height` only. React Flow expects a measurable parent height; percentage-height children can collapse when only minimum height is available in nested grid layouts.

## Fix

- `SchematicBuilderV2` no longer calls `onChange()` on its initial mount. It only publishes graph changes after the user changes the graph.
- `.mbv2-canvas` now has an explicit viewport-based height plus minimum height.
- `.mbv2-canvas .react-flow` explicitly owns `width: 100%` and `height: 100%`.

## Acceptance

- Opening the model page should render the V2 shell, palette, canvas, terminals, and inspector instead of a blank model area.
- Legacy builder remains available through the V2 toolbar switch.
- V2 still remains isolated from legacy model-builder CSS.
