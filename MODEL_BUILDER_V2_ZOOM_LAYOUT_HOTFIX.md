# Model Builder V2 Zoom/Layout Hotfix

Date: 2026-06-01

## Problem

At high application zoom levels such as 200%, Model Builder V2 rendered as a vertically oversized document page. The schematic canvas did not consistently consume the available viewport height, the equation preview could push the page below the fold, and React Flow did not refit when the application zoom changed the canvas size.

## Fix

- Converted the V2 shell from `min-height: calc(100vh - 42px)` to a contained `height: 100%` grid.
- Made the model workflow page and V2 wrapper height-contained instead of allowing the page to grow indefinitely.
- Changed the V2 main column to use a real `minmax(0, 1fr)` canvas row.
- Added responsive grid collapse rules for narrower/high-zoom layouts.
- Added `--mbv2-scale` so V2 controls scale consistently with the application zoom without exploding past a safe maximum.
- Capped the compatibility equation preview height so it scrolls internally and does not push the canvas off screen.
- Added a React Flow `ResizeObserver`-driven `fitView` refresh so the schematic refits after app zoom/container resize.

## Acceptance

- At 100% app zoom, V2 uses the available workspace width and height.
- At 200% app zoom, V2 remains contained inside the workspace rather than becoming a long page.
- Canvas, palette, inspector, validation panel, and preview scroll internally as needed.
- React Flow refits when the V2 canvas is resized by the app zoom control.
- No `final-overrides.css` is reintroduced.
- No `!important` is added to V2 CSS.
