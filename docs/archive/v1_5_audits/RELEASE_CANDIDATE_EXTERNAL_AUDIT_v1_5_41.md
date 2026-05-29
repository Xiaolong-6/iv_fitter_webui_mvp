# Release-candidate external audit — v1.5.41

## Scope

This audit reviews the v1.5.41 hotfix after the v1.5.40 chart-control regression report. The change is intentionally frontend/UI-only: chart toolbar icon sizing and chart SVG selector scoping. It does not change fitting physics, backend APIs, report schemas, saved-model compatibility, release checking, or the Manual reader model.

## External-agent finding

The v1.5.40 implementation made chart controls icon-based, but nested toolbar SVG icons inherited broad `.simple-chart svg` sizing rules. This caused the control icons to expand to chart-sized dimensions, making the toolbar visually dominant and reducing the plot area.

## Fix assessment

- Main chart SVG sizing is now scoped to `.simple-chart > svg`, preventing nested toolbar icons from inheriting plot sizing.
- Chart control SVGs have explicit 16 px sizing.
- Toolbar buttons have fixed compact dimensions and remain large enough for pointer/touch use without overwhelming the chart.
- The repeated visible `Wheel zoom` label has been removed; the same guidance remains as a tooltip on the control group.

## Release-candidate status

Acceptable for manual browser review. This is a focused hotfix and should be reviewed specifically in Data plot preview and Fitting plot workspace at 100%, 125%, and 150% zoom.

## Manual checks required before final release

1. Data page plot preview: controls remain compact above one or two plots.
2. Fitting page Linear I-V + signed residual view: two plots render when fitted residual data exists.
3. Fitting page All diagnostic plots: four plots render and controls do not dominate the grid.
4. Wheel zoom and Shift+Wheel zoom still work on the main chart SVG.
5. Plot/Parameters height splitter still works.

## Known limitations

No screenshot-regression or Playwright coverage exists yet, so browser visual inspection remains required.
