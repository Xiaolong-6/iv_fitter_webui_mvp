# Tested current — v1.6.0

Validated after chart interaction overhaul and responsive layout fix.

## Scope

- SimpleChart rewritten: ResizeObserver reads real container dimensions; SVG uses actual width/height with fixed viewBox.
- Chart toolbar stripped of zoom X/Y in/out and pan left/right buttons; only Reset button remains.
- Image-viewer-style interactions: wheel zoom at cursor (both axes), Ctrl+wheel X-only zoom, Shift+wheel Y-only zoom, left-drag pan, double-click reset.
- Mouse cursor: crosshair default, grabbing during drag.
- CSS: `.simple-chart` set to `height: 100%; min-height: 0`; SVG to `width: 100%; height: 100%`; removed all `max-height` constraints on `.simple-chart > svg` in fitting-page, report-manual, and base-shell CSS.
- PlotWorkspace and DataImportWorkspace: removed fixed `height` prop from SimpleChart calls; charts now fill their grid cells via CSS.
- New Vitest test file `SimpleChart.test.tsx` covering: render, toolbar buttons, wheel/drag/double-click interactions, series rendering.

## Plot interaction reference

| Action | Effect |
|---|---|
| Wheel (no modifier) | Zoom both X and Y at cursor position |
| Ctrl + Wheel | Zoom X axis only at cursor position |
| Shift + Wheel | Zoom Y axis only at cursor position |
| Left-drag | Pan the current view |
| Double-click | Reset to base view |
| Reset button | Reset to base view |
| Hover nearest point | Tooltip with label, x, y values |
| Clipped badge click | Toggle clipped-points info |

## Commands run in this environment

```bash
cd frontend
npx tsc --noEmit
npx vitest run --reporter=verbose
npm run build
```

## Observed result

- TypeScript type check: passed (no errors).
- Frontend unit tests: passed, 10 files / 40 tests (including 7 new SimpleChart tests).
- Frontend production build: passed.

## Not verified in this environment

- Backend pytest (backend not modified, unchanged from v1.5.43).
- Full release packaging (`release_build.ps1`, `build_portable_windows.ps1`).
- Portable smoke test.
- `npm ci` (lockfile timeout with internal mirror, same as prior version).
- Manual browser checks (see below).

## Manual browser checks required

1. Fitting page: charts should fill available space vertically, not be capped at 26vh.
2. Paired plot view: both charts should resize together when window is resized.
3. Wheel zoom: scroll should zoom at cursor position; verify Ctrl and Shift modifiers.
4. Drag pan: left-click drag should pan the view smoothly.
5. Double-click and Reset button should both restore the original view.
6. Cursor should show crosshair on chart, grabbing during drag.
7. Hover tooltip should still show nearest point data.
8. Clipped badge should still be clickable and show info.
9. Data page: Linear I-V and Log |I| charts should fill their containers.
10. App zoom 55–100%, browser zoom 100–160%, low-height landscape.
